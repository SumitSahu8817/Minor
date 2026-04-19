const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered.' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email.toLowerCase(), hashed);

  const token = jwt.sign(
    { id: result.lastInsertRowid, email: email.toLowerCase(), name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.status(201).json({ success: true, message: 'Registered successfully!', token, user: { id: result.lastInsertRowid, name, email } });
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ success: true, message: 'Login successful!', token, user: { id: user.id, name: user.name, email: user.email } });
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out.' });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, user });
});

module.exports = router;