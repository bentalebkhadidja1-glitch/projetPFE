import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../db.js'; // pg Pool

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ── Multer config ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/demandes');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── POST /demandes/extrait-naissance ──────────────────────────────────────────
router.post('/extrait-naissance', async (req, res) => {
  try {
    const {
      user_id, nom, prenom, nin,
      wilaya_naissance, commune,
      date_naissance, date_demande
    } = req.body;

    if (!user_id || !wilaya_naissance || !commune || !date_naissance) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants: user_id, wilaya_naissance, commune, date_naissance'
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO demandes
         (user_id, type_document, nom, prenom, nin,
          wilaya_naissance, commune, date_naissance, date_demande, status)
       VALUES ($1, 'extrait_naissance', $2, $3, $4, $5, $6, $7, $8, 'en_attente')
       RETURNING id`,
      [
        user_id, nom, prenom, nin,
        wilaya_naissance, commune,
        date_naissance,
        date_demande || new Date()
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Demande extrait de naissance créée avec succès',
      demandeId: rows[0].id
    });
  } catch (error) {
    console.error('Erreur extrait-naissance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /demandes/certificat-residence ──────────────────────────────────────
router.post(
  '/certificat-residence',
  upload.fields([
    { name: 'photo_cni', maxCount: 1 },
    { name: 'photo_domicile', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { user_id, nom, prenom, nin, date_demande } = req.body;

      if (!user_id || !nom || !prenom || !nin) {
        return res.status(400).json({
          success: false,
          message: 'Champs obligatoires manquants: user_id, nom, prenom, nin'
        });
      }
      if (!req.files?.photo_cni || !req.files?.photo_domicile) {
        return res.status(400).json({
          success: false,
          message: 'Les deux photos sont obligatoires (photo_cni et photo_domicile)'
        });
      }

      const photoCniPath      = req.files.photo_cni[0].path;
      const photoDomicilePath = req.files.photo_domicile[0].path;

      const { rows } = await pool.query(
        `INSERT INTO demandes
           (user_id, type_document, nom, prenom, nin,
            photo_cni_path, photo_domicile_path, date_demande, status)
         VALUES ($1, 'certificat_residence', $2, $3, $4, $5, $6, $7, 'en_attente')
         RETURNING id`,
        [user_id, nom, prenom, nin, photoCniPath, photoDomicilePath, date_demande || new Date()]
      );

      res.status(201).json({
        success: true,
        message: 'Demande certificat de résidence envoyée avec succès',
        demandeId: rows[0].id
      });
    } catch (error) {
      console.error('Erreur certificat-residence:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── POST /demandes/autorisation-voirie ────────────────────────────────────────
router.post(
  '/autorisation-voirie',
  upload.fields([
    { name: 'photo_cni', maxCount: 1 },
    { name: 'photo_domicile', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { user_id, nom, prenom, nin, date_demande } = req.body;

      if (!user_id || !nom || !prenom || !nin) {
        return res.status(400).json({
          success: false,
          message: 'Champs obligatoires manquants: user_id, nom, prenom, nin'
        });
      }
      if (!req.files?.photo_cni || !req.files?.photo_domicile) {
        return res.status(400).json({
          success: false,
          message: 'Les deux documents sont obligatoires (photo_cni et photo_domicile)'
        });
      }

      const photoCniPath      = req.files.photo_cni[0].path;
      const photoDomicilePath = req.files.photo_domicile[0].path;

      const { rows } = await pool.query(
        `INSERT INTO demandes
           (user_id, type_document, nom, prenom, nin,
            photo_cni_path, photo_domicile_path, date_demande, status)
         VALUES ($1, 'authorisation_de_voirie', $2, $3, $4, $5, $6, $7, 'en_attente')
         RETURNING id`,
        [user_id, nom, prenom, nin, photoCniPath, photoDomicilePath, date_demande || new Date()]
      );

      res.status(201).json({
        success: true,
        message: "Demande d'autorisation de voirie envoyée avec succès",
        demandeId: rows[0].id
      });
    } catch (error) {
      console.error('Erreur autorisation-voirie:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── GET /demandes/mes-demandes/:userId ────────────────────────────────────────
router.get('/mes-demandes/:userId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM demandes
       WHERE user_id = $1
       ORDER BY date_demande DESC`,
      [req.params.userId]
    );
    res.json({ success: true, demandes: rows });
  } catch (error) {
    console.error('Erreur mes-demandes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /demandes/:id ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM demandes WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    }
    res.json({ success: true, demande: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PUT /demandes/:id/status (agent only) ─────────────────────────────────────
router.put('/:id/status', async (req, res) => {
  try {
    const { status, commentaire } = req.body;
    const { rows } = await pool.query(
      `UPDATE demandes
       SET status = $1,
           commentaire = COALESCE($2, commentaire),
           date_traitement = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, commentaire || null, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    }
    res.json({ success: true, demande: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;