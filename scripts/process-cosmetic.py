#!/usr/bin/env python3
"""
Process cosmetic images: remove watermark, remove green background, and resize.
Usage: python process-cosmetic.py <input.png> [--size 64]
"""

import sys
import os
from pathlib import Path
from PIL import Image
import numpy as np

# Import watermark removal from existing script
SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))

try:
    from remove_watermark import remove_watermark_lama, HAS_LAMA
except ImportError:
    HAS_LAMA = False
    def remove_watermark_lama(img, size=60):
        print("  Warning: LaMa not available for watermark removal")
        return img

def remove_green_background(img, tolerance=30):
    """Remove green background, replacing with transparency.

    Handles both pure #00FF00 and Gemini's lime green (~141, 206, 74).
    Auto-detects background color from corner pixel.
    """
    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    data = np.array(img)

    # Sample corner to detect actual background color
    bg_color = data[5, 5, :3]
    print(f"  Detected background color: RGB({bg_color[0]}, {bg_color[1]}, {bg_color[2]})")

    # Create mask for pixels close to background color
    diff = np.abs(data[:, :, :3].astype(int) - bg_color.astype(int))
    bg_mask = np.all(diff < tolerance, axis=2)

    # Set background pixels to transparent
    data[bg_mask] = [0, 0, 0, 0]

    return Image.fromarray(data)


def crop_to_content(img):
    """Crop image to non-transparent content."""
    # Get bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def resize_to_fit(img, max_size):
    """Resize image to fit within max_size while maintaining aspect ratio."""
    width, height = img.size

    # Calculate scale to fit
    scale = min(max_size / width, max_size / height)

    if scale < 1:
        new_width = int(width * scale)
        new_height = int(height * scale)
        return img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    return img


def process_cosmetic(input_path, output_path=None, size=64, skip_watermark=False):
    """Process a cosmetic image."""
    if output_path is None:
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}-clean{ext}"

    print(f"Processing: {input_path}")

    # Load image
    img = Image.open(input_path)
    print(f"  Original size: {img.size}")

    # Remove watermark first (before background removal)
    if not skip_watermark:
        if HAS_LAMA:
            print("  Removing watermark (LaMa)...")
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img = remove_watermark_lama(img, size=60)
        else:
            print("  Skipping watermark removal (LaMa not available)")

    # Remove green background
    img = remove_green_background(img)
    print(f"  Removed green background")

    # Crop to content
    img = crop_to_content(img)
    print(f"  Cropped to content: {img.size}")

    # Resize to target size
    img = resize_to_fit(img, size)
    print(f"  Resized to: {img.size}")

    # Save
    img.save(output_path, 'PNG')
    print(f"  Saved: {output_path}")

    return output_path


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python process-cosmetic.py <input.png> [--size 64]")
        sys.exit(1)

    input_path = sys.argv[1]
    size = 64

    # Parse --size argument
    if '--size' in sys.argv:
        idx = sys.argv.index('--size')
        if idx + 1 < len(sys.argv):
            size = int(sys.argv[idx + 1])

    process_cosmetic(input_path, size=size)
