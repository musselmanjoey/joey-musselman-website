"""
Build clown spritesheet from individual frames.
Removes green background, creates flips, assembles 3x4 grid.

Usage: python build-spritesheet.py
"""

from pathlib import Path
from PIL import Image
import numpy as np

CHAR_DIR = Path(__file__).parent.parent / "public/assets/characters"
OUTPUT_FILE = CHAR_DIR / "clown-spritesheet.png"

# Frame size - use larger size to preserve quality
FRAME_SIZE = 256

# Source files (6 unique frames)
FRAMES = {
    "front-idle": CHAR_DIR / "clown-front-idle.png",
    "front-walk": CHAR_DIR / "clown-front-walk.png",
    "side-idle": CHAR_DIR / "clown-side-idle.png",
    "side-walk": CHAR_DIR / "clown-side-walk-rf.png",  # using the rf file
    "back-idle": CHAR_DIR / "clown-back.png",
    "back-walk": CHAR_DIR / "clown-back-walk.png",
}

def remove_green_background(img):
    """Remove green background and make transparent with clean edges.

    Handles yellow-green backgrounds like (166, 217, 36) from Gemini.
    """
    img = img.convert("RGBA")
    data = np.array(img, dtype=np.float32)

    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    # Detect green-ish background: green is highest channel, blue is low
    # This catches both pure green AND yellow-green backgrounds
    is_green_dominant = (g > r) & (g > b) & (b < 100)

    # Background pixels are bright and green-dominant
    is_background = is_green_dominant & (g > 150)

    # For edge detection, calculate how "green" each pixel is
    # Higher ratio = more background-like
    green_ratio = np.where(g > 0, g / (r + b + 1), 0)

    # Soft edges: pixels that are somewhat green get partial transparency
    # This handles anti-aliased edges smoothly
    edge_greenness = np.clip((green_ratio - 0.8) / 0.7, 0, 1)

    # Combine: definite background = 0 alpha, edges = partial alpha
    alpha_factor = np.where(is_background, 0, 1 - edge_greenness * 0.8)

    # Also catch any pixel where green significantly exceeds other channels
    strong_green = (g > 180) & (g > r + 30) & (g > b + 100)
    alpha_factor = np.where(strong_green, 0, alpha_factor)

    # Apply alpha
    new_alpha = (alpha_factor * 255).astype(np.uint8)

    # For semi-transparent edge pixels, reduce green tint (defringe)
    edge_mask = (new_alpha > 0) & (new_alpha < 240)
    if np.any(edge_mask):
        # Reduce green channel on edges to remove green fringe
        g_adjusted = np.where(edge_mask, np.minimum(g, (r + b) / 2 * 1.2), g)
        data[:,:,1] = g_adjusted

    # Rebuild image with new alpha
    result = np.stack([
        data[:,:,0].astype(np.uint8),
        data[:,:,1].astype(np.uint8),
        data[:,:,2].astype(np.uint8),
        new_alpha
    ], axis=2)

    return Image.fromarray(result)

def resize_frame(img, size=FRAME_SIZE):
    """Resize image to target frame size, maintaining aspect ratio and centering."""
    img.thumbnail((size, size), Image.Resampling.LANCZOS)

    # Create new image with padding
    new_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # Center the resized image
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    new_img.paste(img, (x, y), img)

    return new_img

def flip_horizontal(img):
    """Flip image horizontally."""
    return img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

def build_spritesheet():
    print("Building clown spritesheet...")

    # Load and process all frames
    processed = {}
    for name, path in FRAMES.items():
        if not path.exists():
            print(f"Warning: Missing file {path}")
            continue

        print(f"Processing {name}...")
        img = Image.open(path)
        img = remove_green_background(img)
        img = resize_frame(img)
        processed[name] = img

        # Save individual cleaned frame for reference
        clean_path = CHAR_DIR / f"clown-{name}-clean.png"
        img.save(clean_path)
        print(f"  Saved: {clean_path.name}")

    # Create flipped versions
    print("\nCreating flipped versions...")
    processed["front-walk-flip"] = flip_horizontal(processed["front-walk"])
    processed["side-idle-flip"] = flip_horizontal(processed["side-idle"])
    processed["side-walk-flip"] = flip_horizontal(processed["side-walk"])
    processed["back-walk-flip"] = flip_horizontal(processed["back-walk"])

    # Build 3x4 spritesheet (192x256)
    # Layout:
    # Row 1 (FRONT): front-idle | front-walk | front-walk-flip
    # Row 2 (RIGHT): side-idle  | side-walk  | side-idle
    # Row 3 (LEFT):  side-idle-flip | side-walk-flip | side-idle-flip
    # Row 4 (BACK):  back-idle  | back-walk  | back-walk-flip

    layout = [
        ["front-idle", "front-walk", "front-walk-flip"],
        ["side-idle", "side-walk", "side-idle"],
        ["side-idle-flip", "side-walk-flip", "side-idle-flip"],
        ["back-idle", "back-walk", "back-walk-flip"],
    ]

    cols, rows = 3, 4
    sheet = Image.new("RGBA", (cols * FRAME_SIZE, rows * FRAME_SIZE), (0, 0, 0, 0))

    print("\nAssembling spritesheet...")
    for row_idx, row in enumerate(layout):
        for col_idx, frame_name in enumerate(row):
            if frame_name in processed:
                x = col_idx * FRAME_SIZE
                y = row_idx * FRAME_SIZE
                sheet.paste(processed[frame_name], (x, y), processed[frame_name])
                print(f"  [{row_idx},{col_idx}] = {frame_name}")
            else:
                print(f"  [{row_idx},{col_idx}] = MISSING: {frame_name}")

    # Save spritesheet
    sheet.save(OUTPUT_FILE)
    print(f"\nSpritesheet saved: {OUTPUT_FILE}")
    print(f"Size: {sheet.width}x{sheet.height} ({cols}x{rows} grid, {FRAME_SIZE}px frames)")

if __name__ == "__main__":
    build_spritesheet()
