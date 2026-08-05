import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  deviceName: {
    type: String,
    required: true
  },
  pairingCode: {
    type: String,
    unique: true,
    sparse: true
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
  },
  loggedInUser: {
    type: String,
    default: 'Guest'
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);

export default Device;