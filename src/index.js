import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { writeFileSync } from 'fs';
import { loadSessions, saveSessions } from './storage.js';
import { connectDB, disconnectDB } from './db.js';
import { validateSession, createSession, filterByDate, filterByWeek, deleteSession, editSession, searchSessions } from './sessions.js';
import {
  totalMinutes,
  averageDuration,
  groupByDay,
  currentStreak,
  longestStreak,
  mostProductiveDay,
} from './stats.js';
import { generateWeeklyReport, getMondayDate } from './report.js';

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
    const duration = parseInt(options.duration, 10);
    const { valid, errors } = validateSession(description, duration);

    if (!valid) {
      errors.forEach((e) => console.error(chalk.red.bold('Error: ') + e));
      process.exit(1);
    }

    try {
      const sessions = await loadSessions();
      const session = createSession(description, duration);
      await saveSessions([...sessions, session]);

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
  .description("Show today's focus sessions")
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
  .description("Show this week's focus sessions grouped by day")
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
  .action(async () => {
    try {
      const sessions = await loadSessions();
      const today = new Date().toISOString().slice(0, 10);

      console.log(chalk.yellow.bold('\n📊 Your Productivity Stats\n'));

      if (sessions.length === 0) {
        console.log(chalk.gray('  No sessions logged yet. Start with: pomodoro log "Task" --duration 25'));
        return;
      }

      console.log(chalk.white('  Total sessions:      ') + chalk.green.bold(sessions.length));
      console.log(chalk.white('  Total focus time:    ') + chalk.green.bold(`${totalMinutes(sessions)} min`));
      console.log(chalk.white('  Average duration:    ') + chalk.cyan.bold(`${averageDuration(sessions)} min`));
      console.log(chalk.white('  Current streak:      ') + chalk.magenta.bold(`${currentStreak(sessions, today)} day(s) 🔥`));
      console.log(chalk.white('  Longest streak:      ') + chalk.magenta.bold(`${longestStreak(sessions)} day(s)`));
      console.log(chalk.white('  Most productive day: ') + chalk.cyan.bold(mostProductiveDay(sessions)));
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
      const sessions = await loadSessions();
      const { found, sessions: updated } = deleteSession(sessions, id);
      if (!found) {
        console.error(chalk.red.bold('Error: ') + `No session found with ID: ${id}`);
        process.exit(1);
      }
      await saveSessions(updated);
      console.log(chalk.green.bold('\n🗑️  Session deleted.'));
      console.log(chalk.gray(`   ID: ${id}`));
    } catch (err) {
      console.error(chalk.red.bold('Error: ') + err.message);
      process.exit(1);
    }
  });

// ── edit command ─────────────────────────────────────────────────────────────
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
    if (options.description) updates.description = options.description;
    if (options.duration) updates.duration = parseInt(options.duration, 10);

    try {
      const sessions = await loadSessions();
      const result = editSession(sessions, id, updates);

      if (!result.found) {
        console.error(chalk.red.bold('Error: ') + `No session found with ID: ${id}`);
        process.exit(1);
      }
      if (!result.valid) {
        result.errors.forEach((e) => console.error(chalk.red.bold('Error: ') + e));
        process.exit(1);
      }

      await saveSessions(result.sessions);
      console.log(chalk.green.bold('\n✏️  Session updated!'));
      console.log(chalk.white(`   ${result.session.description}`) + chalk.cyan.bold(` [${result.session.duration} min]`));
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
      const activeDays = new Set(sessions.map((s) => s.date));

      console.log(chalk.yellow.bold('\n🔥 Streak Overview\n'));
      console.log(chalk.white('  Current streak: ') + chalk.magenta.bold(`${current} day(s)`));
      console.log(chalk.white('  Longest streak: ') + chalk.magenta.bold(`${longest} day(s)`));

      // Build a 4-week (28-day) visual calendar
      console.log(chalk.yellow.bold('\n  Last 28 days  (● = session logged, ○ = no session)\n'));
      console.log(chalk.gray('  Mon  Tue  Wed  Thu  Fri  Sat  Sun'));

      // Find Monday 27 days ago
      const todayDate = new Date(today + 'T00:00:00.000Z');
      const dayOfWeek = todayDate.getUTCDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startDate = new Date(todayDate);
      startDate.setUTCDate(todayDate.getUTCDate() + diffToMonday - 21); // 3 weeks before current Monday

      let row = '  ';
      for (let i = 0; i < 28; i++) {
        const d = new Date(startDate);
        d.setUTCDate(startDate.getUTCDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const isToday = dateStr === today;
        const hasSession = activeDays.has(dateStr);

        let cell;
        if (isToday) {
          cell = hasSession ? chalk.green.bold(' ● ') : chalk.red.bold(' ○ ');
        } else if (hasSession) {
          cell = chalk.green(' ● ');
        } else {
          cell = chalk.gray(' ○ ');
        }

        row += cell + ' ';

        // New row every 7 days
        if ((i + 1) % 7 === 0) {
          console.log(row);
          row = '  ';
        }
      }

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

  let sessions;
  try {
    sessions = await loadSessions();
  } catch (err) {
    console.error(chalk.red.bold('Error: ') + err.message);
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const weekSessions = filterByWeek(sessions, today);

  // Validate each session; warn and skip invalids rather than aborting
  const validSessions = weekSessions.filter((s) => {
    const { valid } = validateSession(s.description, s.duration);
    if (!valid) {
      console.error(chalk.yellow.bold('Warning: ') + `Skipping invalid session ${s.id}`);
    }
    return valid;
  });

  const markdown = generateWeeklyReport(validSessions, today);
  const outputPath = options.output ?? path.resolve(`./pomodoro-week-${getMondayDate(today)}.md`);

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
  .description("Export this week's focus sessions as a Markdown report")
  .option('-o, --output <path>', 'Output file path')
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
