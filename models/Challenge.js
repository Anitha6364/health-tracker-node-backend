const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 400 },
    type:        { type: String, enum: ['steps', 'water', 'sleep', 'calories', 'exercise', 'weight'], required: true },
    target:      { type: Number, required: true },
    unit:        { type: String, required: true },
    duration:    { type: Number, default: 7 }, // days
    startDate:   { type: Date, default: Date.now },
    endDate:     { type: Date },
    icon:        { type: String, default: '🏆' },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    participants: [{
      user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      progress: { type: Number, default: 0 },
      joinedAt: { type: Date, default: Date.now },
    }],
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Challenge', challengeSchema);
