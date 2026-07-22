import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  value: { type: String, required: true }
});

const ResponseSchema = new mongoose.Schema({
  surveyTitle: { type: String, required: true },
  deviceId: { type: String, default: 'Tablet-Unassigned' },
  timestamp: { type: String, required: true },
  answers: [AnswerSchema]
}, { timestamps: true });

const Response = mongoose.models.Response || mongoose.model('Response', ResponseSchema);

export default Response;