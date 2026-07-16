import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  value: { type: String, required: true }
});

const ResponseSchema = new mongoose.Schema({
  surveyTitle: { type: String, required: true },
  timestamp: { type: String, required: true },
  answers: [AnswerSchema]
}, { timestamps: true });

export default mongoose.model('Response', ResponseSchema);