import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Site from '../models/Site.js';

const router = express.Router();

// SITE MANAGEMENT ROUTES
router.get('/sites', async (req, res) => {
  try {
    const sites = await Site.find({}).sort({ name: 1 });
    res.json({ success: true, sites });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/sites', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Site name is required.' });
    }

    const cleanName = name.trim();
    const existing = await Site.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A site with this name already exists.' });
    }

    const newSite = await Site.create({ name: cleanName, description: description || '' });
    res.status(201).json({ success: true, site: newSite });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/sites/:id', async (req, res) => {
  try {
    await Site.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Site removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// USER & ROLE MANAGEMENT ROUTES
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { username, password, role, assignedSites, assignedDevices, allowedDevices, assignedSite } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(400).json({ success: false, message: `Username '${cleanUsername}' is already taken.` });
    }

    let targetRole = role || 'kiosk_operator';
    if (targetRole === 'user') targetRole = 'kiosk_operator';

    // Hash password with bcrypt so login comparison succeeds
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const cleanSites = Array.isArray(assignedSites) ? assignedSites : (assignedSite ? [assignedSite] : []);
    const cleanDevices = Array.isArray(assignedDevices) ? assignedDevices : (Array.isArray(allowedDevices) ? allowedDevices : []);

    const newUser = await User.create({
      username: cleanUsername,
      password: hashedPassword,
      role: targetRole,
      assignedSite: cleanSites.join(', '),
      assignedSites: cleanSites,
      assignedDevices: cleanDevices,
      allowedDevices: cleanDevices
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    res.status(201).json({ success: true, user: userObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { role, password, assignedSites, assignedDevices, allowedDevices, assignedSite } = req.body;
    const updateData = {};

    if (role) {
      updateData.role = role === 'user' ? 'kiosk_operator' : role;
    }

    if (assignedSites !== undefined) {
      const sitesArr = Array.isArray(assignedSites) ? assignedSites : [];
      updateData.assignedSites = sitesArr;
      updateData.assignedSite = sitesArr.join(', ');
    } else if (assignedSite !== undefined) {
      updateData.assignedSite = assignedSite;
      updateData.assignedSites = assignedSite ? assignedSite.split(',').map(s => s.trim()).filter(Boolean) : [];
    }

    if (assignedDevices !== undefined || allowedDevices !== undefined) {
      const devsArr = Array.isArray(assignedDevices) ? assignedDevices : (Array.isArray(allowedDevices) ? allowedDevices : []);
      updateData.assignedDevices = devsArr;
      updateData.allowedDevices = devsArr;
    }
    
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: false }
    ).select('-password');

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;