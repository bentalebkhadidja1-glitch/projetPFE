import express from 'express';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// POST /auth/register  — creates row in `users` table
router.post('/register', authController.register);

// POST /auth/login     — checks `users` table (role: citoyen | municipal_agent | employee)
router.post('/login', authController.login);

// GET  /auth/me        — returns current user from `users` table
router.get('/me', authController.getMe);

export default router;