/* global process */
import express from 'express';
import User from '../models/User.js';
import Mechanic from '../models/Mechanic.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Ensure this file is run in a Node.js environment where 'process.env' is defined
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const router = express.Router();

// Rider or Mechanic Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, shopName, location, address, phone } = req.body;
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, role });

    if (role === 'mechanic') {
      if (!shopName || !location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
        return res.status(400).json({ message: 'Mechanic must provide shopName and valid location' });
      }
      await Mechanic.create({
        user: user._id,
        shopName,
        location: {
          type: 'Point',
          coordinates: location.coordinates,
        },
        address,
        phone,
      });
    }

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    let mechanicId = null;
    if (user.role === 'mechanic') {
      const mechanic = await Mechanic.findOne({ user: user._id });
      if (mechanic) mechanicId = mechanic._id;
    }

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      mechanicId
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
