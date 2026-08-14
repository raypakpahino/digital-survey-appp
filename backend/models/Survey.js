import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  type: { type: String, required: true },
  questionText: { type: String, required: true },
  questionImage: { type: String, default: '' },
  isRequired: { type: Boolean, default: false },
  allowMultiple: { type: Boolean, default: false },
  enableOptionImages: { type: Boolean, default: false },
  enableOtherOption: { type: Boolean, default: false },
  options: [{ type: String }],
  optionImages: { type: mongoose.Schema.Types.Mixed, default: {} },
  alertTriggerValues: [{ type: String }], 
  skipLogic: {
    enabled: { type: Boolean, default: false },
    dependsOnIndex: { type: Number, default: 0 },
    requiredValue: { type: String, default: '' }
  }
}, { _id: true });

const SurveySchema = new mongoose.Schema({
  title: { type: String, required: true, default: 'Untitled Digital Form Template' },
  appMode: { type: String, enum: ['kiosk', 'qr'], default: 'kiosk' }, 
  assignedSite: { type: String, default: '' }, // Assigned QR site name
  isDraft: { type: Boolean, default: false },
  pinCode: { type: String, default: '1234' },
  questions: [QuestionSchema],
  thankYouMessage: { 
    type: String, 
    default: 'Thank you for your feedback! This screen will automatically refresh in a few seconds.' 
  },
  autoRefreshSeconds: { 
    type: Number, 
    default: 4 
  }
}, { 
  timestamps: true,
  strict: false
});

const Survey = mongoose.models.Survey || mongoose.model('Survey', SurveySchema);

export default Survey;