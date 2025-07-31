import express from 'express';
import Mechanic from '../models/Mechanic.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Search for nearby mechanics (protected route)
// Expects query params: lat, lng, radius (in meters, default 5000)
router.get('/nearby', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }
    const mechanics = await Mechanic.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius)
        }
      }
    }).populate('user', 'name email');
    res.json(mechanics);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Get mechanic profile by ID (protected route)
router.get('/:id', auth, async (req, res) => {
  try {
    const mechanic = await Mechanic.findById(req.params.id).populate('user', 'name email');
    if (!mechanic) {
      return res.status(404).json({ message: 'Mechanic not found' });
    }
    res.json(mechanic);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
