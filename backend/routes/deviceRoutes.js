import express from 'express';
import Device from '../models/Device.js';

const router = express.Router();

// 1. Mock endpoint to generate a pending device with a pairing PIN
router.post('/register', async (req, res) => {
  try {
    const { deviceName } = req.body;
    // Generate a random 6-digit PIN string
    const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const newDevice = await Device.create({
      deviceName,
      pairingCode,
      status: 'pending'
    });

    res.status(201).json({ success: true, device: newDevice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. The Handshake Endpoint: Kiosk enters the PIN
router.post('/pair', async (req, res) => {
  try {
    const { pairingCode } = req.body;
    
    // Find the device with this active PIN
    const device = await Device.findOne({ pairingCode, status: 'pending' });
    
    if (!device) {
      return res.status(404).json({ success: false, message: 'Invalid or expired pairing code.' });
    }

    // Pair it!
    device.status = 'paired';
    device.pairingCode = undefined; // Clear code once used
    await device.save();

    res.json({ success: true, message: `Successfully paired with ${device.deviceName}!` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;