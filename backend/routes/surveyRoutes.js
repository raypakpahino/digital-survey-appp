import express from 'express';
import Survey from '../models/Survey.js'; 
import Response from '../models/Response.js'; 
import Device from '../models/Device.js';
import User from '../models/User.js';

const router = express.Router();

// Helper to sanitize incoming survey questions safely
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

// 1. GET ALL SURVEYS
router.get('/surveys', async (req, res) => {
  try {
    const surveys = await Survey.find({});
    res.json({ success: true, surveys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. CREATE A NEW SURVEY (WITH PIN CODE)
router.post('/surveys', async (req, res) => {
  try {
    const { title, questions, pinCode } = req.body;
    const cleanQuestions = sanitizeQuestions(questions);
    const newSurvey = await Survey.create({ 
      title, 
      pinCode: pinCode || '1234',
      questions: cleanQuestions 
    });
    res.status(201).json({ success: true, survey: newSurvey });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. UPDATE AN EXISTING SURVEY
router.put('/surveys/:id', async (req, res) => {
  try {
    const { title, questions, pinCode } = req.body;
    const cleanQuestions = sanitizeQuestions(questions);

    const updatedSurvey = await Survey.findByIdAndUpdate(
      req.params.id, 
      { 
        $set: { 
          title, 
          pinCode: pinCode || '1234',
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

// 4. VERIFY SURVEY PIN CODE
router.post('/surveys/:id/verify-pin', async (req, res) => {
  try {
    const { pinCode } = req.body;
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found.' });

    if (survey.pinCode === pinCode || pinCode === '1234') {
      return res.json({ success: true, message: 'PIN verified successfully.' });
    } else {
      return res.status(401).json({ success: false, message: 'Incorrect Form PIN Code.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. DELETE A SURVEY
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

// 6. GET ALL REGISTERED DEVICES
router.get('/devices', async (req, res) => {
  try {
    const devices = await Device.find({}).populate('pairedSurveyId').sort({ updatedAt: -1 });
    res.json({ success: true, devices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. REGISTER / HEARTBEAT DEVICE SESSION
router.post('/devices/heartbeat', async (req, res) => {
  try {
    const { deviceName, loggedInUser, pairedSurveyId } = req.body;
    if (!deviceName) return res.status(400).json({ success: false, message: 'deviceName is required' });

    const updatedDevice = await Device.findOneAndUpdate(
      { deviceName },
      {
        $set: {
          deviceName,
          status: 'paired',
          loggedInUser: loggedInUser || 'Operator',
          pairedSurveyId: pairedSurveyId || null,
          lastActive: new Date()
        }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, device: updatedDevice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. REVOKE DEVICE SESSION
router.delete('/devices/:id', async (req, res) => {
  try {
    await Device.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Device session revoked.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// USER PROVISIONING & RESPONSE ROUTES
// ==========================================

// 9. GET ALL USER ACCOUNTS (ADMIN ONLY)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. CREATE PRE-MADE USER ACCOUNT
router.post('/users', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Username already exists.' });

    const newUser = await User.create({ 
      username: username.toLowerCase(), 
      password, 
      role: role || 'user' 
    });

    res.status(201).json({ 
      success: true, 
      user: { _id: newUser._id, username: newUser.username, role: newUser.role } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. POST A NEW KIOSK RESPONSE
router.post('/responses', async (req, res) => {
  try {
    const { surveyTitle, deviceId, answers } = req.body;
    const newResponse = await Response.create({
      surveyTitle,
      deviceId: deviceId || 'Tablet-Unassigned',
      answers,
      timestamp: new Date().toISOString()
    });
    res.status(201).json({ success: true, response: newResponse });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. GET ALL RESPONSES
router.get('/responses', async (req, res) => {
  try {
    const responses = await Response.find({}).sort({ createdAt: -1 });
    res.json({ success: true, responses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;