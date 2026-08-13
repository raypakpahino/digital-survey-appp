import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  value: { type: String, required: true }
});

const ResponseSchema = new mongoose.Schema({
  surveyTitle: { type: String, required: true },
  deviceId: { type: String, default: 'Tablet-Unassigned' },
  appMode: { type: String, enum: ['kiosk', 'qr'], default: 'kiosk' }, // Added appMode field
  timestamp: { type: String, required: true },
  answers: [AnswerSchema]
}, { 
  timestamps: true,
  strict: false 
});

const Response = mongoose.models.Response || mongoose.model('Response', ResponseSchema);

export default Response;