import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  deviceName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  accessPin: {
    type: String,
    default: '1234'
  },
  allowedFormTitle: {
    type: String,
    default: 'All Forms'
  },
  loggedInUser: {
    type: String,
    default: 'Operator'
  },
  status: {
    type: String,
    enum: ['pending', 'paired'],
    default: 'paired'
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);

export default Device;