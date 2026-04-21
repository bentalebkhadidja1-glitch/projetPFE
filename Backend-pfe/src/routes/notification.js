import express from 'express';
import pool from '../db.js'; // pg Pool
import { io } from '../server.js';

const router = express.Router();

// GET /notifications/all
router.get('/all', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /notifications/employee/:employeeId
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE employee_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.params.employeeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /notifications/service/:service  — fetch by service (employees share a service)
router.get('/service/:service', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE service = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.params.service]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /notifications/:uuid/read
router.put('/:uuid/read', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.uuid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    const notif = rows[0];
    if (notif.employee_id) {
      io.to(`employee_${notif.employee_id}`).emit('notification-read', {
        id: notif.id,
        is_read: true
      });
    }

    res.json(notif);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /notifications/employee/:employeeId/read-all
router.put('/employee/:employeeId/read-all', async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, updated_at = NOW()
       WHERE employee_id = $1`,
      [req.params.employeeId]
    );

    io.to(`employee_${req.params.employeeId}`).emit('all-notifications-read', {
      employee_id: req.params.employeeId,
      timestamp: new Date()
    });

    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /notifications
router.post('/', async (req, res) => {
  try {
    const { title, message, type, employee_id, service, link } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({ message: 'title, message et type sont obligatoires' });
    }

    const { rows } = await pool.query(
      `INSERT INTO notifications (title, message, type, employee_id, service, link)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, message, type, employee_id || null, service || null, link || null]
    );

    const notif = rows[0];

    if (notif.employee_id) {
      io.to(`employee_${notif.employee_id}`).emit('new-notification', {
        id:         notif.id,
        title:      notif.title,
        message:    notif.message,
        type:       notif.type,
        service:    notif.service,
        is_read:    notif.is_read,
        created_at: notif.created_at
      });
    }

    res.status(201).json(notif);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /notifications/broadcast — send to multiple employees
router.post('/broadcast', async (req, res) => {
  try {
    const { employee_ids, title, message, type, service } = req.body;

    if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({ message: 'employee_ids (array) est requis' });
    }

    const created = [];

    for (const employee_id of employee_ids) {
      const { rows } = await pool.query(
        `INSERT INTO notifications (title, message, type, employee_id, service)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [title, message, type, employee_id, service || null]
      );
      const notif = rows[0];
      created.push(notif);

      io.to(`employee_${employee_id}`).emit('new-notification', {
        id:         notif.id,
        title:      notif.title,
        message:    notif.message,
        type:       notif.type,
        service:    notif.service,
        created_at: notif.created_at
      });
    }

    res.status(201).json({
      success: true,
      message: `Broadcast envoyé à ${employee_ids.length} employés`,
      notifications: created
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /notifications/:uuid
router.delete('/:uuid', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM notifications WHERE id = $1`,
      [req.params.uuid]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    res.json({ success: true, message: 'Notification supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;