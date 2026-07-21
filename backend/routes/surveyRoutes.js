import express from 'express';
import Survey from '../models/Survey.js';

const router = express.Router();

router.get('/surveys', async (req, res) => {
  try {
    const surveys = await Survey.find().sort({ createdAt: -1 });
    res.json({ success: true, surveys });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/surveys', async (req, res) => {
  try {
    const { title, questions } = req.body;
    const cleanQuestions = (questions || []).map((q) => ({
      type: q.type,
      questionText: q.questionText,
      questionImage: q.questionImage || '',
      isRequired: Boolean(q.isRequired),
      allowMultiple: Boolean(q.allowMultiple),
      enableOptionImages: Boolean(q.enableOptionImages),
      options: Array.isArray(q.options) ? q.options : [],
      optionImages: q.optionImages || {}
    }));

    const newSurvey = new Survey({ title, questions: cleanQuestions });
    const savedSurvey = await newSurvey.save();
    res.status(201).json({ success: true, survey: savedSurvey });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/surveys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, questions } = req.body;

    const cleanQuestions = (questions || []).map((q) => ({
      _id: q._id,
      type: String(q.type || 'smiley'),
      questionText: String(q.questionText || ''),
      questionImage: String(q.questionImage || ''),
      isRequired: Boolean(q.isRequired),
      allowMultiple: Boolean(q.allowMultiple),
      enableOptionImages: Boolean(q.enableOptionImages),
      options: Array.isArray(q.options) ? q.options : [],
      optionImages: q.optionImages && typeof q.optionImages === 'object' ? q.optionImages : {}
    }));

    const updatedSurvey = await Survey.findByIdAndUpdate(
      id,
      { $set: { title: title || 'Untitled Form', questions: cleanQuestions } },
      { new: true, runValidators: false, strict: false }
    );

    if (!updatedSurvey) {
      return res.status(404).json({ success: false, message: 'Survey schema not found' });
    }

    res.json({ success: true, survey: updatedSurvey });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/surveys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Survey.findByIdAndDelete(id);
    res.json({ success: true, message: 'Survey deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;