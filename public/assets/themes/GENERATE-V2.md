# Theme Generation V2 - Unified Background Approach

Instead of separate layers, generate ONE complete scene like classic Club Penguin.

---

## LOBBY CONTEXT PROMPT (send first)

```
I'm creating a game background inspired by classic Club Penguin (2005-2010 era). I need a single unified illustration of a snowy town square.

STYLE REFERENCE:
- Classic Club Penguin town center aesthetic
- 2D illustrated style with soft colors and clean shapes
- Slight fisheye/curved perspective (edges curve inward)
- Snow banks frame the walkable area creating a "bowl" or "stage" effect
- Buildings are INTEGRATED into the snowy landscape, not floating
- Warm, cozy, inviting winter village feel

I'll describe the exact scene I need. The output should be a complete background at 800x600 pixels.
```

---

## COMPLETE TOWN SQUARE BACKGROUND (800x600)

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

> Save as: `default/lobby/background-full.png`

---

## INFO STAND PROP (100x120, transparent bg)

This is the only separate sprite we need - the info stand that sits in the center-front of the walkable area.

```
Club Penguin style info kiosk/booth, front view.

- Green booth/stand with a penguin mascot character on top (optional - or just a question mark)
- Notice board with papers/flyers pinned to it
- "INFO" or "?" sign
- Small and cute, sits in a town square
- Transparent background
- Style matches classic Club Penguin 2005-2010

This will be placed in the foreground of the scene, so draw it as if viewed straight-on.
```

> Save as: `default/lobby/prop-info-stand.png`

---

## ALTERNATIVE: THREE-PART APPROACH

If one unified image is hard to generate consistently, try this:

### Background Base (800x600)
```
Club Penguin style snowy town square background, 800x600.

- Deep blue sky gradient at top
- Large snow-covered ground area
- Snow banks framing the edges (left, right, and partial bottom corners)
- Creates a "bowl" or "stage" effect for the walkable area
- Evergreen pine trees with snow peeking from behind snow banks on edges
- Central area is open snowy ground with subtle blue shadows
- Optional: small ice patches or brick path

Do NOT include any buildings - leave THREE gaps/spaces where buildings will go:
- Left side gap (behind snow bank)
- Center gap (largest, main focal point)
- Right side gap (behind snow bank)

Style: Classic Club Penguin 2005-2010 era
```

### Individual Buildings (generate to fit the gaps)

Each building should have snow on roof and look like it sits BEHIND a snow bank:

**Coffee Shop (150x200)**
```
Club Penguin style coffee shop building, front view.
- Brown/warm wood exterior
- "COFFEE" vertical sign on left side
- Warm glowing yellow windows
- Heavy snow on roof, icicles
- Striped awning over door (optional)
- Bottom of building fades/blends as if behind a snow bank
- Transparent background
- Classic Club Penguin 2005-2010 style
```

**Record Store (180x220)**
```
Club Penguin style record/music store, front view.
- Teal/turquoise colored building (main color)
- "RECORDS" sign on top or side
- Display window showing vinyl records
- Musical notes decoration
- Heavy snow on roof
- Larger building - this is the center focal point
- Bottom fades as if behind snow bank
- Transparent background
- Classic Club Penguin 2005-2010 style
```

**Arcade (150x200)**
```
Club Penguin style arcade entrance, front view.
- Purple/pink/magenta colored building
- "ARCADE" sign with slight neon glow
- Pixel art or joystick decorations
- Inviting lit doorway
- Snow on roof
- Fun, gaming vibe
- Bottom fades as if behind snow bank
- Transparent background
- Classic Club Penguin 2005-2010 style
```

---

## Tips for Club Penguin Style

1. **Colors**: Soft, slightly muted pastels. Not too saturated.
2. **Outlines**: Subtle or no harsh black outlines. Colors define shapes.
3. **Snow**: Pristine white with light blue shadows. Rounded, fluffy shapes.
4. **Perspective**: Slight fisheye curve. Buildings lean slightly inward.
5. **Warmth**: Despite being snowy, it feels cozy and inviting, not cold.
6. **Simplicity**: Clean shapes, not overly detailed. Readable at small sizes.

---

## Code Changes Needed

If using the unified background approach, update the theme loader to just load one background image instead of separate layers. The code would be much simpler:

```typescript
// Just load one background
scene.load.image('lobby-background', '/assets/themes/default/lobby/background-full.png');

// In create():
this.add.image(400, 300, 'lobby-background');
```
