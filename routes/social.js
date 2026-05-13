const express = require('express');
const Challenge = require('../models/Challenge');
const Metric = require('../models/Metric');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Seed default challenges if none exist
const seedChallenges = async () => {
  const count = await Challenge.countDocuments();
  if (count > 0) return;
  await Challenge.insertMany([
    { title: '10K Steps Daily', description: 'Walk 10,000 steps every day for a week!', type: 'steps', target: 10000, unit: 'steps', duration: 7, icon: '🚶' },
    { title: 'Hydration Hero', description: 'Drink 2.5L of water every day for 7 days.', type: 'water', target: 2500, unit: 'ml', duration: 7, icon: '💧' },
    { title: 'Sleep Champion', description: 'Get 8 hours of sleep each night for 5 days.', type: 'sleep', target: 8, unit: 'hours', duration: 5, icon: '😴' },
    { title: '30-Min Workout', description: 'Exercise for at least 30 minutes each day.', type: 'exercise', target: 30, unit: 'minutes', duration: 7, icon: '🏃' },
    { title: 'Calorie Control', description: 'Stay under 2000 kcal for 5 consecutive days.', type: 'calories', target: 2000, unit: 'kcal', duration: 5, icon: '🔥' },
  ]);
};

// GET /api/social/challenges
router.get('/challenges', async (req, res) => {
  try {
    await seedChallenges();
    const now = new Date();
    const challenges = await Challenge.find({ isPublic: true })
      .populate('participants.user', 'name')
      .sort({ createdAt: -1 });

    const enriched = challenges.map((c) => {
      const myEntry = c.participants.find((p) => p.user?._id?.toString() === req.user._id.toString());
      return {
        _id: c._id,
        title: c.title,
        description: c.description,
        type: c.type,
        target: c.target,
        unit: c.unit,
        duration: c.duration,
        icon: c.icon,
        participantCount: c.participants.length,
        joined: !!myEntry,
        myProgress: myEntry?.progress || 0,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/social/challenges/:id/join
router.post('/challenges/:id/join', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found' });

    const alreadyJoined = challenge.participants.some(
      (p) => p.user?.toString() === req.user._id.toString()
    );
    if (alreadyJoined) {
      return res.json({ success: true, message: 'Already joined' });
    }

    challenge.participants.push({ user: req.user._id, progress: 0 });
    await challenge.save();
    res.json({ success: true, message: 'Joined challenge!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/social/leaderboard/:challengeId
router.get('/leaderboard/:challengeId', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.challengeId)
      .populate('participants.user', 'name email');

    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found' });

    // Compute real progress from metrics for each participant
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - (challenge.duration || 7));

    const leaderboard = await Promise.all(
      challenge.participants.map(async (p) => {
        if (!p.user) return null;
        const metrics = await Metric.find({
          user: p.user._id,
          type: challenge.type,
          date: { $gte: weekAgo },
        });
        const total = metrics.reduce((s, m) => s + m.value, 0);
        return {
          userId: p.user._id,
          name: p.user.name,
          progress: Math.round(total),
          percentage: Math.min(Math.round((total / (challenge.target * challenge.duration)) * 100), 100),
        };
      })
    );

    const sorted = leaderboard
      .filter(Boolean)
      .sort((a, b) => b.progress - a.progress)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));

    res.json({ success: true, data: sorted, challenge: { title: challenge.title, target: challenge.target, unit: challenge.unit, type: challenge.type } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/social/my-challenges
router.get('/my-challenges', async (req, res) => {
  try {
    const challenges = await Challenge.find({
      'participants.user': req.user._id,
    });

    const result = challenges.map((c) => {
      const me = c.participants.find((p) => p.user?.toString() === req.user._id.toString());
      return { _id: c._id, title: c.title, icon: c.icon, type: c.type, target: c.target, unit: c.unit, duration: c.duration, myProgress: me?.progress || 0 };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
