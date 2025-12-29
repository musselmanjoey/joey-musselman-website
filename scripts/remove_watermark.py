#!/usr/bin/env python3
"""
Remove Gemini watermark (star in bottom-right corner) from generated images.

Usage:
    python scripts/remove-watermark.py input.png output.png
    python scripts/remove-watermark.py input.png  # overwrites input

Options:
    --size 60      Size of corner area to fix (default: 60px)
    --method inpaint  Method: 'inpaint' (content-aware fill), 'crop', 'fill', 'clone'
"""

import sys
from pathlib import Path

try:
    from PIL import Image, ImageFilter, ImageDraw
except ImportError:
    print("PIL not found. Install with: pip install Pillow")
    sys.exit(1)

# Optional: OpenCV for better inpainting
try:
    import cv2
    import numpy as np
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

# Optional: LaMa for best quality inpainting
try:
    from simple_lama_inpainting import SimpleLama
    HAS_LAMA = True
except ImportError:
    HAS_LAMA = False


def remove_watermark_crop(img: Image.Image, margin: int = 40) -> Image.Image:
    """Remove watermark by cropping and scaling back up."""
    width, height = img.size
    # Crop off the bottom-right corner
    cropped = img.crop((0, 0, width - margin, height - margin))
    # Scale back to original size
    return cropped.resize((width, height), Image.Resampling.LANCZOS)


def remove_watermark_fill(img: Image.Image, size: int = 40) -> Image.Image:
    """Remove watermark by filling corner with nearby pixels."""
    width, height = img.size
    img = img.copy()

    # Sample colors from just outside the watermark area
    sample_x = width - size - 10
    sample_y = height - size - 10

    # Get average color from the area just above/left of the watermark
    sample_region = img.crop((
        width - size - 20,
        height - size - 20,
        width - size,
        height - size
    ))

    # Calculate average color
    pixels = list(sample_region.getdata())
    avg_r = sum(p[0] for p in pixels) // len(pixels)
    avg_g = sum(p[1] for p in pixels) // len(pixels)
    avg_b = sum(p[2] for p in pixels) // len(pixels)
    avg_color = (avg_r, avg_g, avg_b)

    # Create a gradient fill for the corner
    draw = ImageDraw.Draw(img)

    # Fill the corner with blended color
    for y in range(height - size, height):
        for x in range(width - size, width):
            # Calculate distance from the corner boundary
            dx = x - (width - size)
            dy = y - (height - size)

            # Blend factor (0 at edge, 1 at corner)
            blend = min(1.0, (dx + dy) / (size * 1.5))

            # Get original pixel
            orig = img.getpixel((x, y))

            # Blend with average color
            new_r = int(orig[0] * (1 - blend) + avg_color[0] * blend)
            new_g = int(orig[1] * (1 - blend) + avg_color[1] * blend)
            new_b = int(orig[2] * (1 - blend) + avg_color[2] * blend)

            img.putpixel((x, y), (new_r, new_g, new_b))

    return img


def remove_watermark_clone(img: Image.Image, size: int = 40) -> Image.Image:
    """Remove watermark by cloning from adjacent area with blending."""
    width, height = img.size
    img = img.copy()

    # Clone from area to the LEFT of the watermark (same y level for texture match)
    # This gives better texture continuity than copying from above
    source_region = img.crop((
        width - size * 3,       # Further left
        height - size,          # Same y level as watermark
        width - size * 2,       # End before watermark area
        height
    ))

    # Create a gradient mask for smooth blending
    mask = Image.new('L', (size, size), 0)
    for y in range(size):
        for x in range(size):
            # Gradient from left edge (full opacity) to right edge (fade)
            alpha = int(255 * (1 - x / size) ** 0.5)  # Smoother falloff
            mask.putpixel((x, y), alpha)

    # Paste with blending mask
    img.paste(source_region, (width - size, height - size), mask)

    return img


def detect_gemini_watermark(img_cv, search_region_size=100):
    """Detect the Gemini 4-pointed star watermark in the bottom-right corner.

    Returns the center (x, y) and approximate size of the watermark, or None if not found.
    """
    height, width = img_cv.shape[:2]

    # Only search in the bottom-right corner region
    roi_x = max(0, width - search_region_size)
    roi_y = max(0, height - search_region_size)
    roi = img_cv[roi_y:height, roi_x:width]

    # Convert to grayscale
    if len(roi.shape) == 3:
        roi_gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    else:
        roi_gray = roi

    # The Gemini star is lighter than its surroundings
    # Find the brightest region that forms a star-like shape

    # Apply slight blur to reduce noise
    roi_blurred = cv2.GaussianBlur(roi_gray, (3, 3), 0)

    # Find edges - the star has distinctive 4-pointed edges
    edges = cv2.Canny(roi_blurred, 30, 100)

    # Dilate to connect edge fragments
    kernel = np.ones((3, 3), np.uint8)
    edges_dilated = cv2.dilate(edges, kernel, iterations=2)

    # Find contours
    contours, _ = cv2.findContours(edges_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Look for a contour that could be the star (roughly diamond-shaped, appropriate size)
    best_match = None
    best_score = 0

    for contour in contours:
        area = cv2.contourArea(contour)
        if 100 < area < 3000:  # Star is roughly 20-50px, so area 400-2500
            # Get bounding rectangle
            x, y, w, h = cv2.boundingRect(contour)

            # Star should be roughly square-ish (diamond shape)
            aspect_ratio = w / h if h > 0 else 0
            if 0.5 < aspect_ratio < 2.0:
                # Prefer contours closer to the corner
                corner_dist = (search_region_size - x - w/2) + (search_region_size - y - h/2)
                score = area / (corner_dist + 1)

                if score > best_score:
                    best_score = score
                    # Return center in full image coordinates
                    center_x = roi_x + x + w // 2
                    center_y = roi_y + y + h // 2
                    best_match = (center_x, center_y, max(w, h))

    return best_match


def remove_watermark_lama(img: Image.Image, size: int = 60) -> Image.Image:
    """Remove watermark using LaMa inpainting (best quality).

    LaMa (Large Mask Inpainting) provides significantly better results than
    OpenCV inpainting, especially for textured areas like wood grain.

    Automatically detects the Gemini star watermark location.
    """
    if not HAS_LAMA:
        print("LaMa not found. Install with: pip install simple-lama-inpainting")
        print("Falling back to OpenCV inpainting...")
        return remove_watermark_inpaint(img, size)

    width, height = img.size

    # Try to detect the watermark location
    if HAS_OPENCV:
        img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        detection = detect_gemini_watermark(img_cv)

        if detection:
            center_x, center_y, detected_size = detection
            print(f"Detected watermark at ({center_x}, {center_y}), size ~{detected_size}px")
            # Use detected location with some padding
            mask_size = max(size, detected_size + 20)
        else:
            print("Auto-detection failed, using corner position...")
            center_x = width - size // 2
            center_y = height - size // 2
            mask_size = size
    else:
        center_x = width - size // 2
        center_y = height - size // 2
        mask_size = size

    # Create mask centered on the detected/assumed watermark location
    mask = Image.new('L', (width, height), 0)
    from PIL import ImageDraw
    draw = ImageDraw.Draw(mask)

    # Draw a circle/ellipse around the watermark (better than rectangle for star shape)
    half_size = mask_size // 2 + 5
    draw.ellipse([
        (center_x - half_size, center_y - half_size),
        (center_x + half_size, center_y + half_size)
    ], fill=255)

    # Initialize LaMa model
    print("Loading LaMa model (first run downloads ~200MB)...")
    simple_lama = SimpleLama()

    # Run inpainting
    result = simple_lama(img, mask)

    return result


def remove_watermark_inpaint(img: Image.Image, size: int = 60) -> Image.Image:
    """Remove watermark using OpenCV inpainting (content-aware fill).

    Uses a triangular mask in the bottom-right corner to target the Gemini star,
    which appears within ~40px of the corner.
    """
    if not HAS_OPENCV:
        print("OpenCV not found. Install with: pip install opencv-python")
        print("Falling back to clone method...")
        return remove_watermark_clone(img, size)

    width, height = img.size

    # Convert PIL to OpenCV format
    img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    # Create mask for the bottom-right corner
    # Use a triangular shape that covers the corner where the star appears
    mask = np.zeros((height, width), dtype=np.uint8)

    # Triangle points: bottom-right corner area
    # The star is typically within 40-50px of the corner
    corner_size = size
    pts = np.array([
        [width, height],                          # bottom-right corner
        [width - corner_size, height],            # left along bottom
        [width, height - corner_size],            # up along right edge
    ], dtype=np.int32)

    cv2.fillPoly(mask, [pts], 255)

    # Use TELEA inpainting with moderate radius
    result = cv2.inpaint(img_cv, mask, inpaintRadius=5, flags=cv2.INPAINT_TELEA)

    # Convert back to PIL
    result_rgb = cv2.cvtColor(result, cv2.COLOR_BGR2RGB)
    return Image.fromarray(result_rgb)


def remove_watermark_debug(img: Image.Image, size: int = 60) -> Image.Image:
    """Debug mode - shows the mask overlaid on the image in red."""
    if not HAS_OPENCV:
        print("OpenCV not found for debug mode")
        return img

    width, height = img.size
    img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    # Create the same triangular mask
    mask = np.zeros((height, width), dtype=np.uint8)
    corner_size = size
    pts = np.array([
        [width, height],
        [width - corner_size, height],
        [width, height - corner_size],
    ], dtype=np.int32)
    cv2.fillPoly(mask, [pts], 255)

    # Overlay mask in red on the image
    result = img_cv.copy()
    result[mask == 255] = [0, 0, 255]  # Red in BGR

    result_rgb = cv2.cvtColor(result, cv2.COLOR_BGR2RGB)
    return Image.fromarray(result_rgb)


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Remove Gemini watermark from images')
    parser.add_argument('input', help='Input image path')
    parser.add_argument('output', nargs='?', help='Output image path (default: overwrite input)')
    parser.add_argument('--size', type=int, default=60, help='Corner size to fix (default: 60)')
    parser.add_argument('--method', choices=['lama', 'inpaint', 'crop', 'fill', 'clone', 'debug'], default='lama',
                        help='Removal method (default: lama)')

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output) if args.output else input_path

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    print(f"Loading: {input_path}")
    img = Image.open(input_path)

    # Convert to RGB if necessary
    if img.mode != 'RGB':
        img = img.convert('RGB')

    print(f"Removing watermark using '{args.method}' method (size: {args.size}px)...")

    if args.method == 'lama':
        result = remove_watermark_lama(img, args.size)
    elif args.method == 'inpaint':
        result = remove_watermark_inpaint(img, args.size)
    elif args.method == 'crop':
        result = remove_watermark_crop(img, args.size)
    elif args.method == 'fill':
        result = remove_watermark_fill(img, args.size)
    elif args.method == 'debug':
        result = remove_watermark_debug(img, args.size)
    else:  # clone
        result = remove_watermark_clone(img, args.size)

    print(f"Saving: {output_path}")
    result.save(output_path, quality=95)
    print("Done!")


if __name__ == '__main__':
    main()
