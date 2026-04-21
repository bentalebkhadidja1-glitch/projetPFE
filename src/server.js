import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import pkg from 'pg';
import bcrypt from 'bcrypt';

dotenv.config();

const { Pool } = pkg;

// ───────────── PostgreSQL Pool ─────────────
const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'notification_db',
  password: process.env.DB_PASSWORD || '1234',
  port:     parseInt(process.env.DB_PORT) || 5432,
});

export { pool };
export default pool;

// ───────────── Import Routes ─────────────
import notificationRoutes from './routes/notification.js';
import authRoutes         from './routes/authRoutes.js';
import adminRoutes        from './routes/admin.js';
import demandeRoutes      from './routes/demandeRoutes.js';
import employeeRoutes     from './routes/employee.js';
import requestRoutes      from './routes/request.js';
import chatRoutes         from './routes/chatRoutes.js';

const app  = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// ───────────── Socket.IO ─────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

export { io };

// ─────────────────────────────────────────────────────────────────────────────
//  SOCKET.IO — Chat logic
//  Events used by React frontend:
//    EMIT   → agent:join, chat:get-conversations, chat:send-message, chat:mark-read
//    LISTEN ← chat:conversations, chat:new-message, chat:message-sent
//
//  Events used by Flutter frontend:
//    EMIT   → citizen:join, citizen:send-message
//    LISTEN ← chat:new-agent-message, chat:message-sent
// ─────────────────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('Socket connecté:', socket.id);

  // ── AGENT joins (React) ───────────────────────────────────────────────────
  // React: socket.emit('agent:join')
  socket.on('agent:join', () => {
    socket.join('agents_room');
    socket.role = 'agent';
    console.log(`Agent rejoint agents_room (socket: ${socket.id})`);
  });

  // ── AGENT requests conversation list (React) ──────────────────────────────
  // React: socket.emit('chat:get-conversations')
  socket.on('chat:get-conversations', async () => {
    try {
      const { rows } = await pool.query(`
        SELECT
          cm.citizen_id                                          AS "citizenId",
          u.prenom || ' ' || u.nom                              AS "citizenName",
          u.email                                               AS "citizenEmail",
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id',       cm2.id,
              'from',     cm2.from_role,
              'text',     cm2.message,
              'time',     TO_CHAR(cm2.created_at AT TIME ZONE 'UTC', 'HH24:MI'),
              'read',     cm2.is_read
            )
            ORDER BY cm2.created_at ASC
          ) AS messages
        FROM (
          SELECT DISTINCT ON (citizen_id) citizen_id, created_at
          FROM chat_messages
          ORDER BY citizen_id, created_at DESC
        ) cm
        JOIN users u ON u.id = cm.citizen_id
        JOIN chat_messages cm2 ON cm2.citizen_id = cm.citizen_id
        GROUP BY cm.citizen_id, u.prenom, u.nom, u.email
        ORDER BY MAX(cm.created_at) DESC
      `);

      // citizenId must be a number in the frontend types (CitizenChat.citizenId: number)
      // We keep it as-is (UUID string) — frontend just uses it as a key
      socket.emit('chat:conversations', rows);
    } catch (err) {
      console.error('chat:get-conversations error:', err.message);
      socket.emit('chat:conversations', []);
    }
  });

  // ── AGENT sends message (React) ───────────────────────────────────────────
  // React: socket.emit('chat:send-message', { citizenId, text, time })
  socket.on('chat:send-message', async ({ citizenId, text, time }) => {
    try {
      const { rows } = await pool.query(
        `INSERT INTO chat_messages (citizen_id, from_role, message, is_read)
         VALUES ($1, 'agent', $2, TRUE)
         RETURNING id, citizen_id, from_role, message, is_read, created_at`,
        [citizenId, text]
      );
      const saved = rows[0];

      const messageObj = {
        id:   saved.id,
        from: 'agent',
        text: saved.message,
        time: time || new Date(saved.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true,
      };

      // Confirm to the sending agent
      socket.emit('chat:message-sent', {
        citizenId,
        message: messageObj,
      });

      // Send to citizen in Flutter
      io.to(`citizen_${citizenId}`).emit('chat:new-agent-message', {
        message: messageObj,
      });

    } catch (err) {
      console.error('chat:send-message error:', err.message);
    }
  });

  // ── AGENT marks conversation as read (React) ──────────────────────────────
  // React: socket.emit('chat:mark-read', { citizenId })
  socket.on('chat:mark-read', async ({ citizenId }) => {
    try {
      await pool.query(
        `UPDATE chat_messages
         SET is_read = TRUE
         WHERE citizen_id = $1 AND from_role = 'citizen'`,
        [citizenId]
      );
      // Notify all agents to update unread badges
      io.to('agents_room').emit('chat:conversation-read', { citizenId });
    } catch (err) {
      console.error('chat:mark-read error:', err.message);
    }
  });

  // ── CITIZEN joins (Flutter) ───────────────────────────────────────────────
  // Flutter: socket.emit('citizen:join', { citizenId })
  socket.on('citizen:join', ({ citizenId }) => {
    socket.join(`citizen_${citizenId}`);
    socket.citizenId = citizenId;
    socket.role      = 'citizen';
    console.log(`Citoyen rejoint citizen_${citizenId} (socket: ${socket.id})`);
  });

  // ── CITIZEN sends message (Flutter) ──────────────────────────────────────
  // Flutter: socket.emit('citizen:send-message', { citizenId, message })
  socket.on('citizen:send-message', async ({ citizenId, message }) => {
    try {
      // Fetch citizen info
      const { rows: userRows } = await pool.query(
        `SELECT nom, prenom, email FROM users WHERE id = $1`,
        [citizenId]
      );
      const user = userRows[0];

      // Save message
      const { rows } = await pool.query(
        `INSERT INTO chat_messages (citizen_id, from_role, message)
         VALUES ($1, 'citizen', $2)
         RETURNING id, citizen_id, from_role, message, is_read, created_at`,
        [citizenId, message]
      );
      const saved = rows[0];

      const messageObj = {
        id:   saved.id,
        from: 'citizen',
        text: saved.message,
        time: new Date(saved.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };

      // Broadcast to all agents (React dashboard)
      // React listens: socket.on('chat:new-message', (data) => ...)
      io.to('agents_room').emit('chat:new-message', {
        citizenId:    citizenId,
        citizenName:  user ? `${user.prenom} ${user.nom}` : 'Citoyen',
        citizenEmail: user?.email ?? '',
        message:      messageObj,
      });

      // Confirm to citizen (Flutter)
      socket.emit('chat:message-sent', { message: messageObj });

    } catch (err) {
      console.error('citizen:send-message error:', err.message);
      socket.emit('chat:error', { error: err.message });
    }
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log('Socket déconnecté:', socket.id);
  });
});

// ───────────── Middleware ─────────────
app.use(cors());
app.use(express.json());

// ───────────── Routes ─────────────
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth',          authRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/demandes',      demandeRoutes);
app.use('/api/employees',     employeeRoutes);
app.use('/api/requests',      requestRoutes);
app.use('/api/chat',          chatRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Baladiya Digital API — PostgreSQL + Socket.IO' });
});

// ───────────── Seed Employees ─────────────
async function seedEmployees() {
  const seeds = [
    { id: '11111111-1111-1111-1111-111111111111', first_name: 'Sarah',  last_name: '', email: 'sarah@gmail.com',  password: 'employee123', service: 'Fiche de residence',     position: 'fiche_residence',      role: 'employee', status: 'active', join_date: '2024-01-01' },
    { id: '22222222-2222-2222-2222-222222222222', first_name: 'Jamel',  last_name: '', email: 'jamel@gmail.com',  password: 'employee123', service: 'Certificat de residence', position: 'certificat_residence', role: 'employee', status: 'active', join_date: '2024-01-01' },
    { id: '33333333-3333-3333-3333-333333333333', first_name: 'Fatima', last_name: '', email: 'fatima@gmail.com', password: 'employee123', service: 'Acte de naissance',        position: 'acte_naissance',       role: 'employee', status: 'active', join_date: '2024-01-01' },
    { id: '44444444-4444-4444-4444-444444444444', first_name: 'Maria',  last_name: '', email: 'maria@gmail.com',  password: 'employee123', service: 'Certificat de mariage',   position: 'certificat_mariage',   role: 'employee', status: 'active', join_date: '2024-01-01' },
    { id: '55555555-5555-5555-5555-555555555555', first_name: 'Karim',  last_name: '', email: 'karim@gmail.com',  password: 'employee123', service: 'service technique',        position: 'autorisation_voirie',  role: 'employee', status: 'active', join_date: '2024-01-01' },
  ];

  for (const emp of seeds) {
    const { rows } = await pool.query(`SELECT id FROM employees WHERE id = $1`, [emp.id]);
    if (rows.length === 0) {
      const password_hash = await bcrypt.hash(emp.password, 10);
      await pool.query(
        `INSERT INTO employees (id, first_name, last_name, email, password_hash, service, position, role, status, join_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [emp.id, emp.first_name, emp.last_name, emp.email, password_hash, emp.service, emp.position, emp.role, emp.status, emp.join_date]
      );
      console.log(`Employé créé: ${emp.first_name} (${emp.position})`);
    }
  }
  console.log('Seed employés terminé');
}

// ───────────── Start Server ─────────────
async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connecté');
    await seedEmployees();
    server.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
      console.log(`Socket.IO actif sur ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Erreur démarrage:', error.message);
    process.exit(1);
  }
}

startServer();