const express = require('express');
const Mood = require('../models/Mood');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/mood?limit=30
router.get('/', async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const entries = await Mood.find({ user: req.user._id }).sort({ date: -1 }).limit(Number(limit));
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/mood
router.post('/', async (req, res) => {
  try {
    const { emotion, score, energy, note, tags, date } = req.body;
    const entry = await Mood.create({
      user: req.user._id,
      emotion, score: Number(score), energy: Number(energy) || 5,
      note: note || '', tags: tags || [],
      date: date ? new Date(date) : new Date(),
    });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/mood/:id
router.delete('/:id', async (req, res) => {
  try {
    await Mood.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/mood/trend — weekly mood scores
router.get('/trend', async (req, res) => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 14);
    const entries = await Mood.find({ user: req.user._id, date: { $gte: weekAgo } }).sort({ date: 1 });
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
