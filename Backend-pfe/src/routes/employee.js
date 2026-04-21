import express from 'express';
import pool from '../db.js'; // pg Pool

const router = express.Router();

// GET /employees/position/:position
router.get('/position/:position', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name, role, service, position,
              phone, join_date, status, created_at, updated_at
       FROM employees
       WHERE position = $1
       LIMIT 1`,
      [req.params.position]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /employees/:id
router.get('/:id', async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /employees
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name, role, service, position,
              phone, join_date, status, created_at, updated_at
       FROM employees
       WHERE status = 'active'
       ORDER BY first_name`
    );
    res.json({ count: rows.length, employees: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;