#!/usr/bin/env python3
"""
Remove Gemini watermark (star in bottom-right corner) from generated images.

Usage:
    python scripts/remove-watermark.py input.png output.png
    python scripts/remove-watermark.py input.png  # overwrites input

Options:
    --size 40      Size of corner area to fix (default: 40px)
    --method crop  Method: 'crop' (shrink image) or 'fill' (blend with surroundings)
"""

import sys
from pathlib import Path

try:
    from PIL import Image, ImageFilter, ImageDraw
except ImportError:
    print("PIL not found. Install with: pip install Pillow")
    sys.exit(1)


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
    """Remove watermark by cloning from adjacent area (best quality)."""
    width, height = img.size
    img = img.copy()

    # Clone from area well ABOVE the watermark (not diagonally adjacent)
    # This avoids accidentally copying part of the watermark
    source_region = img.crop((
        width - size,           # Same x position as watermark
        height - size * 3,      # But much higher up (3x the size away)
        width,
        height - size * 2
    ))

    # Paste it over the watermark area
    img.paste(source_region, (width - size, height - size))

    return img


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Remove Gemini watermark from images')
    parser.add_argument('input', help='Input image path')
    parser.add_argument('output', nargs='?', help='Output image path (default: overwrite input)')
    parser.add_argument('--size', type=int, default=60, help='Corner size to fix (default: 60)')
    parser.add_argument('--method', choices=['crop', 'fill', 'clone'], default='crop',
                        help='Removal method (default: crop)')

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

    if args.method == 'crop':
        result = remove_watermark_crop(img, args.size)
    elif args.method == 'fill':
        result = remove_watermark_fill(img, args.size)
    else:  # clone
        result = remove_watermark_clone(img, args.size)

    print(f"Saving: {output_path}")
    result.save(output_path, quality=95)
    print("Done!")


if __name__ == '__main__':
    main()
