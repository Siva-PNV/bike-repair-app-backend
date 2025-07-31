import express from 'express';
import Request from '../models/Request.js';
import Mechanic from '../models/Mechanic.js';
import auth from '../middleware/auth.js';


const router = express.Router();


// Rider views their own requests
router.get('/mine', auth, async (req, res) => {
  try {
    if (req.user.role !== 'rider') return res.status(403).json({ message: 'Forbidden' });
    const requests = await Request.find({ rider: req.user.id }).populate({ path: 'mechanic', options: { strictPopulate: false } });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Mechanic views requests assigned to them
router.get('/mechanic', auth, async (req, res) => {
  try {
    // Only allow mechanics
    if (req.user.role !== 'mechanic') return res.status(403).json({ message: 'Forbidden' });
    const mechanic = await Mechanic.findOne({ user: req.user.id });
    if (!mechanic) return res.status(404).json({ message: 'Mechanic profile not found' });
    const requests = await Request.find({ mechanic: mechanic._id }).populate('rider', 'name email');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Mechanic updates request status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'mechanic') return res.status(403).json({ message: 'Forbidden' });
    const mechanic = await Mechanic.findOne({ user: req.user.id });
    if (!mechanic) return res.status(404).json({ message: 'Mechanic profile not found' });
    const { status } = req.body;
    if (!['accepted', 'declined', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const request = await Request.findOneAndUpdate(
      { _id: req.params.id, mechanic: mechanic._id },
      { status, updatedAt: Date.now() },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get a single request by ID (for rider or mechanic)
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate('mechanic').populate('rider', 'name email');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    // Only allow the rider who owns the request or the assigned mechanic to view
    if (
      (req.user.role === 'rider' && request.rider && request.rider._id.toString() !== req.user.id) ||
      (req.user.role === 'mechanic' && request.mechanic && request.mechanic.user && request.mechanic.user.toString() !== req.user.id)
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Rider creates a repair request for a mechanic
router.post('/', auth, async (req, res) => {
  try {
    const { mechanicId, location, description } = req.body;
    if (!mechanicId || !location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return res.status(400).json({ message: 'mechanicId and valid location are required' });
    }
    const mechanic = await Mechanic.findById(mechanicId);
    if (!mechanic) return res.status(404).json({ message: 'Mechanic not found' });
    const request = await Request.create({
      rider: req.user.id,
      mechanic: mechanicId,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
      },
      description,
    });

    // Real-time notification to mechanic via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`mechanic_${mechanicId}`).emit('new_request', {
        requestId: request._id,
        rider: req.user.id,
        description,
        location: location.coordinates,
      });
    }

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
