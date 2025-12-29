# Theme Generation V4 - Record Store (Unified Background)

Generate ONE complete record store scene. Click hitboxes will be placed over the interactive elements in code.

**Reference:** Club Penguin Night Club - same room proportions and cartoon style, but vinyl shop theme instead of dance club.

---

## RECORD STORE CONTEXT PROMPT (send first)

```
I'm creating a record store interior background in the EXACT style of Club Penguin rooms (2005-2010 era). Look at how Club Penguin's Night Club or Coffee Shop rooms are drawn - that's the style I need.

KEY STYLE ELEMENTS FROM CLUB PENGUIN:
- 2D flat illustration, very cartoonish and soft
- Rooms feel WIDE - you see left wall, back wall, and right wall
- Floor takes up 60%+ of the image (large walkable area)
- Furniture/objects are pushed to the edges and back wall
- Ceiling area is minimal - most detail is at eye level and below
- Soft rounded shapes, no hard edges
- Bold simple colors, not overly detailed textures

COLOR PALETTE:
- Walls: Dark purple (#1a1a2e), deep blue-gray (#2d2d44)
- Floor: Warm wood brown (#8b4513) - large wooden floor area
- Accents: Teal (#4ecdc4), orange/amber lighting, subtle pink neon
- Vinyl records: Colorful spines (red, teal, yellow, pink)

The output should be 800x600 pixels with Club Penguin's signature wide-room feel.
```

---

## COMPLETE RECORD STORE (800x600)

```
Create a Club Penguin-style record store interior, 800x600 pixels.

IMPORTANT - CLUB PENGUIN ROOM PROPORTIONS:
- The FLOOR takes up the bottom 60% of the image (y ~240 to y ~600)
- Objects/furniture line the BACK WALL and SIDES
- The room feels WIDE - you can see left wall, back wall, right wall
- Ceiling is minimal - just enough to show the top of the room
- Large open walking space in the center

LAYOUT (back wall, left to right):

LEFT SIDE (x ~50-180):
- Tall vinyl record shelves against the back-left wall
- 3 shelf tiers with colorful record spines showing
- Teal/cyan glow illuminating the shelves
- Exit doorway at floor level with green "EXIT" sign above

CENTER (x ~300-500):
- DJ BOOTH is the FOCAL POINT (like the DJ booth in CP Night Club)
- Elevated platform or counter with dual turntables
- Black vinyl records on turntables with red center labels
- Mixer console between them
- Warm orange/amber spotlight from above
- "NOW SPINNING" or music note sign above
- This is where players will gather

RIGHT SIDE (x ~600-750):
- Cork bulletin board on the back-right wall
- Pinned review notes (cream, pink, blue papers)
- Red pushpins
- "REVIEWS" label
- Maybe a vintage speaker or jukebox nearby

FLOOR (bottom 60% of image):
- LARGE wooden plank floor - warm brown tones
- This is the main walking area
- Floor planks run horizontally
- Open space for characters to move around
- Maybe a small rug near the DJ booth

WALLS:
- Dark purple/blue walls
- Some exposed brick texture on back wall
- Subtle mood lighting (not too bright)
- Maybe 1-2 album posters on side walls
- String lights or vintage light fixtures

CEILING (top ~15% only):
- Simple dark ceiling
- Hanging lights or fixtures
- Keep it minimal like Club Penguin rooms

STYLE REQUIREMENTS:
- MUST look like a Club Penguin room (soft, cartoonish, friendly)
- Wide panoramic room feel
- Objects at the edges, open floor in middle
- Warm cozy vibe despite dark colors
- Simple shapes, not photorealistic

Do NOT include: any characters, penguins, people, or UI elements.
```

> Save as: `default/records/records-background.png`

---

## VISUAL REFERENCE COMPARISON

```
Club Penguin Night Club layout:
┌─────────────────────────────────────────────┐
│  [speaker]    [DJ BOOTH]      [speaker]     │  <- Back wall (~25%)
│     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        │
│                                             │
│                                             │
│            (open dance floor)               │  <- Floor area (~60%)
│                                             │
│                                             │
│  door                              door     │
└─────────────────────────────────────────────┘

Record Store layout (same proportions):
┌─────────────────────────────────────────────┐
│ [vinyl    ]   [DJ BOOTH]     [review ]      │  <- Back wall (~25%)
│ [shelves  ]   [turntables]   [board  ]      │
│  EXIT↓        ░░░░░░░░░░                    │
│                                             │
│            (open wood floor)                │  <- Floor area (~60%)
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## CLICK HITBOX POSITIONS

| Element | X | Y | Width | Height | Action |
|---------|---|---|-------|--------|--------|
| Exit Door | 92 | 340 | 60 | 40 | zone-change: lobby |
| Vinyl Browser | 100 | 280 | 200 | 200 | browse-vinyl |
| DJ Booth | 550 | 320 | 160 | 120 | playback-controls |
| Review Board | 680 | 350 | 100 | 140 | view-reviews |

**Note:** These positions may need adjusting after you generate the art. Enable `DEBUG_COORDINATES = true` in RecordStoreScene.ts to click and find exact positions.

---

## ALTERNATIVE: SIMPLER PROMPT

```
Club Penguin style record store room, 800x600 pixels.

Same proportions as Club Penguin's Night Club: wide room view with floor taking up 60% of image, objects along back wall.

Back wall (left to right): vinyl record shelves with exit door below, DJ booth with turntables in center (main focal point with warm spotlight), cork review board on right.

Large wooden plank floor for walking. Dark purple walls, cozy mood lighting. Cartoonish Club Penguin art style - soft shapes, friendly vibe.
```

---

## TIPS

1. **Floor dominates** - If the floor isn't taking up most of the image, it won't feel like Club Penguin
2. **DJ booth centered** - It's the star of the room, like in the Night Club
3. **Push furniture back** - Everything lines the walls, leaving floor open
4. **Soft and round** - No sharp edges, very cartoonish
5. **Wide room feel** - You should see both side walls

---

## FILE STRUCTURE

```
public/assets/themes/default/records/
└── records-background.png    <- Generate this (unified, 800x600)
```
