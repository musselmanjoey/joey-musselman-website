# Sprite Generation Guide

How to generate and process game sprites using AI image generation (Gemini) and local tools.

## Key Learnings

1. **Gemini cannot generate transparent PNGs** - Always request solid color backgrounds
2. **Unified backgrounds > layered sprites** - Single scene images are easier to generate and align
3. **Use debug coordinate mode** - Click-to-show-coordinates saves iteration time
4. **Local tools for post-processing** - rembg for background removal, Sharp for resizing

## Workflow

### Step 1: Generate with Solid Background

Always request a solid bright green (`#00FF00`) or magenta (`#FF00FF`) background for easy removal.

### Step 2: Remove Background

```bash
# Install once
pip install rembg pillow

# Remove background
python scripts/remove-background.py input.png output.png
```

### Step 3: Resize if Needed

```bash
# Using Node.js + Sharp (already installed)
node -e "
const sharp = require('sharp');
sharp('input.png')
  .resize(WIDTH, HEIGHT, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toFile('output.png')
  .then(() => console.log('Done'));
"
```

### Step 4: Position in Game

Enable debug mode in `LobbyScene.ts`:
```typescript
private static readonly DEBUG_MODE = true;
```

Click in game to see coordinates, then update `ZoneConfig.js` or `theme-config.json`.

---

## Prompt Templates

### Scene Backgrounds (Unified)

```
Create a pixel art [SCENE_NAME] background for a 2D video game.

Size: 800x600 pixels
Style: [STYLE - e.g., "Club Penguin inspired", "circus/carnival themed"]
Scene: [DESCRIPTION - e.g., "A snowy town square with three buildings - a coffee shop on the left, a record store in the center, and an arcade on the right"]
Mood: [MOOD - e.g., "cheerful winter day", "spooky night"]

Include: [SPECIFIC ELEMENTS]
The image should be a complete scene with no UI elements.
```

### Props/Objects

```
Create a pixel art [OBJECT_NAME] sprite for a 2D video game.

Size: [WIDTH]x[HEIGHT] pixels
Style: [STYLE - e.g., "colorful cartoon pixel art, circus/carnival aesthetic"]
Design: [DESCRIPTION]
Colors: [COLOR PALETTE]

**IMPORTANT: Place the sprite on a solid bright green (#00FF00) background for easy background removal.**
```

### Character Spritesheets

```
Create a pixel art character spritesheet for a [CHARACTER_TYPE] walking animation.

Layout: 4 rows x 4 columns (16 frames total)
- Row 1: Walking DOWN (4 frames)
- Row 2: Walking LEFT (4 frames)
- Row 3: Walking RIGHT (4 frames)
- Row 4: Walking UP (4 frames)

Frame size: 64x64 pixels each
Total image: 256x256 pixels

Character: [DESCRIPTION - e.g., "circus clown with red nose, colorful polka dot outfit, big shoes"]
Style: [STYLE - e.g., "cute pixel art, similar to Club Penguin characters"]

**IMPORTANT: Place the entire spritesheet on a solid bright green (#00FF00) background for easy background removal.**
```

### Arcade Cabinet

```
Create a pixel art arcade cabinet sprite for a 2D video game.

Size: 80x120 pixels
Style: Retro arcade cabinet, colorful with screen glow effect
Theme: [GAME_THEME - e.g., "photography/camera theme for a caption contest game"]
Details: Include a small screen area, joystick, buttons, and decorative elements

**IMPORTANT: Place on a solid bright green (#00FF00) background.**
```

---

## File Locations

| Type | Location |
|------|----------|
| Lobby backgrounds | `public/assets/themes/default/lobby/` |
| Arcade backgrounds | `public/assets/themes/default/arcade/` |
| Character sprites | `public/assets/characters/` |
| Props | `public/assets/themes/default/lobby/` or `arcade/` |
| Generation prompts | `public/assets/themes/GENERATE.md`, `GENERATE-V2.md` |

## Tools

| Tool | Purpose | Location |
|------|---------|----------|
| remove-background.py | Remove solid color backgrounds | `scripts/remove-background.py` |
| screenshot-lobby.ts | Automated Playwright screenshots | `scripts/screenshot-lobby.ts` |
| Debug coordinate mode | Click-to-show-coordinates | `LobbyScene.ts` DEBUG_MODE flag |

## Theme Configuration

Backgrounds and props are configured in `public/assets/themes/theme-config.json`:

```json
{
  "activeTheme": "default",
  "themes": {
    "default": {
      "name": "Snowy Town",
      "lobby": {
        "mode": "unified",
        "background": "default/lobby/background-full.png",
        "props": [
          { "sprite": "default/lobby/prop-name.png", "x": 400, "y": 300 }
        ],
        "effects": { "snowfall": true }
      }
    }
  }
}
```

Interactive objects (doors, etc.) are in `clown-club/world/ZoneConfig.js`.
