const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('kospay.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inisialisasi Database SQLite
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_by TEXT NOT NULL,
      status TEXT DEFAULT 'Belum Lunas'
    )
  `);

  // Seed data awal jika kosong
  db.get('SELECT COUNT(*) as count FROM members', (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO members (name) VALUES (?)');
      ['Andi', 'Budi', 'Citra', 'Deni'].forEach(m => stmt.run(m));
      stmt.finalize();
    }
  });
});

// API Endpoints
app.get('/api/members', (req, res) => {
  db.all('SELECT * FROM members', [], (err, rows) => {
    res.json(rows || []);
  });
});

app.get('/api/bills', (req, res) => {
  db.all('SELECT * FROM bills', [], (err, bills) => {
    db.all('SELECT * FROM members', [], (err, members) => {
      db.get('SELECT SUM(amount) as total FROM bills', [], (err, totalRow) => {
        const totalAmount = (totalRow && totalRow.total) ? totalRow.total : 0;
        const memberCount = members ? members.length : 1;
        const perPerson = memberCount > 0 ? (totalAmount / memberCount) : 0;
        
        res.json({ bills: bills || [], totalAmount, perPerson, memberCount });
      });
    });
  });
});

app.post('/api/bills', (req, res) => {
  const { title, amount, paid_by } = req.body;
  if (!title || !amount || !paid_by) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }
  const stmt = db.prepare('INSERT INTO bills (title, amount, paid_by) VALUES (?, ?, ?)');
  stmt.run([title, amount, paid_by], function(err) {
    res.json({ success: true, id: this.lastID });
  });
  stmt.finalize();
});

app.post('/api/bills/status', (req, res) => {
  const { id, status } = req.body;
  const stmt = db.prepare('UPDATE bills SET status = ? WHERE id = ?');
  stmt.run([status, id], function(err) {
    res.json({ success: true });
  });
  stmt.finalize();
});

app.listen(3000, () => {
  console.log('🚀 Server KosPay berjalan di http://localhost:3000');
});
module.exports = app;
