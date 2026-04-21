import pool from '../db.js'; // pg Pool

// ── Upsert notification by employee_id + type ─────────────────────────────────
// POST body: { employee_id, title, message, type, service?, link? }
export const sendNotificationByEmployee = async (req, res) => {
  try {
    const { employee_id, title, message, type, service, link } = req.body;

    if (!employee_id || !title || !message || !type) {
      return res.status(400).json({
        error: 'employee_id, title, message et type sont obligatoires'
      });
    }

    // Check if a notification of the same type already exists for this employee
    const { rows: existing } = await pool.query(
      `SELECT id FROM notifications
       WHERE employee_id = $1 AND type = $2
       LIMIT 1`,
      [employee_id, type]
    );

    if (existing.length === 0) {
      // Create new
      const { rows } = await pool.query(
        `INSERT INTO notifications (title, message, type, employee_id, service, link)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, message, type, employee_id, service ?? null, link ?? null]
      );

      return res.status(201).json({
        success: true,
        action: 'created',
        message: `Notification créée pour l'employé: ${employee_id}`,
        notification: rows[0]
      });
    }

    // Update existing
    const { rows } = await pool.query(
      `UPDATE notifications
       SET title      = $1,
           message    = $2,
           service    = COALESCE($3, service),
           link       = COALESCE($4, link),
           is_read    = FALSE,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, message, service ?? null, link ?? null, existing[0].id]
    );

    res.status(200).json({
      success: true,
      action: 'updated',
      message: `Notification mise à jour pour l'employé: ${employee_id}`,
      notification: rows[0]
    });

  } catch (error) {
    console.error('Erreur sendNotificationByEmployee:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── GET notifications for one employee ────────────────────────────────────────
// GET /notifications/employee/:employeeId
export const getNotificationsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE employee_id = $1
       ORDER BY created_at DESC`,
      [employeeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: `Aucune notification trouvée pour l'employé: ${employeeId}`
      });
    }

    res.status(200).json(rows);

  } catch (error) {
    console.error('Erreur getNotificationsByEmployee:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── GET all notifications ─────────────────────────────────────────────────────
// GET /notifications
export const getAllNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications ORDER BY created_at DESC`
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error('Erreur getAllNotifications:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── GET notifications by service ──────────────────────────────────────────────
// GET /notifications/service/:service
export const getNotificationsByService = async (req, res) => {
  try {
    const { service } = req.params;

    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE service = $1
       ORDER BY created_at DESC`,
      [service]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Erreur getNotificationsByService:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── Mark one notification as read ─────────────────────────────────────────────
// PUT /notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    res.status(200).json({ success: true, notification: rows[0] });
  } catch (error) {
    console.error('Erreur markAsRead:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── Mark all as read for an employee ─────────────────────────────────────────
// PUT /notifications/employee/:employeeId/read-all
export const markAllReadForEmployee = async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, updated_at = NOW()
       WHERE employee_id = $1`,
      [req.params.employeeId]
    );

    res.status(200).json({
      success: true,
      message: `Toutes les notifications marquées comme lues pour l'employé: ${req.params.employeeId}`
    });
  } catch (error) {
    console.error('Erreur markAllReadForEmployee:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── Delete notification by ID ─────────────────────────────────────────────────
// DELETE /notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM notifications WHERE id = $1`,
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    res.status(200).json({
      success: true,
      message: `Notification ${req.params.id} supprimée`
    });
  } catch (error) {
    console.error('Erreur deleteNotification:', error);
    res.status(500).json({ error: error.message });
  }
};