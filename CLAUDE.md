# Joey Musselman Site

Personal website and party games frontend. Built with Next.js 15.

## Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint check
npx tsc --noEmit     # Type check
```

## Project Structure

```
app/
├── page.tsx                    # Homepage
├── globals.css                 # CSS variables & base styles
├── layout.tsx                  # Root layout
├── clown-club/                 # Virtual world routes
│   ├── page.tsx               # Player entry (join LOBBY)
│   ├── host/                  # TV/spectator display
│   ├── world/                 # World views
│   └── crown-card/            # Crown card feature
├── party/                      # Legacy party routes
│   └── ...
├── admin/                      # Admin pages
│   └── projects/              # Project management
└── api/                        # API routes
    └── admin/projects/        # Projects CRUD

components/                     # Shared React components
lib/                           # Utilities & Phaser integration
```

## Key Files

- `lib/socket.ts` - Socket.IO client singleton
- `lib/phaser/` - Phaser.js game integration
- `components/` - Reusable React components
- `.env.local` - Socket server URL (NEXT_PUBLIC_SOCKET_URL)

## Related Projects

| Project | Path | Description |
|---------|------|-------------|
| Game Server | `../clown-club/` | Socket.IO game server (port 3015) |
| Ports Registry | `../ports.json` | Central port allocation |

## Styling

Use CSS variables from globals.css:
- `var(--foreground)` - dark text (#171717)
- `var(--muted)` - gray text (#6b7280)
- `var(--accent)` - red (#dc2626)
- `var(--border)` - light gray border (#e5e7eb)
- White backgrounds, minimal design

### Phaser Scene Colors

All Phaser scenes use a consistent color palette matching CSS variables:

```typescript
const COLORS = {
  background: 0xffffff,  // white
  panel: 0xf3f4f6,       // light gray
  accent: 0xdc2626,      // red
  text: 0x171717,        // dark
  muted: 0x6b7280,       // gray
  border: 0xe5e7eb,      // light gray
  success: 0x22c55e,     // green (for positive indicators)
  gold: 0xfbbf24,        // gold (for scores/rankings)
};
```

Text colors use hex strings: `'#171717'` (dark), `'#dc2626'` (red accent)

## Socket Connection

```typescript
// Development: ws://localhost:3015
// Production: Set NEXT_PUBLIC_SOCKET_URL in .env.local

import { socket } from '@/lib/socket';

// Clown Club events use 'cc:' prefix
socket.emit('cc:join-room', { roomCode: 'LOBBY', playerName });
socket.on('cc:world-state', (state) => { ... });
```

## Phaser Integration

Phaser must be dynamically imported (SSR: false):
```tsx
const PhaserGame = dynamic(() => import('@/components/PhaserGame'), {
  ssr: false
});
```

### Asset System
Using emoji placeholders initially - see `lib/phaser/assets/AssetRegistry.ts`
To swap in sprites: update `spriteKey` property, no code changes needed elsewhere.

### Multiplayer Architecture
- All player positions are server-authoritative (anti-cheat)
- Use interpolation for smooth remote player movement
- Rate limit position updates to 10-15/second

### Adding a New Character
1. Add entry to `AssetRegistry.characters` with emoji
2. Later: add sprite to `public/assets/`, update `spriteKey`

### Zone System (Scenes)

Club Penguin-style multi-room navigation with fade transitions:

**Player Scenes:**
- `LobbyScene` - Main town square, door to games room
- `GamesRoomScene` - Arcade room with game cabinets

**Host Scenes:**
- `HostWorldScene` - TV display with zone tabs (Lobby/Games Room)
- `HostBoardGameScene` / `HostCaptionContestScene` - Game displays

**Zone Flow:**
1. Player clicks door → fade out → `cc:change-zone` → server moves player → `cc:zone-changed` → fade in new scene
2. Host clicks zone tabs → `cc:spectator-change-zone` → view updates

**Key files:**
- `scenes/LobbyScene.ts` - Main lobby with zone transitions
- `scenes/GamesRoomScene.ts` - Arcade room with game cabinets
- `scenes/HostWorldScene.ts` - Host view with zone tabs, game queue overlay

### Character Sprite Animation (TODO)
Currently using emoji placeholders. Next steps for Club Penguin-style animated sprites:

**Key files for player rendering:**
- `lib/clown-club/phaser/assets/AssetRegistry.ts` - Character registry (swap emoji → spriteKey)
- `lib/clown-club/phaser/scenes/LobbyScene.ts:497` - Player sprite creation
- `lib/clown-club/phaser/scenes/HostWorldScene.ts:566` - Host display player rendering

**Sprite requirements:**
- Spritesheet with walk animation frames (up, down, left, right)
- Idle frame(s)
- Recommended: 64x64 or 128x128 per frame
- Format: PNG spritesheet or individual frames

**To implement animated walk:**
1. Generate spritesheets (e.g., via Gemini/AI image gen)
2. Place in `public/assets/characters/`
3. Load in BootScene with `this.load.spritesheet()`
4. Update player rendering to use `this.add.sprite()` + `this.anims.create()`
5. Play walk animation based on movement direction

## Pre-Commit Checklist

1. `git status` - no `.env*`, credentials, or secrets
2. `npx tsc --noEmit` - no type errors
3. No `console.log` in production code
4. Test at 375px viewport width

## IMPORTANT

- Socket server must be running for games to work
- Phaser accesses `window` - always use dynamic import
- Mobile-first: test at 375px width
