"""
Simple background removal script using rembg.

Install: pip install rembg pillow
Usage: python remove-background.py <input_image> [output_image]
"""

import sys
from pathlib import Path

try:
    from rembg import remove
    from PIL import Image
except ImportError:
    print("Missing dependencies. Install with:")
    print("  pip install rembg pillow")
    sys.exit(1)


def remove_background(input_path: str, output_path: str = None):
    input_file = Path(input_path)

    if not input_file.exists():
        print(f"Error: File not found: {input_path}")
        sys.exit(1)

    # Default output: same name with '-nobg' suffix
    if output_path is None:
        output_path = input_file.parent / f"{input_file.stem}-nobg.png"

    print(f"Processing: {input_path}")

    # Load and remove background
    with Image.open(input_path) as img:
        output = remove(img)
        output.save(output_path, "PNG")

    print(f"Saved: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove-background.py <input_image> [output_image]")
        print("Example: python remove-background.py lobby-info2.png info-stand.png")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    remove_background(input_file, output_file)
