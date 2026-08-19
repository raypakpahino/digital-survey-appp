import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sdx_digital_survey_secret_key_2026';

const ensureDefaultAccounts = async () => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const defaultPasswordHash = await bcrypt.hash('12345678', 10);
      await User.create({
        username: 'admin',
        password: defaultPasswordHash,
        role: 'admin',
        assignedSite: '',
        assignedSites: [],
        assignedDevices: [],
        allowedDevices: []
      });
    }

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

    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (password === user.password);
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const userSites = Array.isArray(user.assignedSites) && user.assignedSites.length > 0 
      ? user.assignedSites 
      : (user.assignedSite ? user.assignedSite.split(',').map(s => s.trim()) : []);

    const userDevices = Array.isArray(user.assignedDevices) && user.assignedDevices.length > 0 
      ? user.assignedDevices 
      : (Array.isArray(user.allowedDevices) ? user.allowedDevices : []);

    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role, 
        assignedSite: user.assignedSite || '',
        assignedSites: userSites,
        assignedDevices: userDevices,
        allowedDevices: userDevices
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
        assignedSite: user.assignedSite || '',
        assignedSites: userSites,
        assignedDevices: userDevices,
        allowedDevices: userDevices
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

    const userSites = Array.isArray(user.assignedSites) && user.assignedSites.length > 0 
      ? user.assignedSites 
      : (user.assignedSite ? user.assignedSite.split(',').map(s => s.trim()) : []);

    const userDevices = Array.isArray(user.assignedDevices) && user.assignedDevices.length > 0 
      ? user.assignedDevices 
      : (Array.isArray(user.allowedDevices) ? user.allowedDevices : []);

    res.json({ 
      success: true, 
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role, 
        assignedSite: user.assignedSite || '',
        assignedSites: userSites,
        assignedDevices: userDevices,
        allowedDevices: userDevices
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

// 4. CREATE USER
router.post('/users', async (req, res) => {
  try {
    const { username, password, role, assignedSites, assignedDevices, allowedDevices, assignedSite } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(400).json({ success: false, message: `Username '${cleanUsername}' is already taken.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cleanSites = Array.isArray(assignedSites) ? assignedSites : (assignedSite ? [assignedSite] : []);
    const cleanDevices = Array.isArray(assignedDevices) ? assignedDevices : (Array.isArray(allowedDevices) ? allowedDevices : []);

    const newUser = await User.create({
      username: cleanUsername,
      password: hashedPassword,
      role: role || 'kiosk_operator',
      assignedSite: cleanSites.length > 0 ? cleanSites.join(', ') : (assignedSite || ''),
      assignedSites: cleanSites,
      assignedDevices: cleanDevices,
      allowedDevices: cleanDevices
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. UPDATE USER
router.put('/users/:id', async (req, res) => {
  try {
    const { role, password, assignedSites, assignedDevices, allowedDevices, assignedSite } = req.body;
    const updatePayload = {};

    if (role) updatePayload.role = role;
    if (assignedSites !== undefined) {
      updatePayload.assignedSites = Array.isArray(assignedSites) ? assignedSites : [];
      updatePayload.assignedSite = updatePayload.assignedSites.join(', ');
    } else if (assignedSite !== undefined) {
      updatePayload.assignedSite = assignedSite;
      updatePayload.assignedSites = assignedSite ? assignedSite.split(',').map(s => s.trim()) : [];
    }

    if (assignedDevices !== undefined || allowedDevices !== undefined) {
      const devs = Array.isArray(assignedDevices) ? assignedDevices : (Array.isArray(allowedDevices) ? allowedDevices : []);
      updatePayload.assignedDevices = devs;
      updatePayload.allowedDevices = devs;
    }

    if (password && password.trim()) {
      updatePayload.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: false }
    ).select('-password');

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. DELETE USER
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;