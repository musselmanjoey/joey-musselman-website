# Cozy Reading Nook - Scene Prompt v1

## Target
Generate a base image for an ambient bookscape scene featuring a cozy reading nook with afternoon sunlight, suitable for overlaying dust mote particle effects.

## Image Generation Prompt (Gemini)

```
(wide shot:1.3), cozy reading nook interior, warm afternoon sunlight streaming through a large window, visible sun rays and light beams cutting through the air, comfortable armchair with soft cushions, small side table with tea cup and open book, bookshelf in background filled with old books, wooden floors, soft warm color palette, golden hour lighting, peaceful atmosphere, photorealistic, 8k, book cover quality
```

## Negative Prompt (if supported)
```
people, characters, faces, animals, text, watermark, signature, harsh shadows, dark, night time, cold colors, blue tones, modern furniture, minimalist, sterile
```

## Requirements
- Aspect ratio: 16:9 (for video/fullscreen display)
- Resolution: At least 1920x1080, preferably 4K
- Key elements:
  - Strong directional light (for dust mote effect to be visible)
  - Warm, golden tones
  - Cozy, inviting atmosphere
  - No people or characters (we want focus on the space)
  - Clear area where light beams are visible (dust will float here)

## Effect Pairing
- **Primary effect**: Dust motes floating in sunbeam
- **Config**: density: 40, speed: 0.3, color: #FFE4B5 (warm gold)

## Notes
- The dust effect will be most visible where there's contrast between light and shadow
- Image should have a defined "light beam" area where particles will concentrate
- Warm golden tones will complement the dust particle color

## Version History
- v1 (2025-01-22): Initial prompt
