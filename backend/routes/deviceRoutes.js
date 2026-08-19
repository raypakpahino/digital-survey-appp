import express from 'express';
import Device from '../models/Device.js';

const router = express.Router();

// 1. GET ALL REGISTERED DEVICES
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find({}).sort({ createdAt: -1 });
    res.json({ success: true, devices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. REGISTER A DEVICE WITH CUSTOM PIN & AUTHORIZED FORMS
router.post('/register', async (req, res) => {
  try {
    const { deviceName, accessPin, allowedFormTitle } = req.body;
    
    if (!deviceName || !deviceName.trim()) {
      return res.status(400).json({ success: false, message: 'Device name is required.' });
    }

    const cleanPin = (accessPin || Math.floor(100000 + Math.random() * 900000).toString()).trim().toUpperCase();
    const formsArray = Array.isArray(allowedFormTitle) 
      ? allowedFormTitle 
      : (typeof allowedFormTitle === 'string' ? allowedFormTitle.split(',').map(s => s.trim()).filter(Boolean) : []);

    const existing = await Device.findOne({ deviceName: deviceName.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A device with this name already exists.' });
    }

    const newDevice = await Device.create({
      deviceName: deviceName.trim(),
      accessPin: cleanPin,
      allowedFormTitle: formsArray,
      status: 'paired'
    });

    res.status(201).json({ success: true, device: newDevice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. UPDATE DEVICE ACCESS RULE & AUTHORIZED FORMS
router.put('/:id', async (req, res) => {
  try {
    const { deviceName, accessPin, allowedFormTitle } = req.body;
    
    const updatePayload = {};
    if (deviceName) updatePayload.deviceName = deviceName.trim();
    if (accessPin) updatePayload.accessPin = accessPin.trim().toUpperCase();
    if (allowedFormTitle !== undefined) {
      updatePayload.allowedFormTitle = Array.isArray(allowedFormTitle) 
        ? allowedFormTitle 
        : (typeof allowedFormTitle === 'string' ? allowedFormTitle.split(',').map(s => s.trim()).filter(Boolean) : []);
    }

    const updatedDevice = await Device.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: false }
    );

    if (!updatedDevice) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    res.json({ success: true, device: updatedDevice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. DELETE A REGISTERED DEVICE
router.delete('/:id', async (req, res) => {
  try {
    await Device.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Device removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. PAIRING HANDSHAKE ENDPOINT
router.post('/pair', async (req, res) => {
  try {
    const { pairingCode } = req.body;
    
    const device = await Device.findOne({ pairingCode, status: 'pending' });
    
    if (!device) {
      return res.status(404).json({ success: false, message: 'Invalid or expired pairing code.' });
    }

    device.status = 'paired';
    device.pairingCode = undefined;
    await device.save();

    res.json({ success: true, message: `Successfully paired with ${device.deviceName}!` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;