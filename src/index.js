import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { writeFileSync } from 'fs';
import { loadSessions, saveSession, deleteSessionById, updateSessionById } from './storage.js';
import { connectDB, disconnectDB } from './db.js';
import { validateSession, createSession, filterByDate, filterByWeek, searchSessions } from './sessions.js';
import {
  totalMinutes,
  averageDuration,
  groupByDay,
  currentStreak,
  longestStreak,
  mostProductiveDay,
  mostProductiveHour,
} from './stats.js';
import { generateWeeklyReport, getMondayDate } from './report.js';
import { renderStreakCalendar } from './streakCalendar.js';

const program = new Command();

program
  .name('pomodoro')
  .description('Log and track your focus sessions')
  .version('1.0.0');

// ── log command ──────────────────────────────────────────────────────────────
program
  .command('log <description>')
  .description('Log a completed focus session')
  .requiredOption('-d, --duration <minutes>', 'Session duration in minutes')
  .action(async (description, options) => {
    // Reject non-numeric or float duration strings before parseInt silently truncates them
    const rawDuration = options.duration;
    if (!/^\d+$/.test(String(rawDuration).trim())) {
      console.error(chalk.red.bold('Error: ') + 'Duration must be a whole number (e.g. --duration 25).');
      process.exit(1);
    }
    const duration = parseInt(rawDuration, 10);
    const { valid, errors } = validateSession(description, duration);

    if (!valid) {
      errors.forEach((e) => console.error(chalk.red.bold('Error: ') + e));
      process.exit(1);
    }

    try {
      const session = createSession(description, duration);
      await saveSession(session);

      console.log(chalk.green.bold('\n✅ Session logged!'));
      console.log(chalk.white(`   ${session.description}`));
      console.log(chalk.cyan.bold(`   ${session.duration} min`) + chalk.gray(` · ${session.date}`));
    } catch (err) {
      console.error(chalk.red.bold('Error: ') + err.message);
      process.exit(1);
    }
  });

// ── today command ────────────────────────────────────────────────────────────
program
  .command('today')
  .description('Show today\'s focus sessions')
  .action(async () => {
    try {
      const sessions = await loadSessions();
      const today = new Date().toISOString().slice(0, 10);
      const todaySessions = filterByDate(sessions, today);

      console.log(chalk.yellow.bold(`\n📅 Sessions for ${today}`));

      if (todaySessions.length === 0) {
        console.log(chalk.gray('  No sessions logged today. Time to focus! 🍅'));
        return;
      }

      todaySessions.forEach((s, i) => {
        console.log(
          chalk.white(`  ${i + 1}. ${s.description}`) +
          chalk.cyan.bold(` [${s.duration} min]`)
        );
      });

      console.log(chalk.green.bold(`\n  Total: ${totalMinutes(todaySessions)} min across ${todaySessions.length} session(s)`));
    } catch (err) {
      console.error(chalk.red.bold('Error: ') + err.message);
      process.exit(1);
    }
  });

// ── week command ─────────────────────────────────────────────────────────────
program
  .command('week')
  .description('Show this week\'s focus sessions grouped by day')
  .action(async () => {
    try {
      const sessions = await loadSessions();
      const today = new Date().toISOString().slice(0, 10);
      const weekSessions = filterByWeek(sessions, today);

      console.log(chalk.yellow.bold('\n📆 This Week\'s Sessions'));

      if (weekSessions.length === 0) {
        console.log(chalk.gray('  No sessions logged this week yet.'));
        return;
      }

      const grouped = groupByDay(weekSessions);
      const sortedDays = Object.keys(grouped).sort();

      sortedDays.forEach((date) => {
        const daySessions = grouped[date];
        const dayTotal = totalMinutes(daySessions);
        console.log(chalk.yellow(`\n  ${date}`) + chalk.green(` (${dayTotal} min)`));
        daySessions.forEach((s) => {
          console.log(chalk.white(`    · ${s.description}`) + chalk.cyan.bold(` [${s.duration} min]`));
        });
      });

      console.log(chalk.green.bold(`\n  Weekly Total: ${totalMinutes(weekSessions)} min across ${weekSessions.length} session(s)`));
    } catch (err) {
      console.error(chalk.red.bold('Error: ') + err.message);
      process.exit(1);
    }
  });

// ── stats command ────────────────────────────────────────────────────────────
program
  .command('stats')
  .description('Show overall productivity stats and streaks')
  .option('--json', 'Output stats as machine-readable JSON')
  .action(async (options) => {
    try {
      const sessions = await loadSessions();
      const today = new Date().toISOString().slice(0, 10);

      const stats = {
        totalSessions: sessions.length,
        totalMinutes: totalMinutes(sessions),
        averageDuration: averageDuration(sessions),
        currentStreak: currentStreak(sessions, today),
        longestStreak: longestStreak(sessions),
        mostProductiveDay: mostProductiveDay(sessions),
        mostProductiveHour: mostProductiveHour(sessions),
      };

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }

      console.log(chalk.yellow.bold('\n📊 Your Productivity Stats\n'));

      if (sessions.length === 0) {
        console.log(chalk.gray('  No sessions logged yet. Start with: pomodoro log "Task" --duration 25'));
        return;
      }

      console.log(chalk.white('  Total sessions:      ') + chalk.green.bold(stats.totalSessions));
      console.log(chalk.white('  Total focus time:    ') + chalk.green.bold(`${stats.totalMinutes} min`));
      console.log(chalk.white('  Average duration:    ') + chalk.cyan.bold(`${stats.averageDuration} min`));
      console.log(chalk.white('  Current streak:      ') + chalk.magenta.bold(`${stats.currentStreak} day(s) 🔥`));
      console.log(chalk.white('  Longest streak:      ') + chalk.magenta.bold(`${stats.longestStreak} day(s)`));
      console.log(chalk.white('  Most productive day:  ') + chalk.cyan.bold(stats.mostProductiveDay));
      console.log(chalk.white('  Most productive hour: ') + chalk.cyan.bold(stats.mostProductiveHour));
    } catch (err) {
      console.error(chalk.red.bold('Error: ') + err.message);
      process.exit(1);
    }
  });

// ── delete command ───────────────────────────────────────────────────────────
program
  .command('delete <id>')
  .description('Delete a session by its ID')
  .action(async (id) => {
    try {
      const deleted = await deleteSessionById(id);
      if (!deleted) {
        console.error(chalk.red.bold('Error: ') + `No session found with ID: ${id}`);
        process.exit(1);
      }
      console.log(chalk.green.bold('\n🗑️  Session deleted.'));
      console.log(chalk.gray(`   ID: ${id}`));
    } catch (err) {
      console.error(chalk.red.bold('Error: ') + err.message);
      process.exit(1);
    }
  });

// ── edit command ─────────────────────────────────────────────────────────────
const MAX_DESCRIPTION_LENGTH = 200;

program
  .command('edit <id>')
  .description('Edit a session description or duration by its ID')
  .option('-d, --description <text>', 'New description')
  .option('-m, --duration <minutes>', 'New duration in minutes')
  .action(async (id, options) => {
    if (!options.description && !options.duration) {
      console.error(chalk.red.bold('Error: ') + 'Provide at least --description or --duration to update.');
      process.exit(1);
    }

    const updates = {};

    if (options.description !== undefined) {
      const trimmed = options.description.trim();
      if (trimmed.length === 0) {
        console.error(chalk.red.bold('Error: ') + 'Description cannot be empty or whitespace only.');
        process.exit(1);
      }
      if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
        console.error(chalk.red.bold('Error: ') + `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`);
        process.exit(1);
      }
      updates.description = trimmed;
    }

    if (options.duration !== undefined) {
      updates.duration = parseInt(options.duration, 10);
    }

    try {
      const session = await updateSessionById(id, updates);
      if (!session) {
        console.error(chalk.red.bold('Error: ') + `No session found with ID: ${id}`);
        process.exit(1);
      }
      console.log(chalk.green.bold('\n✏️  Session updated!'));
      console.log(chalk.white(`   ${session.description}`) + chalk.cyan.bold(` [${session.duration} min]`));
    } catch (err) {
      console.error(chalk.red.bold('Error: ') + err.message);
      process.exit(1);
    }
  });

// ── list command (with --since filter) ───────────────────────────────────────
program
  .command('list')
  .description('List all sessions, optionally filtered from a start date')
  .option('--since <date>', 'Show sessions from this date onwards (YYYY-MM-DD)')
  .action(async (options) => {
    // Validate --since format at the CLI boundary
    if (options.since && !/^\d{4}-\d{2}-\d{2}$/.test(options.since)) {
      console.error(chalk.red.bold('Error: ') + '--since must be in YYYY-MM-DD format.');
      process.exit(1);
    }

    try {
      const sessions = await loadSessions();
      const filtered = options.since
        ? sessions.filter((s) => s.date >= options.since)
        : sessions;

      const label = options.since
        ? `Sessions since ${options.since}`
        : 'All sessions';

      console.log(chalk.yellow.bold(`\n📋 ${label}\n`));

      if (filtered.length === 0) {
        console.log(chalk.gray('  No sessions found.'));
        return;
      }

      const grouped = groupByDay(filtered);
      const sortedDays = Object.keys(grouped).sort();

      sortedDays.forEach((date) => {
        const daySessions = grouped[date];
        console.log(chalk.yellow(`  ${date}`) + chalk.green(` (${totalMinutes(daySessions)} min)`));
        daySessions.forEach((s) => {
          console.log(
            chalk.white(`    · ${s.description}`) +
            chalk.cyan.bold(` [${s.duration} min]`) +
            chalk.gray(` — ${s.id}`)
          );
        });
      });

      console.log(chalk.green.bold(`\n  ${filtered.length} session(s) · ${totalMinutes(filtered)} min total`));
    } catch (err) {
      console.error(chalk.red.bold('Error: ') + err.message);
      process.exit(1);
    }
  });

// ── search command ───────────────────────────────────────────────────────────
program
  .command('search <keyword>')
  .description('Search sessions by keyword in description')
  .action(async (keyword) => {
    try {
      const sessions = await loadSessions();
      const results = searchSessions(sessions, keyword);

      console.log(chalk.yellow.bold(`\n🔍 Search results for "${keyword}"`));

      if (results.length === 0) {
        console.log(chalk.gray('  No sessions matched.'));
        return;
      }

      results.forEach((s) => {
        console.log(
          chalk.white(`  · ${s.description}`) +
          chalk.cyan.bold(` [${s.duration} min]`) +
          chalk.gray(` — ${s.date}`)
        );
      });
      console.log(chalk.green.bold(`\n  ${results.length} session(s) found · ${totalMinutes(results)} min total`));
    } catch (err) {
      console.error(chalk.red.bold('Error: ') + err.message);
      process.exit(1);
    }
  });

// ── streak command ───────────────────────────────────────────────────────────
program
  .command('streak')
  .description('Show streak details with a visual 4-week calendar')
  .action(async () => {
    try {
      const sessions = await loadSessions();
      const today = new Date().toISOString().slice(0, 10);
      const current = currentStreak(sessions, today);
      const longest = longestStreak(sessions);
      const sessionDates = sessions.map((s) => s.date);

      console.log(chalk.yellow.bold('\n🔥 Streak Overview\n'));
      console.log(chalk.white('  Current streak:  ') + chalk.magenta.bold(`${current} day(s)`));
      console.log(chalk.white('  Longest streak:  ') + chalk.magenta.bold(`${longest} day(s)`));
      console.log(chalk.white('  Total sessions:  ') + chalk.green.bold(`${sessions.length}`));
      console.log(chalk.white('  Days with focus: ') + chalk.green.bold(`${new Set(sessionDates).size}`));

      // Render via the dedicated calendar module
      const calendarLines = renderStreakCalendar(sessionDates, today);
      calendarLines.forEach((line) => console.log(line));

      if (current === 0) {
        console.log(chalk.red('\n  ⚠️  No session today — log one to keep your streak alive!'));
      } else {
        console.log(chalk.green(`\n  ✅ Keep it up! You've been focused for ${current} day(s) in a row.`));
      }
    } catch (err) {
      console.error(chalk.red.bold('Error: ') + err.message);
      process.exit(1);
    }
  });

// ── export command ───────────────────────────────────────────────────────────
/** Write a markdown string to the given file path. */
function writeMarkdownFile(outputPath, content) {
  writeFileSync(outputPath, content, 'utf8');
}

async function exportAction(options) {
  // Validate --output at the CLI boundary before any I/O
  if (options.output !== undefined && options.output.trim() === '') {
    console.error(chalk.red.bold('Error: ') + 'Output path cannot be empty.');
    process.exit(1);
  }

  // Validate --week format if provided
  if (options.week !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(options.week)) {
    console.error(chalk.red.bold('Error: ') + '--week must be in YYYY-MM-DD format.');
    process.exit(1);
  }

  let sessions;
  try {
    sessions = await loadSessions();
  } catch (err) {
    console.error(chalk.red.bold('Error: ') + err.message);
    process.exit(1);
  }

  const referenceDate = options.week ?? new Date().toISOString().slice(0, 10);
  const weekSessions = filterByWeek(sessions, referenceDate);

  // Validate each session; warn and skip invalids rather than aborting
  const validSessions = weekSessions.filter((s) => {
    const { valid } = validateSession(s.description, s.duration);
    if (!valid) {
      console.error(chalk.yellow.bold('Warning: ') + `Skipping invalid session ${s.id}`);
    }
    return valid;
  });

  const markdown = generateWeeklyReport(validSessions, referenceDate);
  const outputPath = options.output ?? path.resolve(`./pomodoro-week-${getMondayDate(referenceDate)}.md`);

  try {
    writeMarkdownFile(outputPath, markdown);
    console.log(chalk.green.bold('\n📄 Report exported!'));
    console.log(chalk.white('   ') + chalk.cyan(path.resolve(outputPath)));
  } catch (err) {
    console.error(chalk.red.bold('Error: ') + err.message);
    process.exit(1);
  }
}

program
  .command('export')
  .description('Export this week\'s focus sessions as a Markdown report')
  .option('-o, --output <path>', 'Output file path')
  .option('-w, --week <date>', 'Export the week containing this date (YYYY-MM-DD), defaults to today')
  .action(exportAction);

// Connect to DB, run commands, then disconnect cleanly
async function main() {
  await connectDB();
  await program.parseAsync(process.argv);
  await disconnectDB();
}

main().catch((err) => {
  console.error(chalk.red.bold('Fatal: ') + err.message);
  process.exit(1);
});
