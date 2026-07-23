import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sdx_digital_survey_secret_key_2026';

// HELPER: Guarantees default 'admin' and 'user' accounts exist with password '12345678'
const ensureDefaultAccounts = async () => {
  try {
    const defaultPasswordHash = await bcrypt.hash('12345678', 10);

    // Upsert Admin Account
    await User.findOneAndUpdate(
      { username: 'admin' },
      { username: 'admin', password: defaultPasswordHash, role: 'admin' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Upsert Standard User Account
    await User.findOneAndUpdate(
      { username: 'user' },
      { username: 'user', password: defaultPasswordHash, role: 'user' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Clean up legacy email-formatted users if they exist
    await User.deleteMany({ username: { $in: ['admin@ds.com', 'user@ds.com'] } });
  } catch (err) {
    console.warn("Account provisioning notice:", err.message);
  }
};

// 1. LOGIN USER
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both username and password.' });
    }

    // Always ensure database accounts are primed
    await ensureDefaultAccounts();

    // Sanitize input: convert "user@ds.com" -> "user" and "admin@ds.com" -> "admin"
    let cleanUsername = String(username).trim().toLowerCase();
    if (cleanUsername.includes('@')) {
      cleanUsername = cleanUsername.split('@')[0];
    }

    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET CURRENT LOGGED IN USER SESSION
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No authorization token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, user: { id: user._id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
});

export default router;