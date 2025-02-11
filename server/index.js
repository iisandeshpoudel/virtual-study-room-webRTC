const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();

// Create HTTP or HTTPS server based on environment
const isHttps = process.env.HTTPS === 'true';
let server;

if (isHttps) {
  const certDir = path.join(__dirname, '.cert');
  const options = {
    key: fs.readFileSync(path.join(certDir, 'key.pem')),
    cert: fs.readFileSync(path.join(certDir, 'cert.pem'))
  };
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}

const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"]
  }
});

// Enable CORS for all routes
app.use(cors({
  origin: "*", // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-study-room')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Room and user tracking
const rooms = new Map(); // roomId -> Set of userIds
const userSocketMap = new Map(); // userId -> socketId
const socketUserMap = new Map(); // socketId -> userId
const roomSocketMap = new Map(); // roomId -> Set of socketIds

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userId }) => {
    console.log('User joining room:', { roomId, userId, socketId: socket.id });
    
    // Store socket and user mappings
    userSocketMap.set(userId, socket.id);
    socketUserMap.set(socket.id, userId);
    
    // Track room sockets
    if (!roomSocketMap.has(roomId)) {
      roomSocketMap.set(roomId, new Set());
    }
    roomSocketMap.get(roomId).add(socket.id);
    
    // Check if room exists and has less than 5 people
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set([userId]));
    } else if (rooms.get(roomId).size < 5) {
      rooms.get(roomId).add(userId);
    } else {
      socket.emit('room-full');
      return;
    }

    socket.join(roomId);
    
    // Get all other users in the room
    const otherUsers = Array.from(rooms.get(roomId))
      .filter(id => id !== userId)
      .map(id => ({
        userId: id,
        socketId: userSocketMap.get(id)
      }));
    
    console.log('Room users for', roomId, ':', Array.from(rooms.get(roomId)));
    console.log('Other users for', userId, ':', otherUsers);
    
    // Send list of all users to the newly joined user
    socket.emit('room-users', otherUsers);
    
    // Notify other users in the room
    socket.to(roomId).emit('user-joined', {
      userId,
      socketId: socket.id
    });
  });

  socket.on('signal', ({ userId, signal, to }) => {
    console.log('Signal from', userId, 'to', to);
    const targetSocketId = userSocketMap.get(to);
    if (targetSocketId) {
      console.log('Forwarding signal to socket:', targetSocketId);
      io.to(targetSocketId).emit('signal', {
        userId,
        signal,
        from: socket.id
      });
    } else {
      console.log('Target socket not found for user:', to);
    }
  });

  socket.on('leave-room', ({ roomId, userId }) => {
    handleUserLeaving(socket, roomId, userId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      // Find all rooms the user is in
      rooms.forEach((users, roomId) => {
        if (users.has(userId)) {
          handleUserLeaving(socket, roomId, userId);
        }
      });
      // Clean up mappings
      socketUserMap.delete(socket.id);
      userSocketMap.delete(userId);
      
      // Clean up room socket mappings
      roomSocketMap.forEach((sockets, roomId) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            roomSocketMap.delete(roomId);
          }
        }
      });
    }
  });
});

function handleUserLeaving(socket, roomId, userId) {
  console.log('User leaving room:', { roomId, userId, socketId: socket.id });
  if (rooms.has(roomId)) {
    const room = rooms.get(roomId);
    room.delete(userId);
    if (room.size === 0) {
      rooms.delete(roomId);
    }
    
    // Clean up room socket mapping
    const roomSockets = roomSocketMap.get(roomId);
    if (roomSockets) {
      roomSockets.delete(socket.id);
      if (roomSockets.size === 0) {
        roomSocketMap.delete(roomId);
      }
    }
    
    socket.to(roomId).emit('user-left', { userId });
    socket.leave(roomId);
  }
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
  console.log(`Server running on ${isHttps ? 'https' : 'http'}://${HOST}:${PORT}`);
}); 