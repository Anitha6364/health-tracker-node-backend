const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema(
  {
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    emotion:   { type: String, enum: ['great', 'good', 'okay', 'bad', 'terrible'], required: true },
    score:     { type: Number, min: 1, max: 10, required: true }, // 1=very stressed, 10=very calm
    energy:    { type: Number, min: 1, max: 10, default: 5 },    // 1=exhausted, 10=energised
    note:      { type: String, maxlength: 300, default: '' },
    tags:      [{ type: String, enum: ['work','exercise','diet','sleep','social','health','weather','other'] }],
    date:      { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

moodSchema.index({ user: 1, date: -1 });
module.exports = mongoose.model('Mood', moodSchema);
