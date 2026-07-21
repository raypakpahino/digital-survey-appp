import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'smiley', 'stars', 'multiple-choice', 'text'
  questionText: { type: String, required: true },
  isRequired: { type: Boolean, default: false },
  allowMultiple: { type: Boolean, default: false },
  enableOptionImages: { type: Boolean, default: false },
  options: [{ type: String }], // Array populated for multiple-choice nodes
  optionImages: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: true });

const SurveySchema = new mongoose.Schema({
  title: { type: String, required: true, default: 'Untitled Digital Form Template' },
  isDraft: { type: Boolean, default: false },
  questions: [QuestionSchema]
}, { 
  timestamps: true,
  strict: false
});

export default mongoose.model('Survey', SurveySchema);