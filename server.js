const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// In-memory game state
const rooms = new Map();

// Helper functions
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Check if code already exists, regenerate if so
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

function createRoom(hostSocketId) {
  const code = generateRoomCode();
  const room = {
    code,
    hostSocketId,
    players: [],
    gameState: 'lobby', // lobby, submitting, voting, results
    currentRound: 0,
    submissions: [],
    votes: new Map(),
    scores: new Map(),
    createdAt: Date.now()
  };
  rooms.set(code, room);
  console.log(`🎮 Room created: ${code}`);
  return room;
}

function addPlayerToRoom(roomCode, socketId, playerName) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const player = {
    id: socketId,
    name: playerName,
    score: 0,
    isHost: socketId === room.hostSocketId
  };

  room.players.push(player);
  room.scores.set(socketId, 0);
  console.log(`👤 Player ${playerName} joined room ${roomCode}`);
  return room;
}

function removePlayerFromRoom(socketId) {
  for (const [code, room] of rooms.entries()) {
    const playerIndex = room.players.findIndex(p => p.id === socketId);
    if (playerIndex !== -1) {
      const player = room.players[playerIndex];
      room.players.splice(playerIndex, 1);
      room.scores.delete(socketId);
      console.log(`👋 Player ${player.name} left room ${code}`);

      // If room is empty or host left, delete room
      if (room.players.length === 0 || socketId === room.hostSocketId) {
        rooms.delete(code);
        console.log(`🗑️  Room ${code} deleted`);
        return { deleted: true, code };
      }
      return { deleted: false, code, room };
    }
  }
  return null;
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handler(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: dev ? 'http://localhost:3001' : '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket.io connection handler
  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Create a new game room (host)
    socket.on('create-room', () => {
      console.log('📝 Create room request from:', socket.id);
      const room = createRoom(socket.id);
      socket.join(room.code);
      socket.emit('room-created', { roomCode: room.code, room });
    });

    // Rejoin existing room as host (for page refresh)
    socket.on('rejoin-room', ({ roomCode }) => {
      console.log('🔄 Rejoin request for room:', roomCode, 'from socket:', socket.id);
      const room = rooms.get(roomCode?.toUpperCase());

      if (!room) {
        console.log('❌ Room not found:', roomCode);
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Update the host socket ID
      const oldHostId = room.hostSocketId;
      room.hostSocketId = socket.id;
      socket.join(roomCode);

      console.log(`✅ Host rejoined room ${roomCode} (old socket: ${oldHostId}, new socket: ${socket.id})`);
      socket.emit('room-created', { roomCode: room.code, room });
    });

    // Join an existing room (player)
    socket.on('join-room', ({ roomCode, playerName }) => {
      const room = rooms.get(roomCode?.toUpperCase());

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Check if player name is taken
      if (room.players.some(p => p.name === playerName)) {
        socket.emit('error', { message: 'Name already taken' });
        return;
      }

      socket.join(roomCode);
      const updatedRoom = addPlayerToRoom(roomCode, socket.id, playerName);

      // Notify everyone in the room
      io.to(roomCode).emit('room-updated', updatedRoom);
      socket.emit('joined-room', { roomCode, room: updatedRoom });
    });

    // Player disconnect
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
      const result = removePlayerFromRoom(socket.id);

      if (result) {
        if (result.deleted) {
          // Notify all players room was deleted
          io.to(result.code).emit('room-closed', { message: 'Host left the game' });
        } else {
          // Notify remaining players
          io.to(result.code).emit('room-updated', result.room);
        }
      }
    });

    // Start Game (host only)
    socket.on('start-game', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room || socket.id !== room.hostSocketId) return;

      room.gameState = 'submitting';
      room.currentRound++;
      room.submissions = [];
      room.currentImage = `https://picsum.photos/seed/${roomCode}${room.currentRound}/800/600`; // Random placeholder image

      console.log(`🎮 Game started in room ${roomCode}`);
      io.to(roomCode).emit('game-state-changed', {
        gameState: 'submitting',
        currentImage: room.currentImage,
        round: room.currentRound
      });
    });

    // Submit Caption
    socket.on('submit-caption', ({ roomCode, caption }) => {
      const room = rooms.get(roomCode);
      if (!room || room.gameState !== 'submitting') return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      // Add submission
      const submission = {
        playerId: socket.id,
        playerName: player.name,
        caption: caption.trim()
      };
      room.submissions.push(submission);

      console.log(`💬 ${player.name} submitted caption in room ${roomCode}`);

      // Notify all players
      io.to(roomCode).emit('submission-received', {
        playerName: player.name,
        totalSubmissions: room.submissions.length,
        totalPlayers: room.players.length
      });

      // If everyone submitted, move to voting
      if (room.submissions.length === room.players.length) {
        room.gameState = 'voting';
        room.votes = new Map();

        console.log(`🗳️  All submissions in, voting started in room ${roomCode}`);
        io.to(roomCode).emit('game-state-changed', {
          gameState: 'voting',
          submissions: room.submissions.map(s => ({ caption: s.caption, playerId: s.playerId }))
        });
      }
    });

    // Vote for Caption
    socket.on('vote-caption', ({ roomCode, votedForId }) => {
      const room = rooms.get(roomCode);
      if (!room || room.gameState !== 'voting') return;

      // Can't vote for yourself
      if (votedForId === socket.id) {
        socket.emit('error', { message: "Can't vote for yourself!" });
        return;
      }

      room.votes.set(socket.id, votedForId);
      console.log(`🗳️  Vote recorded in room ${roomCode}`);

      // Notify vote count
      io.to(roomCode).emit('vote-recorded', {
        votesReceived: room.votes.size,
        totalPlayers: room.players.length
      });

      // If everyone voted, show results
      if (room.votes.size === room.players.length) {
        // Tally votes
        const voteCounts = new Map();
        for (const [voter, votedFor] of room.votes.entries()) {
          voteCounts.set(votedFor, (voteCounts.get(votedFor) || 0) + 1);
        }

        // Update scores
        for (const [playerId, voteCount] of voteCounts.entries()) {
          const currentScore = room.scores.get(playerId) || 0;
          room.scores.set(playerId, currentScore + voteCount);

          // Update player score in players array
          const player = room.players.find(p => p.id === playerId);
          if (player) player.score = currentScore + voteCount;
        }

        // Find winner of this round
        let maxVotes = 0;
        let winnerId = null;
        for (const [playerId, votes] of voteCounts.entries()) {
          if (votes > maxVotes) {
            maxVotes = votes;
            winnerId = playerId;
          }
        }

        const winner = room.players.find(p => p.id === winnerId);
        const winningSubmission = room.submissions.find(s => s.playerId === winnerId);

        room.gameState = 'results';
        console.log(`🏆 Round ${room.currentRound} winner: ${winner?.name} in room ${roomCode}`);

        io.to(roomCode).emit('game-state-changed', {
          gameState: 'results',
          winner: winner,
          winningCaption: winningSubmission?.caption,
          allScores: room.players.map(p => ({ name: p.name, score: p.score })),
          voteCounts: Array.from(voteCounts.entries()).map(([id, count]) => {
            const player = room.players.find(p => p.id === id);
            const submission = room.submissions.find(s => s.playerId === id);
            return { playerName: player?.name, caption: submission?.caption, votes: count };
          })
        });
      }
    });

    // Next Round
    socket.on('next-round', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room || socket.id !== room.hostSocketId) return;

      room.gameState = 'submitting';
      room.currentRound++;
      room.submissions = [];
      room.votes = new Map();
      room.currentImage = `https://picsum.photos/seed/${roomCode}${room.currentRound}/800/600`;

      console.log(`🎮 Round ${room.currentRound} started in room ${roomCode}`);
      io.to(roomCode).emit('game-state-changed', {
        gameState: 'submitting',
        currentImage: room.currentImage,
        round: room.currentRound
      });
    });

    // Test event (keep for debugging)
    socket.on('test', (data) => {
      console.log('Test event received:', data);
      socket.emit('test-response', { message: 'WebSocket is working!' });
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.io server is running`);
    });
});
