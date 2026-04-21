import express from 'express';
import pool from '../db.js'; // pg Pool

const router = express.Router();

const MUNICIPAL_AGENT_CREDENTIALS = {
  email: 'municipal_agent@gmail.com',
  password: 'municipalagent123',
  id: '00000000-0000-0000-0000-000000000001'
};

// POST /admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (cleanEmail !== MUNICIPAL_AGENT_CREDENTIALS.email) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }
    if (cleanPassword !== MUNICIPAL_AGENT_CREDENTIALS.password) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    console.log('Municipal_Agent connecté');
    res.json({
      message: 'Connexion Municipal_Agent réussie',
      user: {
        id: MUNICIPAL_AGENT_CREDENTIALS.id,
        email: MUNICIPAL_AGENT_CREDENTIALS.email,
        firstName: 'Municipal_Agent',
        lastName: '',
        name: 'Municipal_Agent',
        role: 'municipal_agent',
        service: 'Administration Système',
        position: 'Administrateur Système',
        phone: '',
        joinDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erreur login Municipal_Agent:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /admin/employees — list all employees
router.get('/employees', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name, role, service, position,
              phone, join_date, status, created_at, updated_at
       FROM employees
       ORDER BY created_at DESC`
    );
    console.log(`Municipal_Agent: ${rows.length} employés trouvés`);
    res.json({ count: rows.length, employees: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /admin/employees/:id
router.get('/employees/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name, role, service, position,
              phone, join_date, status, created_at, updated_at
       FROM employees
       WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /admin/all-requests
router.get('/all-requests', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM requests ORDER BY created_at DESC`
    );
    console.log(`Municipal_Agent: ${rows.length} demandes trouvées`);
    res.json({ count: rows.length, requests: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /admin/requests/:id
router.get('/requests/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM requests WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /admin/stats
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)                                         AS total,
         COUNT(*) FILTER (WHERE status = 'pending')      AS pending,
         COUNT(*) FILTER (WHERE status = 'in_progress')  AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')    AS completed,
         COUNT(*) FILTER (WHERE status = 'rejected')     AS rejected
       FROM requests`
    );
    const stats = rows[0];
    console.log('Statistiques Municipal_Agent:', stats);
    res.json({
      total:       parseInt(stats.total),
      pending:     parseInt(stats.pending),
      in_progress: parseInt(stats.in_progress),
      completed:   parseInt(stats.completed),
      rejected:    parseInt(stats.rejected)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /admin/requests/:id/status
router.put('/requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    const { rows } = await pool.query(
      `UPDATE requests
       SET status = $1,
           comment = COALESCE($2, comment),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, comment || null, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }
    res.json({ message: 'Statut mis à jour avec succès', request: rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /admin/requests/:id
router.delete('/requests/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM requests WHERE id = $1`,
      [req.params.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }
    res.json({ message: 'Demande supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;