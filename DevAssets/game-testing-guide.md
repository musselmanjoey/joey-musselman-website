# Caption Contest Game - Testing Guide

## Overview
A complete Jackbox-style caption contest game where players submit funny captions for random images and vote on the funniest ones.

## Testing the Game

### 1. Start the Server
```bash
cd joey-musselman-site
npm run dev
```

Server will start at `http://localhost:3001`

### 2. Set Up Host (TV/Main Screen)
1. Open browser to: `http://localhost:3001/game/host`
2. Room will be created automatically
3. Note the 4-character room code displayed on screen
4. Leave this window open on your TV/main screen

### 3. Join as Players (Phones/Devices)
1. On each player's device, go to: `http://localhost:3001/game/join`
2. Enter the room code (4 letters)
3. Enter player name (max 20 characters)
4. Click "Join Game"
5. You'll be redirected to the player controller at `/game/play`

**Test with at least 2 players** (can use multiple browser windows/tabs)

### 4. Play the Game

**Lobby Phase:**
- Host screen shows room code and player list
- Player screens show "Waiting for Host"
- When ready, click "Start Game" on host screen

**Caption Submission Phase:**
- Random image appears on both host and player screens
- Players type funny captions (max 200 characters)
- Host screen shows submission progress (e.g., "2 / 3" players submitted)
- Game auto-advances to voting when all players submit

**Voting Phase:**
- All captions displayed on host screen (anonymous)
- Players see captions on their devices and tap to vote
- Players CANNOT vote for their own caption (button is disabled)
- Host screen shows vote progress
- Game auto-advances to results when all players vote

**Results Phase:**
- Host screen shows:
  - Winner announcement with trophy emoji
  - Winning caption
  - Full vote breakdown (all captions with vote counts)
  - Overall scoreboard (accumulated scores across rounds)
- Player screens show trophy and "Check the host screen"
- Click "Next Round" on host to start a new round with a new image

### 5. Test WebSocket Connection
If you encounter issues, test the WebSocket connection first:
1. Go to: `http://localhost:3001/test`
2. Should show "Connected" status
3. Click "Send Test Message"
4. Should receive response: "WebSocket is working!"

## Game Features

### Implemented Features
- [x] Room creation with 4-character codes
- [x] Player join with name validation (max 20 chars)
- [x] Duplicate name detection
- [x] Host starts game
- [x] Random placeholder images (picsum.photos)
- [x] Caption submission with character counter (200 max)
- [x] Auto-advance when all submit
- [x] Voting system
- [x] Prevent self-voting
- [x] Auto-advance when all vote
- [x] Vote tallying and score tracking
- [x] Winner announcement
- [x] Vote breakdown display
- [x] Running scoreboard across rounds
- [x] Next round functionality
- [x] Room cleanup on host disconnect

### Known Behaviors
- Room is deleted if host leaves
- All players are kicked if host disconnects
- Game state resets if server restarts (in-memory only)
- Images are placeholder URLs - can be replaced with Colin photos later

## Future Enhancements
- [ ] Add real Colin photos instead of placeholder images
- [ ] Add timer for submissions/voting
- [ ] Add "skip" option if someone takes too long
- [ ] Add final game winner (after N rounds)
- [ ] Add sound effects
- [ ] Deploy to production (Railway/Render for WebSocket server)
- [ ] Add persistent score history (database)
- [ ] Add custom image upload

## Production Deployment Notes
**Important:** Vercel doesn't support persistent WebSocket connections. For production:
1. Deploy Next.js frontend to Vercel
2. Deploy Socket.io server separately to Railway or Render
3. Update Socket.io connection URLs in code to point to production server
4. Configure CORS for production domain

## Troubleshooting

**Port already in use:**
```bash
npx kill-port 3001
```

**Pages returning 404:**
```bash
rm -rf .next
npm run dev
```

**WebSocket not connecting:**
1. Check server is running at localhost:3001
2. Test at /test page
3. Check browser console for connection errors

**Room not created:**
- Refresh host page
- Check server logs in terminal

## Server Console Logs
Watch for these helpful messages:
- `🔌 Client connected: [socket-id]`
- `🎮 Room created: [ROOM-CODE]`
- `👤 Player [name] joined room [code]`
- `💬 [name] submitted caption in room [code]`
- `🗳️  All submissions in, voting started in room [code]`
- `🏆 Round [N] winner: [name] in room [code]`

Enjoy the game! 🎉
