# Theme Generation V3 - Arcade Room (Unified Background)

Generate ONE complete arcade room scene with everything included. Click hitboxes will be placed over the cabinets in code.

---

## ARCADE CONTEXT PROMPT (send first)

```
I'm creating a game room background inspired by classic Club Penguin (2005-2010 era) mixed with retro 80s/90s arcade aesthetics. I need a single unified illustration of an arcade hangout room.

STYLE REFERENCE:
- Classic Club Penguin art style (2D, flat illustration, soft shapes)
- Retro arcade/gaming den atmosphere
- Dark purple/blue walls with neon pink and cyan accents
- Cozy hangout space vibe
- Warm inviting glow despite the dark color scheme

COLOR PALETTE:
- Background: Dark purple (#1a1a2e), deep blue (#16213e)
- Neon accents: Hot pink (#ff00ff), Cyan (#00ffff)
- Warm accents: Orange glow, yellow highlights
- Floor: Dark checkered or arcade carpet pattern

I'll describe the exact scene I need. The output should be a complete background at 800x600 pixels with all elements included.
```

---

## COMPLETE ARCADE ROOM (800x600)

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

> Save as: `default/arcade/background.png`

---

## CLICK HITBOX POSITIONS

After generating the background, these are the approximate positions for invisible click areas (in 800x600 coordinates):

| Element | X | Y | Width | Height | Action |
|---------|---|---|-------|--------|--------|
| Caption Contest | 150 | 180 | 100 | 140 | launch-game: caption-contest |
| Board Rush | 300 | 180 | 100 | 140 | launch-game: board-game |
| About You | 500 | 180 | 100 | 140 | under-construction |
| Newly Webs | 650 | 180 | 100 | 140 | under-construction |
| Exit Door | 80 | 450 | 70 | 120 | zone-change: lobby |

These positions match what's already defined in `clown-club/world/ZoneConfig.js`.

---

## ALTERNATIVE: SIMPLER PROMPT

If the detailed prompt is too complex, try this shorter version:

```
Club Penguin style arcade room interior, 800x600 pixels.

Dark purple room with neon pink and cyan lighting. Four retro arcade cabinets in a row across the top (pink, blue, green, orange trim). Glowing "GAME ROOM" neon sign above them. Exit door on the left with EXIT sign. Bean bag chairs and lava lamps scattered around. Dark checkered floor. Cozy gaming hangout vibe.

Style: 2D flat illustration, Club Penguin 2005-2010 aesthetic, soft friendly shapes.
```

---

## TIPS FOR BEST RESULTS

1. **Generate at 2x size** (1600x1200) then scale down for crisp edges
2. **Emphasize "Club Penguin style"** - AI tends to make things too realistic otherwise
3. **Neon glow is key** - the pink/cyan lighting makes it feel like an arcade
4. **Cozy not scary** - dark but warm and inviting
5. **Cabinets should be visible** - they're the main interactive elements

---

## FUTURE: INDIVIDUAL SPRITES

If you want to generate individual cabinet sprites later for more control:

```
public/assets/themes/default/arcade/
├── background.png         ← Start with this (unified)
│
│   (Future separate sprites with #00FF00 green bg):
├── cabinet-caption.png    (100x140)
├── cabinet-board.png      (100x140)
├── cabinet-about.png      (100x140)
├── cabinet-newlywebs.png  (100x140)
├── prop-lava-lamp.png     (50x100)
└── prop-bean-bag.png      (80x60)
```

For now, just generate `background.png` with everything included!
