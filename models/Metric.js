const mongoose = require('mongoose');

const METRIC_TYPES = ['steps', 'calories', 'water', 'sleep', 'weight', 'heartRate', 'exercise'];

const metricSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: METRIC_TYPES,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      maxlength: 200,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient querying by user + type + date
metricSchema.index({ user: 1, type: 1, date: -1 });

module.exports = mongoose.model('Metric', metricSchema);
module.exports.METRIC_TYPES = METRIC_TYPES;
