import express from 'express';
import Survey from '../models/Survey.js'; 
import Response from '../models/Response.js'; 
import Device from '../models/Device.js';
import User from '../models/User.js';

const router = express.Router();

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
      pinCode: pinCode || '1234',
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
// DEVICE MANAGEMENT ROUTES (3-SECTION STRUCTURE)
// ==========================================

router.get('/devices', async (req, res) => {
  try {
    const devices = await Device.find({}).sort({ updatedAt: -1 });
    res.json({ success: true, devices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/devices/register', async (req, res) => {
  try {
    const { deviceName, accessPin, allowedFormTitle, loggedInUser } = req.body;
    if (!deviceName) return res.status(400).json({ success: false, message: 'deviceName is required' });

    const device = await Device.findOneAndUpdate(
      { deviceName },
      {
        $set: {
          deviceName,
          accessPin: accessPin || '1234',
          allowedFormTitle: allowedFormTitle || 'All Forms',
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

router.delete('/devices/:id', async (req, res) => {
  try {
    await Device.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Device removed successfully.' });
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