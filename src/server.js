/**
 * Pomodoro Session Logger — HTTP API server
 * Uses Node.js built-in http module + Mongoose for MongoDB persistence.
 * Serves client/ static files and exposes a JSON REST API.
 */

import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './db.js';
import { validateSession, createSession, filterByDate, filterByWeek } from './sessions.js';
import { loadSessions, saveSession, deleteSessionById, updateSessionById } from './storage.js';
import { totalMinutes, averageDuration, currentStreak, longestStreak, mostProductiveDay, groupByDay, mostProductiveHour } from './stats.js';
import { generateWeeklyReport, getMondayDate } from './report.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); } catch { resolve(null); }
    });
  });
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function text(res, status, content, contentType = 'text/plain') {
  res.writeHead(status, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
  res.end(content);
}

function serveStatic(res, filePath) {
  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'text/plain';
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

/** Build a heatmap: last 84 days (12 weeks) of daily focus minutes. */
function buildHeatmap(sessions) {
  const today  = new Date();
  const result = [];
  for (let i = 83; i >= 0; i--) {
    const d       = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const mins    = sessions
      .filter(s => s.date === dateStr)
      .reduce((sum, s) => sum + s.duration, 0);
    result.push({ date: dateStr, minutes: mins });
  }
  return result;
}

// ── Request router ────────────────────────────────────────────────────────────

async function handleRequest(req, res) {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;

  // CORS pre-flight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    res.end();
    return;
  }

  // GET /api/sessions/today
  if (pathname === '/api/sessions/today' && method === 'GET') {
    try {
      const sessions     = await loadSessions();
      const today        = new Date().toISOString().slice(0, 10);
      const todaySessions = filterByDate(sessions, today);
      json(res, 200, { date: today, sessions: todaySessions, totalMinutes: totalMinutes(todaySessions) });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/sessions/week?date=YYYY-MM-DD
  if (pathname === '/api/sessions/week' && method === 'GET') {
    try {
      const reqUrl    = new URL(req.url, `http://localhost:${PORT}`);
      const dateParam = reqUrl.searchParams.get('date');
      // Validate date format if provided
      if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        json(res, 400, { error: 'Invalid date format. Use YYYY-MM-DD.' });
        return;
      }
      const sessions  = await loadSessions();
      const refDate   = dateParam || new Date().toISOString().slice(0, 10);
      const weekSessions = filterByWeek(sessions, refDate);
      const grouped   = groupByDay(weekSessions);
      json(res, 200, { monday: getMondayDate(refDate), refDate, sessions: weekSessions, grouped, totalMinutes: totalMinutes(weekSessions) });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/sessions/search?q=keyword
  if (pathname === '/api/sessions/search' && method === 'GET') {
    try {
      const reqUrl  = new URL(req.url, `http://localhost:${PORT}`);
      const keyword = reqUrl.searchParams.get('q');
      if (!keyword || keyword.trim() === '') {
        json(res, 400, { error: 'Query param "q" is required and must not be empty.' });
        return;
      }
      const sessions = await loadSessions();
      const lower    = keyword.toLowerCase();
      const results  = sessions.filter((s) => s.description.toLowerCase().includes(lower));
      json(res, 200, { keyword, count: results.length, sessions: results });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/heatmap
  if (pathname === '/api/heatmap' && method === 'GET') {
    try {
      const sessions = await loadSessions();
      json(res, 200, { heatmap: buildHeatmap(sessions) });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/stats
  if (pathname === '/api/stats' && method === 'GET') {
    try {
      const sessions = await loadSessions();
      const today    = new Date().toISOString().slice(0, 10);
      json(res, 200, {
        totalSessions:      sessions.length,
        totalMinutes:       totalMinutes(sessions),
        averageDuration:    averageDuration(sessions),
        currentStreak:      currentStreak(sessions, today),
        longestStreak:      longestStreak(sessions),
        mostProductiveDay:  mostProductiveDay(sessions),
        mostProductiveHour: mostProductiveHour(sessions),
      });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/stats/weekly — Mon–Sun daily minutes for bar chart
  if (pathname === '/api/stats/weekly' && method === 'GET') {
    try {
      const sessions  = await loadSessions();
      const today     = new Date();
      const todayStr  = today.toISOString().slice(0, 10);
      const DAY_ABBR  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const dayOfWeek    = today.getUTCDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d       = new Date(today);
        d.setUTCDate(today.getUTCDate() + diffToMonday + i);
        const dateStr = d.toISOString().slice(0, 10);
        const mins    = sessions.filter(s => s.date === dateStr).reduce((sum, s) => sum + s.duration, 0);
        days.push({ label: DAY_ABBR[d.getUTCDay()], date: dateStr, minutes: mins, isToday: dateStr === todayStr });
      }
      json(res, 200, { days });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/report
  if (pathname === '/api/report' && method === 'GET') {
    try {
      const sessions     = await loadSessions();
      const today        = new Date().toISOString().slice(0, 10);
      const weekSessions = filterByWeek(sessions, today);
      const markdown     = generateWeeklyReport(weekSessions, today);
      text(res, 200, markdown, 'text/plain');
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // POST /api/sessions
  if (pathname === '/api/sessions' && method === 'POST') {
    try {
      const body = await readBody(req);
      if (!body) { json(res, 400, { error: 'Invalid JSON body.' }); return; }
      const { description, duration } = body;
      const dur = parseInt(duration, 10);
      const { valid, errors } = validateSession(description, dur);
      if (!valid) { json(res, 400, { error: errors.join(' ') }); return; }
      const session = createSession(description, dur);
      await saveSession(session);
      json(res, 201, { session });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // DELETE /api/sessions/:id
  if (pathname.startsWith('/api/sessions/') && method === 'DELETE') {
    const id = pathname.replace('/api/sessions/', '').trim();
    if (!id) { json(res, 400, { error: 'Session ID is required.' }); return; }
    try {
      const deleted = await deleteSessionById(id);
      if (!deleted) { json(res, 404, { error: `No session found with ID: ${id}` }); return; }
      json(res, 200, { message: 'Session deleted.', id });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // PUT /api/sessions/:id
  if (pathname.startsWith('/api/sessions/') && method === 'PUT') {
    const id = pathname.replace('/api/sessions/', '').trim();
    if (!id) { json(res, 400, { error: 'Session ID is required.' }); return; }
    try {
      const body = await readBody(req);
      if (!body) { json(res, 400, { error: 'Invalid JSON body.' }); return; }
      const updates = {};
      if (body.description !== undefined) updates.description = String(body.description).trim();
      if (body.duration    !== undefined) updates.duration    = parseInt(body.duration, 10);
      if (Object.keys(updates).length === 0) {
        json(res, 400, { error: 'Provide at least description or duration to update.' });
        return;
      }
      const { valid, errors } = validateSession(
        updates.description ?? 'placeholder',
        updates.duration    ?? 25
      );
      // Only validate the fields that were actually provided
      const fieldErrors = [];
      if (updates.description !== undefined && updates.description.length === 0) {
        fieldErrors.push('Description must be a non-empty string.');
      }
      if (updates.duration !== undefined) {
        const { errors: durErrors } = validateSession('ok', updates.duration);
        fieldErrors.push(...durErrors);
      }
      if (fieldErrors.length > 0) { json(res, 400, { error: fieldErrors.join(' ') }); return; }
      const session = await updateSessionById(id, updates);
      if (!session) { json(res, 404, { error: `No session found with ID: ${id}` }); return; }
      json(res, 200, { session });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // Static files
  if (pathname === '/') { serveStatic(res, path.join(CLIENT_DIR, 'index.html')); return; }
  const staticPath = path.join(CLIENT_DIR, pathname);
  if (!staticPath.startsWith(CLIENT_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  serveStatic(res, staticPath);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  await connectDB();

  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error('Unhandled error:', err);
      res.writeHead(500);
      res.end('Internal server error');
    });
  });

  server.listen(PORT, () => {
    console.log(`\n🍅 Pomodoro Web App running at http://localhost:${PORT}\n`);
  });
}

bootstrap();
