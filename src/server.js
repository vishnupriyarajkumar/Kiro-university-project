/**
 * Pomodoro Session Logger — HTTP API server
 * Uses only Node.js built-in modules (http, url, path, fs).
 * Serves the client/ static files and exposes a JSON REST API.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { validateSession, createSession, filterByDate, filterByWeek } from './sessions.js';
import { loadSessions, saveSessions } from './storage.js';
import { totalMinutes, averageDuration, currentStreak, longestStreak, mostProductiveDay, groupByDay } from './stats.js';
import { generateWeeklyReport, getMondayDate } from './report.js';

/** Build a heatmap: last 84 days (12 weeks) of daily focus minutes. */
function buildHeatmap(sessions) {
  const today = new Date();
  const result = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const mins = sessions
      .filter(s => s.date === dateStr)
      .reduce((sum, s) => sum + s.duration, 0);
    result.push({ date: dateStr, minutes: mins });
  }
  return result;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

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
  const ext = path.extname(filePath);
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

async function handleRequest(req, res) {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    res.end();
    return;
  }

  // GET /api/sessions/today
  if (pathname === '/api/sessions/today' && method === 'GET') {
    try {
      const sessions = loadSessions();
      const today = new Date().toISOString().slice(0, 10);
      const todaySessions = filterByDate(sessions, today);
      json(res, 200, { date: today, sessions: todaySessions, totalMinutes: totalMinutes(todaySessions) });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/sessions/week?date=YYYY-MM-DD  (date optional, defaults to today)
  if (pathname === '/api/sessions/week' && method === 'GET') {
    try {
      const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
      const dateParam = reqUrl.searchParams.get('date');
      const sessions = loadSessions();
      const refDate = dateParam || new Date().toISOString().slice(0, 10);
      const weekSessions = filterByWeek(sessions, refDate);
      const grouped = groupByDay(weekSessions);
      json(res, 200, { monday: getMondayDate(refDate), refDate, sessions: weekSessions, grouped, totalMinutes: totalMinutes(weekSessions) });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/heatmap  — last 84 days of daily focus minutes
  if (pathname === '/api/heatmap' && method === 'GET') {
    try {
      const sessions = loadSessions();
      json(res, 200, { heatmap: buildHeatmap(sessions) });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/stats
  if (pathname === '/api/stats' && method === 'GET') {
    try {
      const sessions = loadSessions();
      const today = new Date().toISOString().slice(0, 10);
      json(res, 200, {
        totalSessions: sessions.length,
        totalMinutes: totalMinutes(sessions),
        averageDuration: averageDuration(sessions),
        currentStreak: currentStreak(sessions, today),
        longestStreak: longestStreak(sessions),
        mostProductiveDay: mostProductiveDay(sessions),
      });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/report
  if (pathname === '/api/report' && method === 'GET') {
    try {
      const sessions = loadSessions();
      const today = new Date().toISOString().slice(0, 10);
      const weekSessions = filterByWeek(sessions, today);
      const markdown = generateWeeklyReport(weekSessions, today);
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
      const sessions = loadSessions();
      const session = createSession(description, dur);
      saveSessions([...sessions, session]);
      json(res, 201, { session });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // Static files
  if (pathname === '/') { serveStatic(res, path.join(CLIENT_DIR, 'index.html')); return; }
  const staticPath = path.join(CLIENT_DIR, pathname);
  if (!staticPath.startsWith(CLIENT_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  serveStatic(res, staticPath);
}

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
