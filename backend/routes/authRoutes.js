import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sdx_digital_survey_secret_key_2026';

// HELPER: Guarantees default 'admin' account exists if DB is totally fresh
const ensureDefaultAccounts = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const defaultPasswordHash = await bcrypt.hash('12345678', 10);
      await User.create({
        username: 'admin',
        password: defaultPasswordHash,
        role: 'admin',
        assignedSite: ''
      });
      console.log("✅ Primed default admin account (username: admin, pass: 12345678)");
    }

    // Clean up legacy email-formatted or old 'user' account if still in DB
    await User.deleteMany({ username: { $in: ['admin@ds.com', 'user@ds.com', 'user'] } });
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

    await ensureDefaultAccounts();

    let cleanUsername = String(username).trim().toLowerCase();
    if (cleanUsername.includes('@')) {
      cleanUsername = cleanUsername.split('@')[0];
    }

    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    // Support both bcrypt hashed passwords and legacy plain text fallback
    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (password === user.password);
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role, 
        assignedSite: user.assignedSite || '' 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role, 
        assignedSite: user.assignedSite || '' 
      }
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

    res.json({ 
      success: true, 
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role, 
        assignedSite: user.assignedSite || '' 
      } 
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
});

// 3. GET ALL REGISTERED USERS
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;