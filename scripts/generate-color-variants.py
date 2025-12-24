"""
Generate color variants of the clown spritesheet.
Replaces white body (#FFFFFF) with different colors.

Usage: python generate-color-variants.py
"""

from pathlib import Path
from PIL import Image
import numpy as np

CHAR_DIR = Path(__file__).parent.parent / "public/assets/characters"
SOURCE_FILE = CHAR_DIR / "clown-spritesheet.png"

# Color variants (name, hex, RGB tuple)
# Body colors - replacing white (#FFFFFF)
COLOR_VARIANTS = {
    "white": (255, 255, 255),      # Default - no change needed
    "garnet": (128, 0, 32),        # Dark red/burgundy - distinct from red nose
    "blue": (100, 149, 237),       # Cornflower blue
    "pink": (255, 182, 193),       # Light pink
    "green": (144, 238, 144),      # Light green
    "yellow": (255, 255, 150),     # Soft yellow
    "purple": (186, 135, 206),     # Soft purple
    "orange": (255, 200, 100),     # Soft orange
}

def replace_white_with_color(img, target_color):
    """Replace white/grayscale pixels with target color, preserving shading.

    This handles both the bright white body AND the anti-aliased gray edge pixels
    that transition from white to the black outline.
    """
    img = img.convert("RGBA")
    data = np.array(img, dtype=np.float32)

    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    # Find grayscale pixels (R, G, B are similar to each other)
    # This catches both bright white AND the gray anti-aliased edges
    is_grayscale = (np.abs(r - g) < 40) & (np.abs(g - b) < 40) & (np.abs(r - b) < 40)

    # Exclude very dark pixels (the black outline) and transparent pixels
    # The outline is typically < 50 brightness
    avg_brightness = (r + g + b) / 3
    is_not_black = avg_brightness > 60
    is_visible = a > 0

    # Also exclude the red nose area - red has high R, low G/B
    is_not_red = ~((r > 150) & (g < 100) & (b < 100))

    # Mask for pixels to recolor (white body + gray edges, not outline or nose)
    recolor_mask = is_grayscale & is_not_black & is_visible & is_not_red

    # Calculate brightness/luminance of original pixels (0-1 scale)
    luminance = avg_brightness / 255.0

    # Apply target color with original luminance preserved
    target_r, target_g, target_b = target_color

    # For body/edge pixels, tint them with the target color
    # Preserve the luminance variation for shading and anti-aliasing
    new_r = np.where(recolor_mask, luminance * target_r, r)
    new_g = np.where(recolor_mask, luminance * target_g, g)
    new_b = np.where(recolor_mask, luminance * target_b, b)

    # Clamp values
    new_r = np.clip(new_r, 0, 255)
    new_g = np.clip(new_g, 0, 255)
    new_b = np.clip(new_b, 0, 255)

    # Reconstruct image
    result = np.stack([new_r, new_g, new_b, a], axis=2).astype(np.uint8)
    return Image.fromarray(result)

def generate_variants():
    print(f"Loading source: {SOURCE_FILE}")

    if not SOURCE_FILE.exists():
        print(f"Error: Source file not found: {SOURCE_FILE}")
        return

    source_img = Image.open(SOURCE_FILE)
    print(f"Source size: {source_img.width}x{source_img.height}")

    for color_name, color_rgb in COLOR_VARIANTS.items():
        output_file = CHAR_DIR / f"clown-{color_name}.png"

        if color_name == "white":
            # Just copy the original for white
            source_img.save(output_file)
            print(f"  {color_name}: copied original -> {output_file.name}")
        else:
            # Generate color variant
            variant = replace_white_with_color(source_img, color_rgb)
            variant.save(output_file)
            print(f"  {color_name}: {color_rgb} -> {output_file.name}")

    print(f"\nGenerated {len(COLOR_VARIANTS)} color variants!")

if __name__ == "__main__":
    generate_variants()
