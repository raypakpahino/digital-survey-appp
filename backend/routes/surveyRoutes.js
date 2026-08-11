import express from 'express';
import Survey from '../models/Survey.js'; 
import Response from '../models/Response.js'; 
import Device from '../models/Device.js';
import User from '../models/User.js';

const router = express.Router();

const generateUniquePin = (existingPins = new Set()) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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
    const { title, questions, pinCode, thankYouMessage, autoRefreshSeconds } = req.body;
    const cleanQuestions = sanitizeQuestions(questions);  
    const newSurvey = await Survey.create({ 
      title: String(title || '').trim(), 
      pinCode: String(pinCode || '123456').trim().toUpperCase(),
      questions: cleanQuestions,
      thankYouMessage: thankYouMessage || 'Thank you for your feedback! This screen will automatically refresh in a few seconds.',
      autoRefreshSeconds: Number(autoRefreshSeconds) || 4
    });
    res.status(201).json({ success: true, survey: newSurvey });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/surveys/:id', async (req, res) => {
  try {
    const { title, questions, pinCode, thankYouMessage, autoRefreshSeconds } = req.body;
    const cleanQuestions = sanitizeQuestions(questions);

    const updatePayload = { 
      title: String(title || '').trim(), 
      pinCode: String(pinCode || '123456').trim().toUpperCase(),
      questions: cleanQuestions 
    };

    if (thankYouMessage !== undefined) updatePayload.thankYouMessage = thankYouMessage;
    if (autoRefreshSeconds !== undefined) updatePayload.autoRefreshSeconds = Number(autoRefreshSeconds);

    const updatedSurvey = await Survey.findByIdAndUpdate(
      req.params.id, 
      { $set: updatePayload }, 
      { new: true, runValidators: false }
    );

    res.json({ success: true, survey: updatedSurvey });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROBUST PIN VERIFICATION ROUTE
router.post('/surveys/:id/verify-pin', async (req, res) => {
  try {
    const { pinCode } = req.body;
    const cleanPin = String(pinCode || '').trim().toUpperCase();

    if (!cleanPin) {
      return res.status(400).json({ success: false, message: 'Please enter a PIN code.' });
    }

    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found.' });

    // Fetch all devices to do a flexible PIN search
    const allDevices = await Device.find({}).lean();
    const matchedDevice = allDevices.find(d => String(d.accessPin || '').trim().toUpperCase() === cleanPin);

    if (matchedDevice) {
      let allowed = matchedDevice.allowedFormTitle;
      let isAllowed = false;

      const targetTitle = String(survey.title || '').trim().toLowerCase();
      const devName = String(matchedDevice.deviceName || '').trim().toLowerCase();

      // Superadmin device override
      if (devName === 'superadmin') {
        isAllowed = true;
      } else {
        let allowedList = [];
        if (Array.isArray(allowed)) {
          allowedList = allowed.map(item => String(item || '').trim().toLowerCase());
        } else if (typeof allowed === 'string') {
          allowedList = allowed.split(',').map(item => item.trim().toLowerCase());
        }

        // Access allowed if empty list, contains "all forms", or matches form title
        isAllowed = allowedList.length === 0 || 
                    allowedList.includes('all forms') || 
                    allowedList.includes(targetTitle) ||
                    allowedList.some(item => item.length > 0 && (targetTitle.includes(item) || item.includes(targetTitle)));
      }

      if (!isAllowed) {
        return res.status(403).json({ 
          success: false, 
          message: `This PIN belongs to '${matchedDevice.deviceName}', but is not authorized for form '${survey.title}'.` 
        });
      }

      await Device.findByIdAndUpdate(matchedDevice._id, { $set: { lastActive: new Date() } });

      return res.json({ 
        success: true, 
        message: 'Device PIN verified.', 
        deviceName: matchedDevice.deviceName 
      });
    }

    // Direct Survey PIN or default fallback
    const cleanSurveyPin = String(survey.pinCode || '').trim().toUpperCase();

    if (cleanSurveyPin === cleanPin || cleanPin === '123456' || cleanPin === '1234') {
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
// DEVICE MANAGEMENT ROUTES
// ==========================================

router.get('/devices', async (req, res) => {
  try {
    let devices = await Device.find({}).sort({ updatedAt: -1 }).lean();
    const responseDeviceNames = await Response.distinct('deviceId');
    const registeredNames = new Set(devices.map(d => d.deviceName));

    const missingNames = responseDeviceNames.filter(name => name && name !== 'Tablet-Unassigned' && !registeredNames.has(name));
    if (missingNames.length > 0) {
      const existingPins = new Set(devices.map(d => String(d.accessPin || '').toUpperCase()));
      const firstSurvey = await Survey.findOne({});
      const defaultFormList = firstSurvey ? [firstSurvey.title] : [];

      const newDocs = missingNames.map(name => {
        const uniquePin = generateUniquePin(existingPins);
        existingPins.add(uniquePin);
        return {
          deviceName: name.trim(),
          accessPin: uniquePin,
          allowedFormTitle: defaultFormList,
          loggedInUser: 'Operator',
          status: 'paired',
          lastActive: new Date()
        };
      });
      await Device.insertMany(newDocs);
      devices = await Device.find({}).sort({ updatedAt: -1 }).lean();
    }

    res.json({ success: true, devices });
  } catch (error) {
    console.error("Error in GET /api/devices:", error);
    res.status(500).json({ success: false, error: error.message, devices: [] });
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

    const duplicate = await Device.findOne({ accessPin: cleanPin, deviceName: { $ne: cleanName } });
    if (duplicate) {
      return res.status(400).json({ success: false, message: `PIN '${cleanPin}' is already assigned to '${duplicate.deviceName}'. PINs must be unique!` });
    }

    const cleanForms = Array.isArray(allowedFormTitle) 
      ? allowedFormTitle.map(f => String(f).trim())
      : [String(allowedFormTitle).trim()];

    const device = await Device.findOneAndUpdate(
      { deviceName: cleanName },
      {
        $set: {
          deviceName: cleanName,
          accessPin: cleanPin,
          allowedFormTitle: cleanForms,
          loggedInUser: loggedInUser || 'Operator',
          status: 'paired',
          lastActive: new Date()
        }
      },
      { upsert: true, new: true, runValidators: false }
    );

    res.json({ success: true, device });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    const duplicate = await Device.findOne({ accessPin: cleanPin, _id: { $ne: req.params.id } });
    if (duplicate) {
      return res.status(400).json({ success: false, message: `PIN '${cleanPin}' is already assigned to '${duplicate.deviceName}'. PINs must be unique!` });
    }

    const cleanForms = Array.isArray(allowedFormTitle) 
      ? allowedFormTitle.map(f => String(f).trim())
      : [String(allowedFormTitle).trim()];

    const updatedDevice = await Device.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          deviceName: newName,
          accessPin: cleanPin,
          allowedFormTitle: cleanForms
        }
      },
      { new: true, runValidators: false }
    );

    if (oldName !== newName) {
      await Response.updateMany(
        { deviceId: oldName },
        { $set: { deviceId: newName } }
      );
    }

    res.json({ success: true, device: updatedDevice });
  } catch (error) {
    console.error("PUT /devices error:", error);
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
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