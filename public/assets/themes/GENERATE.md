# Image Generation Checklist

Use **one chat session per area** (1 for Lobby, 1 for Arcade) for style consistency.

**How to use:** Copy ONLY the text inside each code block. The dimensions shown are your TARGET size after resizing.

---

## LOBBY CONTEXT PROMPT (send this first)

```
I'm creating game assets for a Club Penguin-style virtual world. I need you to generate a series of 2D game art images that all share a consistent visual style.

THE STYLE:
- 2D flat illustration, like Club Penguin or Webkinz
- Soft pastel colors with a cozy winter village theme
- Clean vector-like shapes with NO outlines
- Warm, inviting, and playful atmosphere

THE SCENE:
A snowy town square with three buildings (a cafe, a record store, and an arcade entrance), some benches, trees, lamp posts, and an info stand. Players walk around this area.

I'll be asking you to generate each element separately so I can layer them in my game engine. Please maintain the EXACT same art style, color palette, and level of detail across ALL images I request.

For the first image, I need the sky background. Ready?
```

After Gemini responds, send the Sky prompt below.

---

## ARCADE CONTEXT PROMPT (send this first in new chat)

```
I'm creating game assets for a retro arcade room in a Club Penguin-style virtual world. I need you to generate a series of 2D game art images that all share a consistent visual style.

THE STYLE:
- 2D flat illustration with retro arcade aesthetic
- Dark purple/black backgrounds with neon pink, blue, and cyan accents
- Clean shapes, glowing neon effects
- Cozy gaming den atmosphere, 80s/90s arcade vibes

THE SCENE:
An arcade room with 4 arcade cabinet machines, some lava lamps, bean bag chairs, a stats display panel, and an exit door. There's a neon "GAME ROOM" sign. Players walk around and interact with the cabinets.

I'll be asking you to generate each element separately so I can layer them in my game engine. Please maintain the EXACT same art style, color palette, and level of detail across ALL images I request.

For the first image, I need the full room background. Ready?
```

After Gemini responds, send the Background prompt below.

---

| Target Size | Gemini Aspect Ratio |
|-------------|---------------------|
| 800x400 | 2:1 or 16:9 |
| 800x600 | 4:3 |
| 800x200 | 4:1 (or 16:9 and crop) |
| 800x300 | 8:3 (or 16:9 and crop) |
| 150x180 | 5:6 or 4:5 |
| 80x120 | 2:3 |
| 60-100px props | 1:1 or 4:5 |

---

## LOBBY SESSION

### 1. Sky → 2:1 aspect, resize to 800x400 - START HERE
```
2D game art, flat illustration style, soft pastel colors, clean vector-like shapes, no outlines, Club Penguin aesthetic, cozy winter village

Winter sky background, soft gradient from pale powder blue at top to slightly warmer blue at horizon, fluffy white clouds scattered across, gentle golden sunlight from upper right creating warm glow, peaceful atmosphere, no ground visible
```
> Save as: `default/lobby/sky.png`

---

### 2. Horizon → 4:1 aspect, resize to 800x200
```
2D game art, flat illustration style, soft pastel colors, clean vector-like shapes, no outlines, Club Penguin aesthetic, cozy winter village

Distant snowy mountain range, rolling white hills with subtle blue shadows, evergreen pine trees dotting the hillsides, soft morning mist at base, peaceful winter landscape, transparent background at bottom edge
```
> Save as: `default/lobby/horizon.png`

---

### 3. Ground → 8:3 aspect, resize to 800x300
```
2D game art, flat illustration style, soft pastel colors, clean vector-like shapes, no outlines, Club Penguin aesthetic, cozy winter village

Top-down angled view of snowy town square, pristine white snow with gentle blue shadows, cobblestone or brick path through center, ice skating rink texture patches, snow banks around edges, inviting plaza for walking
```
> Save as: `default/lobby/ground.png`

---

### 4. Record Store - CENTER → 5:6 aspect, resize to 150x180
```
2D game art, flat illustration style, soft pastel colors, clean vector-like shapes, no outlines, Club Penguin aesthetic

Retro record store building, front view, slightly larger building, teal or coral colored walls, snow-covered roof, large display window showing vinyl records, vintage "RECORDS" sign, musical notes decoration, hip and cool vibe, transparent background
```
> Save as: `default/lobby/building-records.png`

---

### 5. Cafe - LEFT → 5:6 aspect, resize to 150x180
```
2D game art, flat illustration style, soft pastel colors, clean vector-like shapes, no outlines, Club Penguin aesthetic

Cozy coffee shop building, front view, warm cream and brown wooden exterior, peaked roof covered in snow, steamy windows glowing warm yellow, small awning over door, coffee cup sign, chimney with gentle smoke, welcoming and warm, transparent background
```
> Save as: `default/lobby/building-cafe.png`

---

### 6. Arcade Entrance - RIGHT → 5:6 aspect, resize to 150x180
```
2D game art, flat illustration style, soft pastel colors, clean vector-like shapes, no outlines, Club Penguin aesthetic

Arcade building entrance, front view, purple and neon pink accents, snow-covered roof, glowing "ARCADE" sign, pixel art decorations, joystick motif, inviting doorway with warm light inside, fun gaming vibe, transparent background
```
> Save as: `default/lobby/building-arcade.png`

---

### 7. Info Stand → 3:4 aspect, resize to 60x80
```
2D game art, flat illustration style, soft pastel colors, clean vector-like shapes, no outlines, Club Penguin aesthetic

Information kiosk stand, wooden post with notice board, snow on top, papers/flyers pinned to board, "INFO" sign, helpful community bulletin board style, transparent background
```
> Save as: `default/lobby/prop-info-stand.png`

---

### 8. Bench → 8:5 aspect, resize to 80x50
```
2D game art, flat illustration style, soft pastel colors, clean vector-like shapes, no outlines, Club Penguin aesthetic

Wooden park bench, front-angled view, warm brown wood, snow dusting on seat and back, simple cozy design, transparent background
```
> Save as: `default/lobby/prop-bench.png`

---

### 9. Tree → 3:5 aspect, resize to 60x100
```
2D game art, flat illustration style, soft pastel colors, clean vector-like shapes, no outlines, Club Penguin aesthetic

Single evergreen pine tree, dark green triangular layers, heavy white snow on branches, brown trunk, winter forest tree, transparent background
```
> Save as: `default/lobby/prop-tree.png`

---

### 10. Lamp → 1:3 aspect, resize to 30x90
```
2D game art, flat illustration style, soft pastel colors, clean vector-like shapes, no outlines, Club Penguin aesthetic

Vintage street lamp, dark iron post, warm glowing lantern top, snow accumulated on lamp head, cozy warm light, transparent background
```
> Save as: `default/lobby/prop-lamp.png`

---
---

## ARCADE SESSION (new chat)

### 1. Background → 4:3 aspect, resize to 800x600 - START HERE
```
2D game art, flat illustration style, retro arcade aesthetic, neon colors on dark background

Retro arcade room interior, dark purple walls, checkered floor in dark colors, neon light strips along ceiling and walls, ambient purple and pink glow, cozy gaming den atmosphere, space for arcade cabinets along top wall
```
> Save as: `default/arcade/background.png`

---

### 2. Neon Sign → 20:3 aspect (wide), resize to 400x60
```
2D game art, flat illustration style, neon sign aesthetic

"GAME ROOM" neon sign, glowing pink and blue neon tubes, retro arcade typography, slight glow effect, transparent background
```
> Save as: `default/arcade/neon-sign.png`

---

### 3. Cabinet - Caption Contest → 2:3 aspect, resize to 80x120
```
2D game art, flat illustration style, retro arcade aesthetic, neon accents

Arcade cabinet machine, front view, dark cabinet with pink/purple trim, screen showing camera icon, "CAPTION CONTEST" label, joystick and buttons visible, retro gaming machine, transparent background
```
> Save as: `default/arcade/cabinet-caption.png`

---

### 4. Cabinet - Board Rush → 2:3 aspect, resize to 80x120
```
2D game art, flat illustration style, retro arcade aesthetic, neon accents

Arcade cabinet machine, front view, dark cabinet with blue/cyan trim, screen showing dice icon, "BOARD RUSH" label, joystick and buttons visible, retro gaming machine, transparent background
```
> Save as: `default/arcade/cabinet-board.png`

---

### 5. Cabinet - About You → 2:3 aspect, resize to 80x120
```
2D game art, flat illustration style, retro arcade aesthetic, neon accents

Arcade cabinet machine, front view, dark cabinet with green/yellow trim, screen showing thought bubble icon, "ABOUT YOU" label, joystick and buttons visible, personality quiz game vibes, transparent background
```
> Save as: `default/arcade/cabinet-about.png`

---

### 6. Cabinet - Newly Webs → 2:3 aspect, resize to 80x120
```
2D game art, flat illustration style, retro arcade aesthetic, neon accents

Arcade cabinet machine, front view, dark cabinet with orange/red trim, screen showing spider web icon, "NEWLY WEBS" label, joystick and buttons visible, web/connections game vibes, transparent background
```
> Save as: `default/arcade/cabinet-newlywebs.png`

---

### 7. Placard → 3:2 aspect, resize to 60x40
```
2D game art, flat illustration style, retro arcade aesthetic

Small instruction placard sign, dark background with neon border, "HOW TO PLAY" text, mounted on small stand, informational sign style, transparent background
```
> Save as: `default/arcade/placard.png`

---

### 8. Lava Lamp → 1:2 aspect, resize to 40x80
```
2D game art, flat illustration style, retro aesthetic

Retro lava lamp, tall glass with colored blobs floating inside, glowing purple/pink colors, groovy 70s style, ambient decoration, transparent background
```
> Save as: `default/arcade/prop-lava-lamp.png`

---

### 9. Bean Bag → 7:5 aspect, resize to 70x50
```
2D game art, flat illustration style, retro arcade aesthetic

Comfy bean bag chair, squishy round shape, purple or teal colored fabric, casual seating, chill hangout vibes, transparent background
```
> Save as: `default/arcade/prop-bean-bag.png`

---

### 10. Stats Panel → 2:3 aspect, resize to 100x150
```
2D game art, flat illustration style, retro arcade aesthetic, neon accents

Arcade stats display panel, vertical screen/monitor, dark frame with neon trim, showing game stats and leaderboard graphics, "NOW PLAYING" header, retro digital display style, transparent background
```
> Save as: `default/arcade/prop-stats-panel.png`

---

### 11. Exit Door → 3:5 aspect, resize to 60x100
```
2D game art, flat illustration style, retro arcade aesthetic

Exit door, dark frame, glowing "EXIT" sign above, slightly ajar showing light from lobby beyond, arcade room door, transparent background
```
> Save as: `default/arcade/prop-exit-door.png`

---

## Tips

1. **Generate at 2x size** (e.g., 1600x800 for sky) then scale down for crisp edges
2. **Remove backgrounds** with remove.bg for transparent PNGs
3. **Regenerate freely** - keep trying until you get the right vibe
4. **Reference previous images** - tell Gemini "match the style/colors of the previous image"
