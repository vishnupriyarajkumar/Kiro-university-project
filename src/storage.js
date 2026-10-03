import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DATA_FILE = join(DATA_DIR, 'sessions.json');

/** Ensure the data directory exists before reading or writing. */
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** Load all sessions from the JSON file. Returns an empty array if the file does not exist. */
export function loadSessions() {
  ensureDataDir();
  if (!existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse sessions file (${DATA_FILE}): ${err.message}`);
  }
}

/** Persist the full sessions array to the JSON file. */
export function saveSessions(sessions) {
  ensureDataDir();
  try {
    writeFileSync(DATA_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    throw new Error(`Failed to write sessions file (${DATA_FILE}): ${err.message}`);
  }
}

/** Writes a Markdown string to the given file path, creating parent directories if necessary. */
export function writeMarkdownFile(filePath, content) {
  if (filePath == null || typeof filePath !== 'string' || filePath.trim() === '') {
    throw new Error('writeMarkdownFile: filePath must be a non-empty, non-whitespace string');
  }
  if (content == null || content === '') {
    throw new Error('writeMarkdownFile: content must be a non-empty string');
  }

  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });

  try {
    writeFileSync(filePath, content, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to write Markdown file (${filePath}): ${err.message}`);
  }
}
