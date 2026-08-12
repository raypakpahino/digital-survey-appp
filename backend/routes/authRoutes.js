import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sdx_digital_survey_secret_key_2026';

// HELPER: Guarantees default 'admin', 'site_leader', and 'user' accounts exist
const ensureDefaultAccounts = async () => {
  try {
    const defaultPasswordHash = await bcrypt.hash('12345678', 10);

    // Upsert Admin Account
    await User.findOneAndUpdate(
      { username: 'admin' },
      { username: 'admin', password: defaultPasswordHash, role: 'admin', assignedSite: '' },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // Upsert Default Site Leader Account
    await User.findOneAndUpdate(
      { username: 'site_leader' },
      { username: 'site_leader', password: defaultPasswordHash, role: 'site_leader', assignedSite: 'Tablet-A' },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // Upsert Standard User Account
    await User.findOneAndUpdate(
      { username: 'user' },
      { username: 'user', password: defaultPasswordHash, role: 'user', assignedSite: '' },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
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

    // Sanitize input
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

// 3. ADMIN USER PROVISIONING ROUTE (CREATE / UPDATE ROLES & SITE ASSIGNMENTS)
router.post('/users/assign', async (req, res) => {
  try {
    const { username, password, role, assignedSite } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required.' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const updateData = {};

    if (role) updateData.role = role;
    if (assignedSite !== undefined) updateData.assignedSite = String(assignedSite).trim();

    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const user = await User.findOneAndUpdate(
      { username: cleanUsername },
      { $set: updateData },
      { upsert: true, new: true, runValidators: false }
    ).select('-password');

    res.json({ 
      success: true, 
      message: `User '${cleanUsername}' updated successfully.`,
      user: { id: user._id, username: user.username, role: user.role, assignedSite: user.assignedSite } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. GET ALL REGISTERED USERS (FOR ADMIN DASHBOARD)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;