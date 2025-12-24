# Clown Character Spritesheet Generation Guide

Generate unique frames in Gemini, then flip/combine into final spritesheet.

## Character Style

**White blob with black outline, red clown nose, dot eyes, small black legs. NO ARMS.**

### Color Key (for future palette swapping)

| Part | Color | Hex |
|------|-------|-----|
| Body | Pure white | `#FFFFFF` |
| Nose | Pure red | `#FF0000` |
| Outline/eyes/legs | Pure black | `#000000` |

---

## Final Layout (3x4 grid, 192x256 total)

```
         Col 1      Col 2      Col 3
       ┌──────────┬──────────┬──────────┐
Row 1  │ FRONT    │ FRONT    │ FRONT    │
DOWN   │ idle     │ walk     │ walk     │
       │ [1]      │ [2]      │ flip [2] │
       ├──────────┼──────────┼──────────┤
Row 2  │ SIDE     │ SIDE     │ SIDE     │
RIGHT  │ idle     │ walk     │ idle     │
       │ [3]      │ [4]      │ [3]      │
       ├──────────┼──────────┼──────────┤
Row 3  │ SIDE     │ SIDE     │ SIDE     │
LEFT   │ idle     │ walk     │ idle     │
       │ flip [3] │ flip [4] │ flip [3] │
       ├──────────┼──────────┼──────────┤
Row 4  │ BACK     │ BACK     │ BACK     │
UP     │ idle     │ walk     │ walk     │
       │ [5]      │ [6]      │ flip [6] │
       └──────────┴──────────┴──────────┘
```

Each frame: 64x64 pixels

---

## Frames to Generate (6 unique)

| # | Name | Description |
|---|------|-------------|
| 1 | `clown-front-idle.png` | Facing camera, neutral stance |
| 2 | `clown-front-walk.png` | Facing camera, foot forward → flip for other foot |
| 3 | `clown-side-idle.png` | Side view facing right → flip for left |
| 4 | `clown-side-walk.png` | Side view facing right, foot forward → flip for left |
| 5 | `clown-back-idle.png` | Back view, neutral stance |
| 6 | `clown-back-walk.png` | Back view, foot forward → flip for other foot |

**6 generated → 12 frames via flipping/reuse**

---

## FRAME 1: Front Idle

> Save as: `clown-front-idle.png`

```
64x64 image with solid green (#00FF00) background.

Character: White blob with black outline, red clown nose, dot eyes, small black legs. NO ARMS.
- Body: pure white (#FFFFFF)
- Nose: pure red (#FF0000)
- Outline, eyes, legs: pure black (#000000)

Pose: Standing facing forward (facing camera), neutral idle stance, feet slightly apart.

Style: Smooth vector illustration with clean anti-aliased lines. NOT pixel art, NOT 8-bit. Think Club Penguin or Flash animation style.

Center the character in the frame.
```

---

## FRAME 2: Front Walk (Left Foot Forward)

> Save as: `clown-front-walk.png`
> Flip horizontally → right foot forward

```
64x64 image with solid green (#00FF00) background.

Character: White blob with black outline, red clown nose, dot eyes, small black legs. NO ARMS.
- Body: pure white (#FFFFFF)
- Nose: pure red (#FF0000)
- Outline, eyes, legs: pure black (#000000)

Pose: Walking toward camera, LEFT foot stepped forward, right foot back.

Style: Smooth vector illustration with clean anti-aliased lines. NOT pixel art.

Center the character in the frame.
```

---

## FRAME 3: Side Idle (Facing Right)

> Save as: `clown-side-idle.png`
> Flip horizontally → facing left

```
64x64 image with solid green (#00FF00) background.

Character: White blob with black outline, red clown nose, dot eyes, small black legs. NO ARMS.
- Body: pure white (#FFFFFF)
- Nose: pure red (#FF0000)
- Outline, eyes, legs: pure black (#000000)

Pose: Side view facing RIGHT, neutral standing pose, one eye and nose visible in profile.

Style: Smooth vector illustration with clean anti-aliased lines. NOT pixel art.

Center the character in the frame.
```

---

## FRAME 4: Side Walk

> Save as: `clown-side-walk.png`
> Flip horizontally → left-facing version

```
64x64 image with solid green (#00FF00) background.

Character: White blob with black outline, red clown nose, dot eyes, small black legs. NO ARMS.
- Body: pure white (#FFFFFF)
- Nose: pure red (#FF0000)
- Outline, eyes, legs: pure black (#000000)

Pose: Side view facing RIGHT, mid-stride walking pose with one foot forward.

Style: Smooth vector illustration with clean anti-aliased lines. NOT pixel art.

Center the character in the frame.
```

---

## FRAME 5: Back Idle

> Save as: `clown-back-idle.png`

```
64x64 image with solid green (#00FF00) background.

Character: White blob with black outline, red clown nose, dot eyes, small black legs. NO ARMS.
- Body: pure white (#FFFFFF)
- Nose: pure red (#FF0000)
- Outline, eyes, legs: pure black (#000000)

Pose: Back view (facing away from camera), no face visible, feet slightly apart.

Style: Smooth vector illustration with clean anti-aliased lines. NOT pixel art.

Center the character in the frame.
```

---

## FRAME 6: Back Walk

> Save as: `clown-back-walk.png`
> Flip horizontally → other foot forward

```
64x64 image with solid green (#00FF00) background.

Character: Simple white blob with black outline, small black legs. NO ARMS - the character has no arms at all, just a round body and legs.
- Body: pure white (#FFFFFF)
- Outline and legs: pure black (#000000)
- No face visible from behind

Pose: Back view (facing away from camera), mid-stride walking pose with one foot forward.

Style: Smooth vector illustration with clean anti-aliased lines. NOT pixel art.

Center the character in the frame.
```

---

## Post-Processing

### 1. Remove green backgrounds
```bash
python scripts/remove-background.py clown-front-idle.png clown-front-idle-clean.png
# repeat for all 6 frames
```

### 2. Create flipped versions
Flip horizontally:
- `clown-front-walk.png` → `clown-front-walk-flip.png`
- `clown-side-idle.png` → `clown-side-idle-flip.png`
- `clown-side-walk.png` → `clown-side-walk-flip.png`
- `clown-back-walk.png` → `clown-back-walk-flip.png`

### 3. Assemble spritesheet (192x256)

```
Row 1 (FRONT): front-idle | front-walk | front-walk-flip
Row 2 (RIGHT): side-idle  | side-walk  | side-idle
Row 3 (LEFT):  side-idle-flip | side-walk-flip | side-idle-flip
Row 4 (BACK):  back-idle  | back-walk  | back-walk-flip
```

### 4. Final file
Save as: `public/assets/characters/clown-white-v2.png`

---

## Future: Color Variants

| Original | New Color | Result |
|----------|-----------|--------|
| `#FFFFFF` (body) | `#87CEEB` | Blue clown |
| `#FFFFFF` (body) | `#FFB6C1` | Pink clown |
| `#FF0000` (nose) | `#FFA500` | Orange nose |
