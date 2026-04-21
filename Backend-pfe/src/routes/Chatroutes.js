import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/chat/history/:citizenId — load full conversation
router.get('/history/:citizenId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, citizen_id, from_role, message, is_read, created_at
       FROM chat_messages
       WHERE citizen_id = $1
       ORDER BY created_at ASC`,
      [req.params.citizenId]
    );
    res.json({ success: true, messages: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/unread/:citizenId — unread count for agent
router.get('/unread/:citizenId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS unread
       FROM chat_messages
       WHERE citizen_id = $1
         AND from_role  = 'citizen'
         AND is_read    = FALSE`,
      [req.params.citizenId]
    );
    res.json({ unread: parseInt(rows[0].unread) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/conversations — all conversations for agent (latest message per citizen)
router.get('/conversations', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (cm.citizen_id)
         cm.citizen_id,
         u.nom,
         u.prenom,
         u.email,
         cm.message        AS last_message,
         cm.from_role      AS last_from,
         cm.created_at     AS last_at,
         COUNT(*) FILTER (WHERE cm2.is_read = FALSE AND cm2.from_role = 'citizen')
           OVER (PARTITION BY cm.citizen_id) AS unread_count
       FROM chat_messages cm
       JOIN users u ON u.id = cm.citizen_id
       LEFT JOIN chat_messages cm2 ON cm2.citizen_id = cm.citizen_id
       ORDER BY cm.citizen_id, cm.created_at DESC`,
    );
    res.json({ success: true, conversations: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/chat/read/:citizenId — mark all citizen messages as read
router.put('/read/:citizenId', async (req, res) => {
  try {
    await pool.query(
      `UPDATE chat_messages
       SET is_read = TRUE
       WHERE citizen_id = $1 AND from_role = 'citizen'`,
      [req.params.citizenId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;