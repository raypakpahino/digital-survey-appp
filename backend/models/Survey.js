import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'smiley', 'stars', 'multiple-choice', 'text'
  questionText: { type: String, required: true },
  isRequired: { type: Boolean, default: false },
  options: [{ type: String }] // Array populated for radio multiple-choice nodes
});

const SurveySchema = new mongoose.Schema({
  title: { type: String, required: true, default: 'Untitled Digital Form Template' },
  questions: [QuestionSchema]
}, { timestamps: true });

export default mongoose.model('Survey', SurveySchema);