const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['steps', 'calories', 'water', 'sleep', 'weight', 'heartRate', 'exercise'],
      required: true,
    },
    target: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// One goal per type per user
goalSchema.index({ user: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Goal', goalSchema);
