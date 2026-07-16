import express from 'express';
import Survey from '../models/Survey.js'; 
import Response from '../models/Response.js'; 

const router = express.Router();

// 1. GET ALL SURVEY SCHEMAS
router.get('/surveys', async (req, res) => {
  try {
    const surveys = await Survey.find({});
    res.json({ success: true, surveys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. CREATE A NEW BLANK SURVEY
router.post('/surveys', async (req, res) => {
  try {
    const { title, questions } = req.body;
    const newSurvey = await Survey.create({ title, questions });
    res.status(201).json({ success: true, survey: newSurvey });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. UPDATE AN EXISTING SURVEY
router.put('/surveys/:id', async (req, res) => {
  try {
    const { title, questions } = req.body;
    const updatedSurvey = await Survey.findByIdAndUpdate(
      req.params.id, 
      { title, questions }, 
      { new: true }
    );
    res.json({ success: true, survey: updatedSurvey });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. DELETE A SURVEY
router.delete('/surveys/:id', async (req, res) => {
  try {
    await Survey.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Survey deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. POST A NEW KIOSK SUBMISSION RESPONSE
router.post('/responses', async (req, res) => {
  try {
    const { surveyTitle, answers } = req.body;
    const newResponse = await Response.create({
      surveyTitle,
      answers,
      timestamp: new Date().toLocaleTimeString()
    });
    res.status(201).json({ success: true, response: newResponse });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. GET ALL SUBMITTED RESPONSES
router.get('/responses', async (req, res) => {
  try {
    const responses = await Response.find({}).sort({ createdAt: -1 });
    res.json({ success: true, responses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;