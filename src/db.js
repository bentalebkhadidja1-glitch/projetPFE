import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME     || 'baladiya_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port:     parseInt(process.env.DB_PORT) || 5432,
});

pool.on('error', (err) => {
  console.error('Erreur pool PostgreSQL:', err.message);
});

export default pool;