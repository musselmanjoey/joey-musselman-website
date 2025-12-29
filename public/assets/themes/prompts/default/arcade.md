# Arcade Prompts - Default Theme

> **Style Context:** See `_context/arcade-neon.md`
> **Ingest command:** `python scripts/ingest-image.py {file} --theme default --zone arcade`

---

## arcade-background.png (800x600)

Complete arcade room scene with all elements integrated. Click hitboxes are placed over cabinets in code.

**Prompt:**
```
Create a Club Penguin-style arcade room interior, 800x600 pixels. This is ONE complete illustration with all elements included.

THE ROOM:
- Interior of a cozy retro arcade/gaming room
- Dark purple walls (#1a1a2e)
- Neon light strips along ceiling glowing pink and cyan
- Dark checkered floor (purple tones)
- Ambient purple/pink mood lighting

HEADER (top center):
- Glowing neon sign reading "GAME ROOM" or "ARCADE"
- Pink neon tubes with cyan underglow
- Centered at the top of the scene

ARCADE CABINETS (row across upper-middle area, left to right):
1. LEFT CABINET (x ~150): Pink/magenta trim, camera icon on screen, "CAPTION CONTEST" label
2. CENTER-LEFT CABINET (x ~300): Cyan/blue trim, dice icon on screen, "BOARD RUSH" label
3. CENTER-RIGHT CABINET (x ~500): Green/yellow trim, thought bubble on screen, "ABOUT YOU" label
4. RIGHT CABINET (x ~650): Orange/red trim, spider web on screen, "NEWLY WEBS" label

All cabinets should be:
- Classic upright arcade cabinet shape
- Dark body with colored neon trim
- Glowing screens
- Roughly evenly spaced across the room

EXIT DOOR (left side, x ~80):
- Door on the left wall
- Glowing "EXIT" sign above it
- Door slightly ajar showing warm light from lobby

PROPS scattered around:
- 1-2 lava lamps (purple/pink glow) on the floor
- 2-3 bean bag chairs (purple or teal) scattered for seating
- Maybe a small stats/leaderboard panel on the right wall

THE FLOOR:
- Open walking area in the center and lower portion
- Dark checkered pattern or arcade carpet texture
- Players will walk around here

IMPORTANT:
- Everything is PART of one illustration, not separate layers
- Club Penguin 2005-2010 art style (soft, friendly, not photorealistic)
- Cozy and inviting despite being dark
- Neon glow creates warm atmosphere
- Leave the center-bottom area relatively open for player movement

Do NOT include: any characters, penguins, people, or UI elements.
```

**Generation Notes:**
- Generate at 1600x1200, scale down for crisp edges
- Emphasize "Club Penguin style" - AI tends to make things too realistic
- Neon glow is key - makes it feel like an arcade

**Hitbox Positions:**
| Element | X | Y | Width | Height | Action |
|---------|---|---|-------|--------|--------|
| Caption Contest | 150 | 180 | 100 | 140 | launch-game: caption-contest |
| Board Rush | 300 | 180 | 100 | 140 | launch-game: board-game |
| About You | 500 | 180 | 100 | 140 | launch-game: about-you |
| Newly Webs | 650 | 180 | 100 | 140 | under-construction |
| Exit Door | 80 | 450 | 70 | 120 | zone-change: lobby |

---

## Alternative: Simpler Prompt

If the detailed prompt is too complex:

```
Club Penguin style arcade room interior, 800x600 pixels.

Dark purple room with neon pink and cyan lighting. Four retro arcade cabinets in a row across the top (pink, blue, green, orange trim). Glowing "GAME ROOM" neon sign above them. Exit door on the left with EXIT sign. Bean bag chairs and lava lamps scattered around. Dark checkered floor. Cozy gaming hangout vibe.

Style: 2D flat illustration, Club Penguin 2005-2010 aesthetic, soft friendly shapes.
```

---

## Future: Individual Cabinet Sprites

If you need separate cabinet sprites for more control:

### cabinet-caption.png (80x120)
```
2D game art, flat illustration style, retro arcade aesthetic, neon accents

Arcade cabinet machine, front view, dark cabinet with pink/purple trim, screen showing camera icon, "CAPTION CONTEST" label, joystick and buttons visible, retro gaming machine, solid #00FF00 green background
```

### cabinet-board.png (80x120)
```
Arcade cabinet machine, front view, dark cabinet with blue/cyan trim, screen showing dice icon, "BOARD RUSH" label, joystick and buttons visible, retro gaming machine, solid #00FF00 green background
```

### cabinet-about.png (80x120)
```
Arcade cabinet machine, front view, dark cabinet with green/yellow trim, screen showing thought bubble icon, "ABOUT YOU" label, joystick and buttons visible, personality quiz game vibes, solid #00FF00 green background
```

### cabinet-newlywebs.png (80x120)
```
Arcade cabinet machine, front view, dark cabinet with orange/red trim, screen showing spider web icon, "NEWLY WEBS" label, joystick and buttons visible, web/connections game vibes, solid #00FF00 green background
```
