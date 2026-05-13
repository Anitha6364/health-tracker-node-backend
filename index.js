const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes      = require('./routes/auth');
const metricsRoutes   = require('./routes/metrics');
const dashboardRoutes = require('./routes/dashboard');
const goalsRoutes     = require('./routes/goals');
const nutritionRoutes = require('./routes/nutrition');
const moodRoutes      = require('./routes/mood');
const routesRoutes    = require('./routes/routes');
const socialRoutes    = require('./routes/social');
const exportRoutes    = require('./routes/export');
const alertsRoutes    = require('./routes/alerts');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests, please try again later.',
});
app.use('/api/', limiter);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/metrics',    metricsRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/goals',      goalsRoutes);
app.use('/api/nutrition',  nutritionRoutes);
app.use('/api/mood',       moodRoutes);
app.use('/api/gps',        routesRoutes);
app.use('/api/social',     socialRoutes);
app.use('/api/export',     exportRoutes);
app.use('/api/alerts',     alertsRoutes);

app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', timestamp: new Date().toISOString(), version: '2.0.0' })
);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server v2.0 running on port ${PORT}`));
  })
  .catch((err) => { console.error('❌ DB error:', err.message); process.exit(1); });
