import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  deviceName: {
    type: String,
    required: true
  },
  pairingCode: {
    type: String,
    unique: true,
    sparse: true // Allows it to be null once paired
  },
  status: {
    type: String,
    enum: ['pending', 'paired'],
    default: 'pending'
  },
  pairedSurveyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey',
    default: null
  }
}, { timestamps: true });

export default mongoose.model('Device', deviceSchema);