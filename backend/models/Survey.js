import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  type: { type: String, required: true },
  questionText: { type: String, required: true },
  questionImage: { type: String, default: '' },
  isRequired: { type: Boolean, default: false },
  allowMultiple: { type: Boolean, default: false },
  enableOptionImages: { type: Boolean, default: false },
  options: [{ type: String }],
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

// Guard against model re-compilation in Node ESM
const Survey = mongoose.models.Survey || mongoose.model('Survey', SurveySchema);

export default Survey;