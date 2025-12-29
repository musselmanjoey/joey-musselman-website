# Lobby Prompts - Default Theme (Snowy Town)

> **Style Context:** See `_context/club-penguin-style.md`
> **Ingest command:** `python scripts/ingest-image.py {file} --theme default --zone lobby`

---

## background-full.png (800x600)

The main unified lobby background with all elements integrated.

**Prompt:**
```
Create a Club Penguin-style town square background illustration, 800x600 pixels.

THE SCENE (from left to right):
- LEFT: A cozy brown coffee shop building with "COFFEE" or "CAFE" sign, warm glowing windows, snow on the roof. Building sits behind a snow bank.
- CENTER: A teal/green record store building with "RECORDS" sign, larger than the other buildings, vinyl record decorations, snow-covered roof. This is the main focal point.
- RIGHT: A purple/pink arcade entrance with "ARCADE" sign, neon accents, joystick decorations, inviting doorway. Building sits behind a snow bank.

THE GROUND:
- Large open snowy area in the foreground center (this is where players walk)
- The snow is pristine white with subtle blue shadows
- Optional: small ice patches or brick/stone path through the center

THE FRAMING:
- Snow banks curve around the edges, framing the walkable area
- Creates depth like a "bowl" or amphitheater shape
- Trees (evergreen pines with snow) peek from behind the snow banks on far left and right edges

THE SKY:
- Deep blue gradient sky at the top, darker at top, lighter near buildings
- A few fluffy white clouds
- Keep it simple, the focus is the town

IMPORTANT:
- Buildings should look like they're PART of the landscape, not pasted on top
- Snow piles naturally against and around the buildings
- Slight curved/fisheye perspective makes it feel cozy and contained
- Leave the center-front area clear for players to walk around
- Style should match classic Club Penguin (2005-2010 era)

Do NOT include: any characters, penguins, people, or UI elements.
```

**Generation Notes:**
- Generate at 1600x1200, scale down to 800x600 for crisp edges
- Emphasize "Club Penguin style" - AI tends to make things too realistic

**Hitbox Positions:**
| Element | X | Y | Width | Height | Action |
|---------|---|---|-------|--------|--------|
| Cafe | 80 | 280 | 120 | 180 | under-construction |
| Record Store | 400 | 260 | 140 | 200 | zone-change: records |
| Arcade | 700 | 280 | 120 | 180 | zone-change: games |
| Info Stand | 400 | 460 | 60 | 80 | info |

---

## prop-info-stand.png (100x120)

Standalone info kiosk that sits in the center-front of the walkable area.

**Prompt:**
```
Club Penguin style info kiosk/booth, front view, 100x120 pixels.

- Green booth/stand with a question mark on top
- Notice board with papers/flyers pinned to it
- "INFO" or "?" sign
- Small and cute, sits in a town square
- Solid #00FF00 green background (for transparency removal)
- Style matches classic Club Penguin 2005-2010

This will be placed in the foreground of the scene, so draw it as if viewed straight-on.
```

**Generation Notes:**
- Use green background (#00FF00) for easy removal
- After ingest, run remove-background.py if needed

---

## Alternative: Layered Approach

If unified background is hard to generate consistently, generate these separately:

### sky.png (800x400)
```
2D game art, flat illustration style, soft pastel colors, Club Penguin aesthetic

Winter sky background, soft gradient from pale powder blue at top to slightly warmer blue at horizon, fluffy white clouds scattered across, gentle golden sunlight from upper right creating warm glow, peaceful atmosphere, no ground visible
```

### horizon.png (800x200)
```
2D game art, flat illustration style, soft pastel colors, Club Penguin aesthetic

Distant snowy mountain range, rolling white hills with subtle blue shadows, evergreen pine trees dotting the hillsides, soft morning mist at base, peaceful winter landscape
```

### ground.png (800x300)
```
2D game art, flat illustration style, soft pastel colors, Club Penguin aesthetic

Top-down angled view of snowy town square, pristine white snow with gentle blue shadows, cobblestone or brick path through center, snow banks around edges, inviting plaza for walking
```
