require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const patientRoutes = require('./routes/patient');
const hospitalRoutes = require('./routes/hospital');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ───────────────────────────────────────────────────────────────────
// In production (Render), set the env var:
//   ALLOWED_ORIGINS=https://kenva.netlify.app,https://kenva-health.netlify.app
// Multiple origins can be comma-separated.
const buildAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS || '';
  const fromEnv = raw.split(',').map(s => s.trim()).filter(Boolean);
  const defaults = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://kenva.netlify.app',
    'https://kenva-health.netlify.app',
    'https://kenva-health.surge.sh',
  ];
  return [...new Set([...defaults, ...fromEnv])];
};

const allowedOrigins = buildAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development, allow everything
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/hospital', hospitalRoutes);

// ─── Real-Time Live Sync SSE Stream ─────────────────────────────────────────
const sseClients = new Set();

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  if (res.flushHeaders) res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

db.events.on('change', (change) => {
  const payload = `data: ${JSON.stringify({ type: 'DATABASE_CHANGE', ...change })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
});

setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(':keepalive\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Kenva Health Systems Core API',
    tagline: 'A Digital Nervous System for Modern Clinics',
    active_stream_connections: sseClients.size,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Kenva Health Systems Backend API running on port ${PORT}`);
    console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  });
}

module.exports = app;
