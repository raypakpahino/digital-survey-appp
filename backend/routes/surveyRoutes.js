import express from 'express';
import Survey from '../models/Survey.js'; 
import Response from '../models/Response.js'; 

const router = express.Router();

// 1. GET ALL SURVEYS
router.get('/surveys', async (req, res) => {
  try {
    const surveys = await Survey.find({});
    res.json({ success: true, surveys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. CREATE A NEW SURVEY
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

// 4. DELETE A SURVEY AND ALL ITS ASSOCIATED SUBMISSIONS
router.delete('/surveys/:id', async (req, res) => {
  try {
    const surveyToDelete = await Survey.findById(req.params.id);
    if (surveyToDelete) {
      await Response.deleteMany({ surveyTitle: surveyToDelete.title });
      await Survey.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true, message: 'Survey and linked responses deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. POST A NEW KIOSK RESPONSE
router.post('/responses', async (req, res) => {
  try {
    const { surveyTitle, answers } = req.body;
    const newResponse = await Response.create({
      surveyTitle,
      answers,
      timestamp: new Date()
    });
    res.status(201).json({ success: true, response: newResponse });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. GET ALL SUBMITTED RESPONSES
router.get('/responses', async (req, res) => {
  try {
    const responses = await Response.find({}).sort({ timestamp: -1 });
    res.json({ success: true, responses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. POST ROUTE TO CLEAR ALL RESPONSES FOR A SPECIFIC FORM TITLE
router.post('/responses/clear-by-title', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ success: false, message: "Title parameter required." });
    
    const result = await Response.deleteMany({ surveyTitle: title });
    res.json({ success: true, message: `Purged ${result.deletedCount} submissions for "${title}".`, count: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. DELETE A SINGLE SPECIFIC RESPONSE BY ID
router.delete('/responses/:id', async (req, res) => {
  try {
    await Response.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Response record purged.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;