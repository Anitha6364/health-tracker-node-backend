const express = require('express');
const Metric = require('../models/Metric');
const Goal = require('../models/Goal');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/alerts/predictive
router.get('/predictive', async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const nDaysAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };

    const [goals, stepsLast7, stepsLast14, waterLast7, sleepLast7, hrLast7, exerciseLast7, weightLast14] =
      await Promise.all([
        Goal.find({ user: userId }).lean(),
        Metric.find({ user: userId, type: 'steps',    date: { $gte: nDaysAgo(7)  } }).lean(),
        Metric.find({ user: userId, type: 'steps',    date: { $gte: nDaysAgo(14) } }).lean(),
        Metric.find({ user: userId, type: 'water',    date: { $gte: nDaysAgo(7)  } }).lean(),
        Metric.find({ user: userId, type: 'sleep',    date: { $gte: nDaysAgo(7)  } }).lean(),
        Metric.find({ user: userId, type: 'heartRate',date: { $gte: nDaysAgo(7)  } }).lean(),
        Metric.find({ user: userId, type: 'exercise', date: { $gte: nDaysAgo(7)  } }).lean(),
        Metric.find({ user: userId, type: 'weight',   date: { $gte: nDaysAgo(14) } }).lean(),
      ]);

    const goalsMap = {};
    goals.forEach((g) => (goalsMap[g.type] = g.target));

    const avg = (arr) => arr.length ? arr.reduce((s, m) => s + m.value, 0) / arr.length : null;
    const min = (arr) => arr.length ? Math.min(...arr.map((m) => m.value)) : null;
    const max = (arr) => arr.length ? Math.max(...arr.map((m) => m.value)) : null;

    const alerts = [];

    // ── Declining Activity (consecutive day trend) ─────────────────────────
    if (stepsLast14.length >= 6) {
      const first7 = stepsLast14.filter((m) => new Date(m.date) < nDaysAgo(7));
      const last7  = stepsLast7;
      const avgF7 = avg(first7), avgL7 = avg(last7);
      if (avgF7 && avgL7 && avgL7 < avgF7 * 0.7) {
        alerts.push({
          level: 'warning',
          category: 'Activity',
          icon: '📉',
          title: 'Declining Activity Detected',
          message: `Your step count dropped by ${Math.round(((avgF7 - avgL7) / avgF7) * 100)}% this week vs last week. Risk of losing fitness progress if this continues.`,
          recommendation: 'Try a 15-minute walk today to break the pattern.',
        });
      }
    }

    // ── Overtraining Risk ──────────────────────────────────────────────────
    const stepGoal = goalsMap.steps || 10000;
    const overDays = stepsLast7.filter((m) => m.value > stepGoal * 1.5).length;
    if (overDays >= 5) {
      alerts.push({
        level: 'warning',
        category: 'Recovery',
        icon: '⚠️',
        title: 'Overtraining Risk',
        message: `You exceeded 150% of your step goal for ${overDays} out of 7 days. Your body may need rest.`,
        recommendation: 'Schedule 1–2 light or rest days this week to allow full recovery.',
      });
    }

    // ── Sleep Debt ────────────────────────────────────────────────────────
    const avgSleep = avg(sleepLast7);
    const sleepGoal = goalsMap.sleep || 8;
    if (avgSleep !== null && avgSleep < sleepGoal * 0.8) {
      const debt = ((sleepGoal - avgSleep) * 7).toFixed(1);
      alerts.push({
        level: 'danger',
        category: 'Sleep',
        icon: '😴',
        title: 'Sleep Debt Accumulating',
        message: `You're averaging ${avgSleep.toFixed(1)} hrs vs your ${sleepGoal} hr goal — a weekly deficit of ~${debt} hours.`,
        recommendation: 'Prioritise 30 min earlier bedtime for the next 3 nights to partially recover.',
      });
    }

    // ── Dehydration Risk ──────────────────────────────────────────────────
    const avgWater = avg(waterLast7);
    const waterGoal = goalsMap.water || 2500;
    if (avgWater !== null && avgWater < waterGoal * 0.6) {
      alerts.push({
        level: 'danger',
        category: 'Hydration',
        icon: '💧',
        title: 'Dehydration Risk',
        message: `Averaging only ${Math.round(avgWater)}ml/day — less than 60% of your ${waterGoal}ml target. Chronic under-hydration affects cognition and kidney health.`,
        recommendation: 'Set hourly water reminders and carry a 500ml bottle.',
      });
    }

    // ── Elevated Resting Heart Rate ────────────────────────────────────────
    const avgHR = avg(hrLast7);
    if (avgHR !== null && avgHR > 100) {
      alerts.push({
        level: 'danger',
        category: 'Cardiovascular',
        icon: '❤️',
        title: 'Elevated Heart Rate',
        message: `Your average heart rate this week is ${Math.round(avgHR)} bpm. Resting HR above 100 bpm may indicate overexertion, stress, or dehydration.`,
        recommendation: 'Rest for 24–48 hours and consult a doctor if it persists.',
      });
    } else if (avgHR !== null && avgHR > 85) {
      alerts.push({
        level: 'warning',
        category: 'Cardiovascular',
        icon: '💓',
        title: 'Heart Rate Above Optimal',
        message: `Average HR of ${Math.round(avgHR)} bpm is above the optimal resting range (60–85 bpm). Could indicate elevated stress.`,
        recommendation: 'Try 10 minutes of deep breathing or meditation daily.',
      });
    }

    // ── Missed Exercise Streak ────────────────────────────────────────────
    if (exerciseLast7.length === 0) {
      alerts.push({
        level: 'warning',
        category: 'Activity',
        icon: '🏃',
        title: 'No Exercise Logged This Week',
        message: 'You haven\'t logged any workouts in the past 7 days. Regular exercise is crucial for long-term health.',
        recommendation: 'Start with a 20-minute walk or home workout to rebuild momentum.',
      });
    }

    // ── Positive Alerts ───────────────────────────────────────────────────
    const stepsGoalDays = stepsLast7.filter((m) => m.value >= stepGoal).length;
    if (stepsGoalDays >= 5) {
      alerts.push({
        level: 'success',
        category: 'Achievement',
        icon: '🏆',
        title: 'Step Goal Streak!',
        message: `You hit your step goal ${stepsGoalDays} out of 7 days. Outstanding consistency!`,
        recommendation: 'Consider increasing your step goal by 500 steps to keep challenging yourself.',
      });
    }

    const waterGoalDays = waterLast7.filter((m) => m.value >= waterGoal).length;
    if (waterGoalDays >= 5) {
      alerts.push({
        level: 'success',
        category: 'Hydration',
        icon: '💚',
        title: 'Excellent Hydration Week!',
        message: `You met your water goal ${waterGoalDays}/7 days. Your body will thank you!`,
        recommendation: null,
      });
    }

    // ── Weight Trend ──────────────────────────────────────────────────────
    if (weightLast14.length >= 4) {
      const sorted = [...weightLast14].sort((a, b) => new Date(a.date) - new Date(b.date));
      const older = sorted.slice(0, Math.floor(sorted.length / 2));
      const newer = sorted.slice(Math.floor(sorted.length / 2));
      const avgOld = avg(older), avgNew = avg(newer);
      const change = avgNew - avgOld;
      if (Math.abs(change) >= 1) {
        alerts.push({
          level: change > 0 ? 'warning' : 'success',
          category: 'Weight',
          icon: '⚖️',
          title: change > 0 ? 'Weight Increase Detected' : 'Weight Loss Progress',
          message: `Your weight ${change > 0 ? 'increased' : 'decreased'} by ~${Math.abs(change).toFixed(1)} kg over the past 2 weeks.`,
          recommendation: change > 0 ? 'Review your calorie intake and increase daily activity.' : 'Great progress! Maintain your current diet and exercise routine.',
        });
      }
    }

    if (alerts.length === 0) {
      alerts.push({
        level: 'info',
        category: 'General',
        icon: '📊',
        title: 'Keep Logging!',
        message: 'Log at least 5 days of health data to unlock predictive health alerts and AI analysis.',
        recommendation: 'Track your steps, water intake, sleep, and weight daily for best results.',
      });
    }

    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/alerts/adaptive-goals — suggest goal adjustments
router.get('/adaptive-goals', async (req, res) => {
  try {
    const userId = req.user._id;
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const goals = await Goal.find({ user: userId }).lean();
    const goalsMap = {};
    goals.forEach((g) => (goalsMap[g.type] = g.target));

    const types = ['steps', 'water', 'sleep', 'exercise'];
    const suggestions = [];

    for (const type of types) {
      const metrics = await Metric.find({ user: userId, type, date: { $gte: twoWeeksAgo } }).lean();
      if (metrics.length < 5) continue;

      const avg = metrics.reduce((s, m) => s + m.value, 0) / metrics.length;
      const current = goalsMap[type];
      if (!current) continue;

      const ratio = avg / current;

      if (ratio > 1.15) {
        // Consistently beating goal — suggest increase
        const suggested = Math.round(avg * 1.1);
        suggestions.push({
          type,
          currentGoal: current,
          suggestedGoal: suggested,
          avgActual: Math.round(avg),
          direction: 'increase',
          reason: `You're averaging ${Math.round(avg)} — ${Math.round((ratio - 1) * 100)}% above your current goal. Time to level up!`,
        });
      } else if (ratio < 0.6) {
        // Consistently falling short — suggest more achievable goal
        const suggested = Math.round(avg * 1.15);
        suggestions.push({
          type,
          currentGoal: current,
          suggestedGoal: suggested,
          avgActual: Math.round(avg),
          direction: 'decrease',
          reason: `You're only reaching ${Math.round(ratio * 100)}% of this goal. A more achievable target helps build momentum.`,
        });
      }
    }

    res.json({ success: true, data: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
