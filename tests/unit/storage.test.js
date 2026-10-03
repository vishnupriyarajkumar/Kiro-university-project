import { writeMarkdownFile } from '../../src/storage.js';
import { readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

const tmpDir = join(os.tmpdir(), 'pomodoro-test-' + process.pid);
const tmpFile = join(tmpDir, 'report.md');
const nestedFile = join(tmpDir, 'nested', 'dir', 'report.md');

afterEach(() => {
  // Clean up temp files created during tests
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe('writeMarkdownFile — argument validation', () => {
  test('throws when filePath is null', () => {
    expect(() => writeMarkdownFile(null, '# Report')).toThrow(/filePath/i);
  });

  test('throws when filePath is undefined', () => {
    expect(() => writeMarkdownFile(undefined, '# Report')).toThrow(/filePath/i);
  });

  test('throws when filePath is an empty string', () => {
    expect(() => writeMarkdownFile('', '# Report')).toThrow(/filePath/i);
  });

  test('throws when filePath is a whitespace-only string', () => {
    expect(() => writeMarkdownFile('   ', '# Report')).toThrow(/filePath/i);
  });

  test('throws when content is null', () => {
    expect(() => writeMarkdownFile(tmpFile, null)).toThrow(/content/i);
  });

  test('throws when content is an empty string', () => {
    expect(() => writeMarkdownFile(tmpFile, '')).toThrow(/content/i);
  });

  test('does not perform any filesystem operation when filePath is invalid', () => {
    expect(() => writeMarkdownFile('   ', '# Report')).toThrow();
    expect(existsSync(tmpFile)).toBe(false);
  });
});

describe('writeMarkdownFile — successful write', () => {
  test('writes the content to the specified path', () => {
    writeMarkdownFile(tmpFile, '# Weekly Report\n\nNo sessions.');
    const written = readFileSync(tmpFile, 'utf-8');
    expect(written).toBe('# Weekly Report\n\nNo sessions.');
  });

  test('overwrites existing file content', () => {
    writeMarkdownFile(tmpFile, '# First write');
    writeMarkdownFile(tmpFile, '# Second write');
    const written = readFileSync(tmpFile, 'utf-8');
    expect(written).toBe('# Second write');
  });

  test('creates parent directories that do not exist', () => {
    writeMarkdownFile(nestedFile, '# Nested report');
    expect(existsSync(nestedFile)).toBe(true);
  });

  test('written content is exactly the input string', () => {
    const content = '# Report\n\n- Deep work — 25 min\n- Code review — 30 min\n';
    writeMarkdownFile(tmpFile, content);
    expect(readFileSync(tmpFile, 'utf-8')).toBe(content);
  });
});
