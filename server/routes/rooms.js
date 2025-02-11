const router = require('express').Router();
const Room = require('../models/Room');
const auth = require('../middleware/auth');

// Create a new room
router.post('/', auth, async (req, res) => {
  try {
    const room = new Room({
      name: req.body.name,
      creator: req.user.userId,
      participants: [req.user.userId]
    });
    
    await room.save();
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error creating room' });
  }
});

// Get all available rooms
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find().populate('creator', 'username');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rooms' });
  }
});

// Join a room
router.post('/:roomId/join', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.participants.length >= 5) {
      return res.status(400).json({ message: 'Room is full' });
    }

    if (!room.participants.includes(req.user.userId)) {
      room.participants.push(req.user.userId);
      await room.save();
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error joining room' });
  }
});

// Leave a room
router.post('/:roomId/leave', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    room.participants = room.participants.filter(
      participant => participant.toString() !== req.user.userId
    );

    if (room.participants.length === 0) {
      await Room.deleteOne({ _id: req.params.roomId });
      return res.json({ message: 'Room deleted' });
    }

    await room.save();
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error leaving room' });
  }
});

module.exports = router; 