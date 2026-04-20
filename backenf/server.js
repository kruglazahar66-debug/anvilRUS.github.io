const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const JWT_SECRET = 'anvil_super_secret_key';

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  // Таблица пользователей
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    isAdmin INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    datetime TEXT,
    url TEXT,           -- ссылка для вставки iframe (YouTube, Twitch, VK)
    predictionTeamA INTEGER DEFAULT 0,
    predictionTeamB INTEGER DEFAULT 0
  )`);

  const adminPass = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, password, isAdmin) VALUES (?, ?, 1)`, ['admin', adminPass]);
});

// ---------- MIDDLEWARE AUTH ----------
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  jwt.verify(token.split(' ')[1], JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Неверный токен' });
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Требуются права админа' });
  next();
}

// ---------- AUTH ROUTES ----------
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Все поля обязательны' });
  const hashed = bcrypt.hashSync(password, 10);
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashed], function(err) {
    if (err) return res.status(400).json({ error: 'Пользователь уже существует' });
    res.json({ message: 'Регистрация успешна' });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Неверные данные' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET);
    res.json({ token, isAdmin: user.isAdmin });
  });
});

// ---------- EVENTS (РАСПИСАНИЕ И ССЫЛКИ) ----------
app.get('/api/events', (req, res) => {
  db.all(`SELECT * FROM events ORDER BY datetime ASC`, (err, rows) => {
    res.json(rows);
  });
});

// Админские маршруты (CRUD)
app.post('/api/admin/events', verifyToken, isAdmin, (req, res) => {
  const { title, datetime, url } = req.body;
  db.run(`INSERT INTO events (title, datetime, url) VALUES (?, ?, ?)`, [title, datetime, url], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.put('/api/admin/events/:id', verifyToken, isAdmin, (req, res) => {
  const { title, datetime, url } = req.body;
  db.run(`UPDATE events SET title=?, datetime=?, url=? WHERE id=?`, [title, datetime, url, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: true });
  });
});

app.delete('/api/admin/events/:id', verifyToken, isAdmin, (req, res) => {
  db.run(`DELETE FROM events WHERE id=?`, [req.params.id], (err) => {
    res.json({ deleted: true });
  });
});

app.post('/api/events/:id/predict', verifyToken, (req, res) => {
  const { choice } = req.body; // 'A' или 'B'
  if (choice === 'A') {
    db.run(`UPDATE events SET predictionTeamA = predictionTeamA + 1 WHERE id = ?`, [req.params.id]);
  } else if (choice === 'B') {
    db.run(`UPDATE events SET predictionTeamB = predictionTeamB + 1 WHERE id = ?`, [req.params.id]);
  }
  res.json({ success: true });
});

app.listen(5000, () => console.log('🚀 ANVIL сервер запущен на http://localhost:5000'));