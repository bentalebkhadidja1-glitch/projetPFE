import express from 'express';
import pool from '../db.js'; // pg Pool
import { emailService, initializeEmail } from './emailServices.js';
import { PDFService } from './pdfservice.js';
import bcrypt from 'bcrypt';

const router = express.Router();
let emailInitialized = false;

// ── POST /requests/submit ─────────────────────────────────────────────────────
router.post('/submit', async (req, res) => {
  try {
    if (!emailInitialized) {
      await initializeEmail();
      emailInitialized = true;
    }

    const { citizenData, subject, description, serviceType } = req.body;
    // citizenData: { firstName, lastName, email, nin, phone, address }

    // Find the employee whose `service` matches the requested serviceType
    const { rows: empRows } = await pool.query(
      `SELECT id, first_name, last_name, email, service, position
       FROM employees
       WHERE status = 'active'
         AND LOWER(service) LIKE LOWER($1)
       LIMIT 1`,
      [`%${serviceType}%`]
    );

    if (empRows.length === 0) {
      return res.status(400).json({ message: `Aucun employé disponible pour le service: ${serviceType}` });
    }

    const emp = empRows[0];
    const empFullName = `${emp.first_name} ${emp.last_name}`;

    const { rows } = await pool.query(
      `INSERT INTO requests
         (citizen_first_name, citizen_last_name, citizen_email, citizen_nin,
          citizen_phone, citizen_address,
          subject, description,
          assigned_to, assigned_employee_name,
          status, document_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'pending')
       RETURNING *`,
      [
        citizenData.firstName,
        citizenData.lastName,
        citizenData.email,
        citizenData.nin,
        citizenData.phone    ?? null,
        citizenData.address  ?? null,
        subject,
        description,
        emp.id,
        empFullName
      ]
    );

    const newRequest = rows[0];
    console.log('Demande enregistrée:', newRequest.id);

    try {
      await emailService.sendEmployeeNotification(
        emp.email, empFullName,
        `${citizenData.firstName} ${citizenData.lastName}`,
        subject, serviceType
      );
    } catch (emailError) {
      console.error('Email failed:', emailError.message);
    }

    res.status(201).json({
      message: 'Demande soumise avec succès',
      requestId: newRequest.id,
      assignedTo: {
        id:       emp.id,
        name:     empFullName,
        position: emp.position,
        service:  emp.service
      }
    });
  } catch (error) {
    console.error('Erreur submit:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── POST /requests/login (employee login) ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const { rows } = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name,
              role, service, position, phone, status
       FROM employees
       WHERE email = $1`,
      [email.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const emp = rows[0];
    if (emp.status !== 'active') {
      return res.status(403).json({ message: 'Compte inactif' });
    }

    const match = await bcrypt.compare(password, emp.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    console.log(`Connexion employé: ${emp.first_name} ${emp.last_name} (${emp.position})`);

    res.json({
      message: 'Connexion réussie',
      employee: {
        id:        emp.id,
        email:     emp.email,
        firstName: emp.first_name,
        lastName:  emp.last_name,
        role:      emp.role,
        service:   emp.service,
        position:  emp.position
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /requests/my-requests/:employeeId ─────────────────────────────────────
router.get('/my-requests/:employeeId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM requests
       WHERE assigned_to = $1
       ORDER BY created_at DESC`,
      [req.params.employeeId]
    );
    res.json({ count: rows.length, requests: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /requests/all-requests ────────────────────────────────────────────────
router.get('/all-requests', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM requests ORDER BY created_at DESC`
    );
    res.json({ count: rows.length, requests: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /requests/status/:status ──────────────────────────────────────────────
router.get('/status/:status', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM requests WHERE status = $1 ORDER BY created_at DESC`,
      [req.params.status]
    );
    res.json({ count: rows.length, requests: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /requests/:requestId ──────────────────────────────────────────────────
router.get('/:requestId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM requests WHERE id = $1`,
      [req.params.requestId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PUT /requests/:requestId/validate-with-pdf ────────────────────────────────
router.put('/:requestId/validate-with-pdf', async (req, res) => {
  try {
    const { status, document_status, comment, employee_id } = req.body;

    // Fetch request
    const { rows: reqRows } = await pool.query(
      `SELECT * FROM requests WHERE id = $1`,
      [req.params.requestId]
    );
    if (reqRows.length === 0) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }
    const request = reqRows[0];

    // Fetch employee
    let emp = null;
    if (employee_id) {
      const { rows: empRows } = await pool.query(
        `SELECT id, first_name, last_name, email, service, position
         FROM employees WHERE id = $1`,
        [employee_id]
      );
      emp = empRows[0] ?? null;
    }

    // Update request
    const { rows: updated } = await pool.query(
      `UPDATE requests
       SET status          = $1,
           document_status = COALESCE($2, document_status),
           comment         = COALESCE($3, comment),
           assigned_by     = COALESCE($4, assigned_by),
           updated_at      = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        status,
        document_status ?? null,
        comment         ?? null,
        employee_id     ?? null,
        req.params.requestId
      ]
    );
    const updatedRequest = updated[0];

    console.log('Validation demande:', updatedRequest.id, '| Statut:', status);

    // Generate PDF (pass the flat row directly)
    let pdfBuffer = null;
    try {
      pdfBuffer = await PDFService.generateCitizenPDF(updatedRequest);
      console.log('PDF généré:', pdfBuffer.length, 'bytes');
    } catch (pdfError) {
      console.error('PDF Error:', pdfError.message);
    }

    // Send email
    let emailSent = false;
    if ((status === 'completed' || status === 'rejected') && pdfBuffer && updatedRequest.citizen_email) {
      try {
        await emailService.sendValidationEmailWithPDF(
          updatedRequest.citizen_email,
          updatedRequest.citizen_first_name,
          updatedRequest.subject,
          status,
          emp ? `${emp.first_name} ${emp.last_name}` : 'Service municipal',
          comment,
          pdfBuffer
        );
        emailSent = true;
        console.log('Email envoyé');
      } catch (emailError) {
        console.error('Email Error:', emailError.message);
      }
    }

    res.json({
      message: 'Demande traitée',
      request: updatedRequest,
      pdfGenerated: !!pdfBuffer,
      emailSent
    });
  } catch (error) {
    console.error('Erreur validation:', error);
    res.status(500).json({ message: error.message });
  }
});

// ── GET /requests/:requestId/download-pdf ─────────────────────────────────────
router.get('/:requestId/download-pdf', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM requests WHERE id = $1`,
      [req.params.requestId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    const pdfBuffer = await PDFService.generateCitizenPDF(rows[0]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=demande-${rows[0].id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PUT /requests/:requestId/status ───────────────────────────────────────────
router.put('/:requestId/status', async (req, res) => {
  try {
    const { status, comment } = req.body;
    const { rows } = await pool.query(
      `UPDATE requests
       SET status     = $1,
           comment    = COALESCE($2, comment),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, comment ?? null, req.params.requestId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }
    res.json({ message: 'Statut mis à jour', request: rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── DELETE /requests/:requestId ───────────────────────────────────────────────
router.delete('/:requestId', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM requests WHERE id = $1`,
      [req.params.requestId]
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