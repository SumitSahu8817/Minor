require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const plannerRoutes = require('./routes/planner');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/planner', plannerRoutes);

app.get('/api/get-ai-key', (req, res) => {
    res.json({ key: process.env.GROQ_API_KEY });
});

// ─── Frontend Pages (SPA fallback) ──────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/dashboard.html')));
app.get('/attendance', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/attendance.html')));
app.get('/planner', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/planner.html')));

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n✅  Faculty Portal running at http://localhost:${PORT}`);
  console.log(`📂  Database: SQLite (data/faculty.db)\n`);
});