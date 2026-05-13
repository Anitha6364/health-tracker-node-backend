const express = require('express');
const Metric = require('../models/Metric');
const Goal = require('../models/Goal');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// @GET /api/dashboard/summary — today's summary + weekly trends
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user._id;

    // Date ranges
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const metricTypes = ['steps', 'calories', 'water', 'sleep', 'weight', 'heartRate', 'exercise'];

    // Today's latest value per metric
    const todayPromises = metricTypes.map((type) =>
      Metric.findOne({ user: userId, type, date: { $gte: todayStart, $lte: todayEnd } })
        .sort({ date: -1 })
        .lean()
    );

    // Weekly data (last 7 days per metric)
    const weeklyPromises = metricTypes.map((type) =>
      Metric.find({ user: userId, type, date: { $gte: weekAgo } })
        .sort({ date: 1 })
        .lean()
    );

    // Goals
    const goals = await Goal.find({ user: userId }).lean();

    const [todayResults, weeklyResults] = await Promise.all([
      Promise.all(todayPromises),
      Promise.all(weeklyPromises),
    ]);

    const today = {};
    const weekly = {};

    metricTypes.forEach((type, i) => {
      today[type] = todayResults[i] ? { value: todayResults[i].value, unit: todayResults[i].unit } : null;
      weekly[type] = weeklyResults[i].map((m) => ({
        date: m.date,
        value: m.value,
        unit: m.unit,
      }));
    });

    // Calculate health score (0–100)
    const goalsMap = {};
    goals.forEach((g) => (goalsMap[g.type] = g.target));

    let score = 0;
    let count = 0;
    const scoredTypes = ['steps', 'water', 'sleep', 'exercise'];
    scoredTypes.forEach((type) => {
      if (today[type] && goalsMap[type]) {
        const ratio = Math.min(today[type].value / goalsMap[type], 1);
        score += ratio * 100;
        count++;
      }
    });
    const healthScore = count > 0 ? Math.round(score / count) : 0;

    res.json({
      success: true,
      data: { today, weekly, goals: goalsMap, healthScore },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @GET /api/dashboard/insights — AI-like rule-based health tips
router.get('/insights', async (req, res) => {
  try {
    const userId = req.user._id;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [steps, water, sleep, weight] = await Promise.all([
      Metric.find({ user: userId, type: 'steps', date: { $gte: weekAgo } }).lean(),
      Metric.find({ user: userId, type: 'water', date: { $gte: weekAgo } }).lean(),
      Metric.find({ user: userId, type: 'sleep', date: { $gte: weekAgo } }).lean(),
      Metric.find({ user: userId, type: 'weight', date: { $gte: weekAgo } }).lean(),
    ]);

    const avg = (arr) => arr.length ? arr.reduce((s, m) => s + m.value, 0) / arr.length : null;

    const insights = [];

    const avgSteps = avg(steps);
    if (avgSteps !== null) {
      if (avgSteps < 5000) insights.push({ type: 'warning', icon: '🚶', message: `Your average steps this week is ${Math.round(avgSteps)}. Try to reach at least 7,500 steps daily for better cardiovascular health.` });
      else if (avgSteps >= 10000) insights.push({ type: 'success', icon: '🏆', message: `Excellent! You're averaging ${Math.round(avgSteps)} steps/day. Keep it up!` });
      else insights.push({ type: 'info', icon: '👟', message: `You're averaging ${Math.round(avgSteps)} steps/day. Great progress — push for 10,000!` });
    }

    const avgWater = avg(water);
    if (avgWater !== null) {
      if (avgWater < 1500) insights.push({ type: 'warning', icon: '💧', message: `You're only drinking ${Math.round(avgWater)}ml/day on average. Aim for at least 2000ml to stay hydrated.` });
      else insights.push({ type: 'success', icon: '💧', message: `Good hydration! You're drinking ${Math.round(avgWater)}ml/day on average.` });
    }

    const avgSleep = avg(sleep);
    if (avgSleep !== null) {
      if (avgSleep < 6) insights.push({ type: 'warning', icon: '😴', message: `You're averaging only ${avgSleep.toFixed(1)} hours of sleep. Adults need 7–9 hours for optimal health.` });
      else if (avgSleep >= 7 && avgSleep <= 9) insights.push({ type: 'success', icon: '😴', message: `Great sleep! You're getting ${avgSleep.toFixed(1)} hours on average — right in the optimal range.` });
    }

    if (weight.length >= 2) {
      const latest = weight[weight.length - 1].value;
      const earliest = weight[0].value;
      const diff = latest - earliest;
      if (Math.abs(diff) > 0.5) {
        insights.push({
          type: diff < 0 ? 'success' : 'info',
          icon: '⚖️',
          message: diff < 0
            ? `You've lost ${Math.abs(diff).toFixed(1)}kg this week. Keep maintaining your healthy habits!`
            : `Your weight has increased by ${diff.toFixed(1)}kg this week. Monitor your diet and activity.`,
        });
      }
    }

    if (insights.length === 0) {
      insights.push({ type: 'info', icon: '📊', message: 'Log your health metrics daily to get personalized insights and tips!' });
    }

    res.json({ success: true, data: insights });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
