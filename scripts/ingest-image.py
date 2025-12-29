#!/usr/bin/env python3
"""
Image Ingestion Pipeline for Clown Club Assets

Processes AI-generated images through:
1. Archive original (with watermark) to _originals/
2. Remove Gemini watermark → _processed/
3. Optional: Remove background (green screen or AI-based)
4. Optional resize → final destination
5. Update manifest with metadata

Usage:
    # Single file
    python ingest-image.py lobby-background.png --theme default --zone lobby

    # Batch mode
    python ingest-image.py *.png --theme default --zone arcade

    # Watch mode (monitors incoming/ folder)
    python ingest-image.py --watch

    # With resize
    python ingest-image.py bg.png --theme default --zone lobby --resize 800x600

    # Sprite with green background removal
    python ingest-image.py sprite.png --theme default --zone lobby --green-bg

    # Sprite with AI background removal (any background)
    python ingest-image.py sprite.png --theme default --zone lobby --remove-bg

Future (Phase 2):
    python ingest-image.py crown.png --type cosmetic --slot head --id crown
"""

import argparse
import json
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

# Add scripts dir to path for local imports
SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))

try:
    from PIL import Image
except ImportError:
    print("PIL not found. Install with: pip install Pillow")
    sys.exit(1)

# Import watermark removal from existing script
try:
    from remove_watermark import remove_watermark_lama, remove_watermark_inpaint, HAS_LAMA
except ImportError:
    # Fallback if module import fails
    HAS_LAMA = False
    def remove_watermark_lama(img, size=60):
        print("Warning: LaMa not available, using basic method")
        return remove_watermark_inpaint(img, size)

    def remove_watermark_inpaint(img, size=60):
        # Basic fallback - just return image
        print("Warning: No watermark removal available")
        return img

# Optional: rembg for AI-based background removal
try:
    from rembg import remove as rembg_remove
    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False

# Optional: numpy for green screen removal
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

# Project paths
PROJECT_ROOT = SCRIPTS_DIR.parent
THEMES_DIR = PROJECT_ROOT / "public/assets/themes"
INCOMING_DIR = THEMES_DIR / "incoming"
ORIGINALS_DIR = THEMES_DIR / "_originals"
PROCESSED_DIR = THEMES_DIR / "_processed"

# Asset types (extensible for Phase 2: cosmetics)
ASSET_TYPES = {
    "theme": {
        "originals_base": ORIGINALS_DIR,
        "processed_base": PROCESSED_DIR,
        "final_base": THEMES_DIR,
        "path_template": "{theme}/{zone}",
    },
    # Phase 2: cosmetics
    # "cosmetic": {
    #     "originals_base": PROJECT_ROOT / "public/assets/cosmetics/_originals",
    #     "processed_base": PROJECT_ROOT / "public/assets/cosmetics/_processed",
    #     "final_base": PROJECT_ROOT / "public/assets/cosmetics",
    #     "path_template": "{slot}/{id}",
    # },
}


def get_timestamp():
    """Get current timestamp for file naming."""
    return datetime.now().strftime("%Y-%m-%d_%H%M%S")


def load_manifest(manifest_path: Path) -> dict:
    """Load or create manifest file."""
    if manifest_path.exists():
        with open(manifest_path) as f:
            return json.load(f)
    return {"assets": {}, "lastUpdated": None}


def save_manifest(manifest_path: Path, manifest: dict):
    """Save manifest file."""
    manifest["lastUpdated"] = datetime.now().isoformat()
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)


def remove_watermark(img: Image.Image, size: int = 60) -> Image.Image:
    """Remove Gemini watermark using best available method."""
    if HAS_LAMA:
        return remove_watermark_lama(img, size)
    else:
        return remove_watermark_inpaint(img, size)


def resize_image(img: Image.Image, size_str: str) -> Image.Image:
    """Resize image to target dimensions (WxH format)."""
    width, height = map(int, size_str.lower().split("x"))
    return img.resize((width, height), Image.Resampling.LANCZOS)


def remove_green_background(img: Image.Image) -> Image.Image:
    """Remove green background (#00FF00 or similar) and make transparent.

    Tuned for Gemini's green/yellow-green backgrounds.
    Based on build-spritesheet.py implementation.
    """
    if not HAS_NUMPY:
        print("Warning: numpy not available, cannot remove green background")
        return img

    img = img.convert("RGBA")
    data = np.array(img, dtype=np.float32)

    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    # Detect green-ish background: green is highest channel, blue is low
    # This catches both pure green AND yellow-green backgrounds
    is_green_dominant = (g > r) & (g > b) & (b < 100)

    # Background pixels are bright and green-dominant
    is_background = is_green_dominant & (g > 150)

    # For edge detection, calculate how "green" each pixel is
    green_ratio = np.where(g > 0, g / (r + b + 1), 0)

    # Soft edges: pixels that are somewhat green get partial transparency
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


def remove_background_ai(img: Image.Image) -> Image.Image:
    """Remove background using rembg (AI-based, works on any background)."""
    if not HAS_REMBG:
        print("Warning: rembg not available. Install with: pip install rembg")
        return img

    # rembg works best with RGBA
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    return rembg_remove(img)


def process_image(
    input_path: Path,
    asset_type: str = "theme",
    theme: str = None,
    zone: str = None,
    output_name: str = None,
    resize: str = None,
    watermark_size: int = 60,
    skip_watermark: bool = False,
    green_bg: bool = False,
    remove_bg: bool = False,
    prompt: str = None,
    notes: str = None,
    # Phase 2 params (ignored for now)
    slot: str = None,
    cosmetic_id: str = None,
) -> dict:
    """
    Process a single image through the ingestion pipeline.

    Returns dict with processing results.
    """
    if asset_type not in ASSET_TYPES:
        raise ValueError(f"Unknown asset type: {asset_type}. Available: {list(ASSET_TYPES.keys())}")

    config = ASSET_TYPES[asset_type]

    # Build paths based on asset type
    if asset_type == "theme":
        if not theme or not zone:
            raise ValueError("--theme and --zone required for theme assets")
        sub_path = config["path_template"].format(theme=theme, zone=zone)
    # Phase 2: cosmetics
    # elif asset_type == "cosmetic":
    #     if not slot or not cosmetic_id:
    #         raise ValueError("--slot and --id required for cosmetic assets")
    #     sub_path = config["path_template"].format(slot=slot, id=cosmetic_id)

    originals_dir = config["originals_base"] / sub_path
    processed_dir = config["processed_base"] / sub_path
    final_dir = config["final_base"] / sub_path

    # Ensure directories exist
    originals_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)
    final_dir.mkdir(parents=True, exist_ok=True)

    # Determine output filename
    if output_name:
        final_name = output_name if output_name.endswith(".png") else f"{output_name}.png"
    else:
        final_name = input_path.name

    base_name = Path(final_name).stem
    timestamp = get_timestamp()

    # Step 1: Copy original to _originals with timestamp
    original_name = f"{base_name}_{timestamp}.png"
    original_path = originals_dir / original_name
    shutil.copy2(input_path, original_path)
    print(f"  [1/3] Archived original: {original_path.relative_to(THEMES_DIR)}")

    # Step 2: Load and process image
    img = Image.open(input_path)
    original_size = f"{img.width}x{img.height}"

    if img.mode != "RGB":
        img = img.convert("RGB")

    # Count total steps for progress display
    total_steps = 3
    if green_bg or remove_bg:
        total_steps = 4
    step = 2

    # Remove watermark
    if not skip_watermark:
        print(f"  [{step}/{total_steps}] Removing watermark...")
        img = remove_watermark(img, watermark_size)
    else:
        print(f"  [{step}/{total_steps}] Skipping watermark removal")
    step += 1

    # Remove background if requested
    bg_removed = False
    if green_bg:
        print(f"  [{step}/{total_steps}] Removing green background...")
        img = remove_green_background(img)
        bg_removed = True
        step += 1
    elif remove_bg:
        print(f"  [{step}/{total_steps}] Removing background (AI)...")
        img = remove_background_ai(img)
        bg_removed = True
        step += 1

    # Save to _processed
    processed_path = processed_dir / final_name
    if bg_removed or (img.mode == "RGBA"):
        img.save(processed_path)  # PNG for transparency
    else:
        img.save(processed_path, quality=95)
    print(f"        Saved processed: {processed_path.relative_to(THEMES_DIR)}")

    # Final step: Resize if requested and save to final location
    if resize:
        img = resize_image(img, resize)
        print(f"  [{step}/{total_steps}] Resized to {resize}")

    final_path = final_dir / final_name
    if bg_removed or (img.mode == "RGBA"):
        img.save(final_path)  # PNG for transparency
    else:
        img.save(final_path, quality=95)
    final_size = f"{img.width}x{img.height}"
    print(f"        Saved final: {final_path.relative_to(THEMES_DIR)}")

    # Step 4: Update manifest
    manifest_path = originals_dir / "manifest.json"
    manifest = load_manifest(manifest_path)

    manifest["assets"][final_name] = {
        "original": original_name,
        "processed": str(processed_path.relative_to(config["processed_base"])),
        "final": str(final_path.relative_to(config["final_base"])),
        "dimensions": {
            "original": original_size,
            "final": final_size,
        },
        "generated": datetime.now().isoformat(),
        "watermarkRemoved": not skip_watermark,
        "backgroundRemoved": "green" if green_bg else ("ai" if remove_bg else None),
        "prompt": prompt,
        "notes": notes,
    }

    save_manifest(manifest_path, manifest)
    print(f"        Updated manifest")

    return {
        "success": True,
        "original": str(original_path),
        "processed": str(processed_path),
        "final": str(final_path),
    }


def watch_incoming(
    theme: str = "default",
    zone: str = None,
    resize: str = None,
    poll_interval: float = 2.0,
):
    """
    Watch the incoming/ folder for new images and process them.

    Zone is inferred from filename pattern: {zone}-{name}.png
    Or can be set explicitly with --zone flag.
    """
    print(f"\nWatching {INCOMING_DIR} for new images...")
    print(f"Default theme: {theme}")
    print(f"Default zone: {zone or '(inferred from filename)'}")
    print(f"Resize: {resize or '(none)'}")
    print("\nDrop files like: lobby-background.png, arcade-cabinet.png")
    print("Or with explicit zone: just name the file and use --zone\n")
    print("Press Ctrl+C to stop.\n")

    processed_files = set()

    # Load already-processed files
    if INCOMING_DIR.exists():
        for f in INCOMING_DIR.glob("*.png"):
            processed_files.add(f.name)

    INCOMING_DIR.mkdir(parents=True, exist_ok=True)

    try:
        while True:
            for img_path in INCOMING_DIR.glob("*.png"):
                if img_path.name in processed_files:
                    continue

                print(f"\n{'='*50}")
                print(f"New file: {img_path.name}")

                # Infer zone from filename if not set
                inferred_zone = zone
                output_name = img_path.stem

                if not inferred_zone:
                    # Try to parse zone from filename: {zone}-{rest}.png
                    parts = img_path.stem.split("-", 1)
                    if len(parts) == 2 and parts[0] in ["lobby", "arcade", "records"]:
                        inferred_zone = parts[0]
                        output_name = parts[1]
                        print(f"Inferred zone: {inferred_zone}")
                    else:
                        print(f"Could not infer zone from filename.")
                        print(f"Rename to {{zone}}-{{name}}.png or restart with --zone")
                        processed_files.add(img_path.name)
                        continue

                try:
                    result = process_image(
                        input_path=img_path,
                        asset_type="theme",
                        theme=theme,
                        zone=inferred_zone,
                        output_name=output_name,
                        resize=resize,
                    )

                    if result["success"]:
                        # Move processed file to avoid reprocessing
                        done_dir = INCOMING_DIR / "_done"
                        done_dir.mkdir(exist_ok=True)
                        shutil.move(str(img_path), str(done_dir / img_path.name))
                        print(f"Moved to incoming/_done/")

                except Exception as e:
                    print(f"Error processing {img_path.name}: {e}")

                processed_files.add(img_path.name)

            time.sleep(poll_interval)

    except KeyboardInterrupt:
        print("\n\nStopped watching.")


def main():
    parser = argparse.ArgumentParser(
        description="Ingest AI-generated images into the asset pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process single file
  python ingest-image.py background.png --theme default --zone lobby

  # With resize
  python ingest-image.py bg.png --theme default --zone lobby --resize 800x600

  # Watch mode (monitors incoming/ folder)
  python ingest-image.py --watch --theme default

  # Batch process
  python ingest-image.py *.png --theme default --zone arcade
        """
    )

    parser.add_argument("files", nargs="*", help="Image file(s) to process")
    parser.add_argument("--watch", action="store_true", help="Watch incoming/ folder")
    parser.add_argument("--theme", default="default", help="Theme name (default: default)")
    parser.add_argument("--zone", help="Zone name (lobby, arcade, records)")
    parser.add_argument("--type", dest="asset_type", default="theme",
                        choices=list(ASSET_TYPES.keys()), help="Asset type")
    parser.add_argument("--resize", help="Resize to WxH (e.g., 800x600)")
    parser.add_argument("--name", dest="output_name", help="Output filename (without extension)")
    parser.add_argument("--watermark-size", type=int, default=60,
                        help="Watermark detection area size (default: 60)")
    parser.add_argument("--skip-watermark", action="store_true",
                        help="Skip watermark removal")
    parser.add_argument("--green-bg", action="store_true",
                        help="Remove green background (#00FF00) - for sprites")
    parser.add_argument("--remove-bg", action="store_true",
                        help="Remove background using AI (rembg) - works on any background")
    parser.add_argument("--prompt", help="Generation prompt (stored in manifest)")
    parser.add_argument("--notes", help="Notes about this generation")

    # Phase 2: cosmetic options (hidden for now)
    # parser.add_argument("--slot", help="Cosmetic slot (head, face, held, effect)")
    # parser.add_argument("--id", dest="cosmetic_id", help="Cosmetic ID")

    args = parser.parse_args()

    if args.watch:
        watch_incoming(
            theme=args.theme,
            zone=args.zone,
            resize=args.resize,
        )
        return

    if not args.files:
        parser.print_help()
        print("\nError: No files specified. Use --watch or provide file paths.")
        sys.exit(1)

    # Process each file
    for file_path in args.files:
        path = Path(file_path)
        if not path.exists():
            print(f"Warning: File not found: {path}")
            continue

        if not path.suffix.lower() in [".png", ".jpg", ".jpeg", ".webp"]:
            print(f"Warning: Skipping non-image file: {path}")
            continue

        print(f"\nProcessing: {path.name}")

        try:
            result = process_image(
                input_path=path,
                asset_type=args.asset_type,
                theme=args.theme,
                zone=args.zone,
                output_name=args.output_name,
                resize=args.resize,
                watermark_size=args.watermark_size,
                skip_watermark=args.skip_watermark,
                green_bg=args.green_bg,
                remove_bg=args.remove_bg,
                prompt=args.prompt,
                notes=args.notes,
            )

            if result["success"]:
                print(f"  Done!")

        except Exception as e:
            print(f"  Error: {e}")
            if "--debug" in sys.argv:
                import traceback
                traceback.print_exc()


if __name__ == "__main__":
    main()
