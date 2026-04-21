const { Server } = require('socket.io');

let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173', // Your React frontend URL
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Middleware to authenticate agents
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    // For now, accept any token (you can add JWT verification later)
    if (token) {
      socket.userId = token; // Store the user ID from token
      return next();
    }
    next(new Error('Authentication error'));
  });

  io.on('connection', (socket) => {
    console.log('Agent connected:', socket.id);

    // Agent joins their room
    socket.on('agent:join', ({ agentId }) => {
      socket.join(`agent:${agentId}`);
      socket.agentId = agentId;
      console.log(`Agent ${agentId} joined room agent:${agentId}`);
    });

    // Load conversations from database
    socket.on('chat:get-conversations', async () => {
      // For now, return empty array or mock data
      // You'll implement database queries later
      const conversations = [];
      
      socket.emit('chat:conversations', conversations);
    });

    // Agent sends message to citizen
    socket.on('chat:send-message', async ({ citizenId, text, time }) => {
      console.log(`Message from agent ${socket.agentId} to citizen ${citizenId}: ${text}`);
      
      const message = {
        id: Date.now(),
        from: 'agent',
        text,
        time,
        read: true,
        created_at: new Date()
      };
      
      // For now, just echo back for testing
      // You'll add database saving later
      
      // Confirm to agent
      socket.emit('chat:message-sent', { citizenId, message });
      
      // Send to citizen (if online)
      io.to(`citizen:${citizenId}`).emit('chat:agent-message', {
        agentId: socket.agentId,
        message
      });
    });

    // Mark messages as read
    socket.on('chat:mark-read', async ({ citizenId }) => {
      console.log(`Agent marked messages as read for citizen ${citizenId}`);
      // You'll add database update later
    });

    socket.on('disconnect', () => {
      console.log('Agent disconnected:', socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}

module.exports = { initializeSocket, getIO };