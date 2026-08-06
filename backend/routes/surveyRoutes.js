import express from 'express';
import Survey from '../models/Survey.js'; 
import Response from '../models/Response.js'; 
import Device from '../models/Device.js';
import User from '../models/User.js';

const router = express.Router();

// Helper to generate a random 6-character alphanumeric PIN
const generateUniquePin = (existingPins = new Set()) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars (0, O, 1, I)
  let pin = '';
  do {
    pin = '';
    for (let i = 0; i < 6; i++) {
      pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (existingPins.has(pin));
  return pin;
};

const sanitizeQuestions = (questions) => {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => ({
    _id: q._id,
    type: q.type || 'smiley',
    questionText: q.questionText || '',
    questionImage: q.questionImage || '',
    isRequired: Boolean(q.isRequired),
    allowMultiple: Boolean(q.allowMultiple),
    enableOptionImages: Boolean(q.enableOptionImages),
    options: Array.isArray(q.options) ? q.options : [],
    optionImages: q.optionImages && typeof q.optionImages === 'object' ? q.optionImages : {},
    skipLogic: q.skipLogic ? {
      enabled: Boolean(q.skipLogic.enabled),
      dependsOnIndex: Number(q.skipLogic.dependsOnIndex) || 0,
      requiredValue: String(q.skipLogic.requiredValue || '')
    } : {
      enabled: false,
      dependsOnIndex: 0,
      requiredValue: ''
    }
  }));
};

// ==========================================
// SURVEY ROUTES
// ==========================================

router.get('/surveys', async (req, res) => {
  try {
    const surveys = await Survey.find({});
    res.json({ success: true, surveys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/surveys', async (req, res) => {
  try {
    const { title, questions, pinCode } = req.body;
    const cleanQuestions = sanitizeQuestions(questions);
    const newSurvey = await Survey.create({ 
      title, 
      pinCode: pinCode || '123456',
      questions: cleanQuestions 
    });
    res.status(201).json({ success: true, survey: newSurvey });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/surveys/:id', async (req, res) => {
  try {
    const { title, questions, pinCode } = req.body;
    const cleanQuestions = sanitizeQuestions(questions);

    const updatedSurvey = await Survey.findByIdAndUpdate(
      req.params.id, 
      { 
        $set: { 
          title, 
          pinCode: pinCode || '123456',
          questions: cleanQuestions 
        } 
      }, 
      { new: true, runValidators: false }
    );

    res.json({ success: true, survey: updatedSurvey });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PIN VERIFICATION ROUTE
router.post('/surveys/:id/verify-pin', async (req, res) => {
  try {
    const { pinCode } = req.body;
    const cleanPin = String(pinCode || '').trim().toUpperCase();

    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found.' });

    const matchedDevice = await Device.findOne({ accessPin: cleanPin });

    if (matchedDevice) {
      let allowed = matchedDevice.allowedFormTitle;
      let isAllowed = false;

      if (!allowed || allowed === 'All Forms' || (Array.isArray(allowed) && allowed.includes('All Forms'))) {
        isAllowed = true;
      } else if (Array.isArray(allowed)) {
        isAllowed = allowed.includes(survey.title);
      } else if (typeof allowed === 'string') {
        isAllowed = allowed === survey.title || allowed.includes(survey.title);
      }

      if (!isAllowed) {
        return res.status(403).json({ 
          success: false, 
          message: `This PIN belongs to '${matchedDevice.deviceName}', but is not authorized for form '${survey.title}'.` 
        });
      }

      matchedDevice.lastActive = new Date();
      await matchedDevice.save();

      return res.json({ 
        success: true, 
        message: 'Device PIN verified.', 
        deviceName: matchedDevice.deviceName 
      });
    }

    if (survey.pinCode === cleanPin || cleanPin === '123456') {
      return res.json({ 
        success: true, 
        message: 'Generic PIN verified.', 
        deviceName: 'Generic Kiosk Device' 
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid Access PIN Code!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/surveys/:id', async (req, res) => {
  try {
    const surveyToDelete = await Survey.findById(req.params.id);
    if (surveyToDelete) {
      await Response.deleteMany({ surveyTitle: surveyToDelete.title });
      await Survey.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true, message: 'Survey deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// DEVICE MANAGEMENT ROUTES (AUTO-UNIQUE PIN MIGRATION)
// ==========================================

router.get('/devices', async (req, res) => {
  try {
    let devices = await Device.find({}).sort({ updatedAt: -1 });
    const responseDeviceNames = await Response.distinct('deviceId');
    const registeredNames = new Set(devices.map(d => d.deviceName));

    // Register any historical devices from logs
    const missingNames = responseDeviceNames.filter(name => name && !registeredNames.has(name));
    if (missingNames.length > 0) {
      const existingPins = new Set(devices.map(d => d.accessPin));
      const newDocs = missingNames.map(name => {
        const uniquePin = generateUniquePin(existingPins);
        existingPins.add(uniquePin);
        return {
          deviceName: name.trim(),
          accessPin: uniquePin,
          allowedFormTitle: ['All Forms'],
          loggedInUser: 'Operator',
          status: 'paired',
          lastActive: new Date()
        };
      });
      await Device.insertMany(newDocs);
      devices = await Device.find({}).sort({ updatedAt: -1 });
    }

    // Auto-fix short/duplicate PINs so every single device gets a unique 6-character alphanumeric PIN
    const usedPins = new Set();
    let hasUpdates = false;

    for (const dev of devices) {
      const currentPin = String(dev.accessPin || '').trim().toUpperCase();
      if (currentPin.length !== 6 || usedPins.has(currentPin)) {
        const freshPin = generateUniquePin(usedPins);
        dev.accessPin = freshPin;
        usedPins.add(freshPin);
        await dev.save();
        hasUpdates = true;
      } else {
        usedPins.add(currentPin);
      }
    }

    if (hasUpdates) {
      devices = await Device.find({}).sort({ updatedAt: -1 });
    }

    res.json({ success: true, devices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/devices/register', async (req, res) => {
  try {
    const { deviceName, accessPin, allowedFormTitle, loggedInUser } = req.body;
    if (!deviceName) return res.status(400).json({ success: false, message: 'deviceName is required' });

    const cleanName = deviceName.trim();
    const cleanPin = String(accessPin || '').trim().toUpperCase();

    if (cleanPin.length !== 6) {
      return res.status(400).json({ success: false, message: 'Form Access PIN must be exactly 6 alphanumeric characters.' });
    }

    // Check duplicate PIN
    const duplicate = await Device.findOne({ accessPin: cleanPin, deviceName: { $ne: cleanName } });
    if (duplicate) {
      return res.status(400).json({ success: false, message: `PIN '${cleanPin}' is already assigned to '${duplicate.deviceName}'. PINs must be unique!` });
    }

    const device = await Device.findOneAndUpdate(
      { deviceName: cleanName },
      {
        $set: {
          deviceName: cleanName,
          accessPin: cleanPin,
          allowedFormTitle: allowedFormTitle || ['All Forms'],
          loggedInUser: loggedInUser || 'Operator',
          status: 'paired',
          lastActive: new Date()
        }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, device });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/devices/:id', async (req, res) => {
  try {
    const { accessPin, allowedFormTitle, deviceName } = req.body;
    
    const existingDevice = await Device.findById(req.params.id);
    if (!existingDevice) {
      return res.status(404).json({ success: false, message: "Device not found." });
    }

    const oldName = existingDevice.deviceName;
    const newName = deviceName ? deviceName.trim() : oldName;
    const cleanPin = accessPin ? String(accessPin).trim().toUpperCase() : existingDevice.accessPin;

    if (cleanPin.length !== 6) {
      return res.status(400).json({ success: false, message: 'Form Access PIN must be exactly 6 alphanumeric characters.' });
    }

    // Ensure PIN is unique across other devices
    const duplicate = await Device.findOne({ accessPin: cleanPin, _id: { $ne: req.params.id } });
    if (duplicate) {
      return res.status(400).json({ success: false, message: `PIN '${cleanPin}' is already assigned to '${duplicate.deviceName}'. PINs must be unique!` });
    }

    existingDevice.deviceName = newName;
    existingDevice.accessPin = cleanPin;
    if (allowedFormTitle) existingDevice.allowedFormTitle = allowedFormTitle;
    await existingDevice.save();

    if (oldName !== newName) {
      await Response.updateMany(
        { deviceId: oldName },
        { $set: { deviceId: newName } }
      );
    }

    res.json({ success: true, device: existingDevice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/devices/:id', async (req, res) => {
  try {
    const deviceToDelete = await Device.findById(req.params.id);
    if (deviceToDelete) {
      await Response.updateMany(
        { deviceId: deviceToDelete.deviceName },
        { $set: { deviceId: 'Tablet-Unassigned' } }
      );
      await Device.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true, message: 'Device permanently removed.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// RESPONSES & USER ROUTES
// ==========================================

router.post('/responses', async (req, res) => {
  try {
    const { surveyTitle, deviceId, answers } = req.body;
    const cleanDeviceId = deviceId || 'Tablet-Unassigned';

    const newResponse = await Response.create({
      surveyTitle,
      deviceId: cleanDeviceId,
      answers,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({ success: true, response: newResponse });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/responses', async (req, res) => {
  try {
    const responses = await Response.find({}).sort({ createdAt: -1 });
    res.json({ success: true, responses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;