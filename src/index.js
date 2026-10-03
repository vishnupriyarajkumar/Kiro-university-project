import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { loadSessions, saveSessions, writeMarkdownFile } from './storage.js';
import { validateSession, createSession, filterByDate, filterByWeek } from './sessions.js';
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
  .action((description, options) => {
    const duration = parseInt(options.duration, 10);
    const { valid, errors } = validateSession(description, duration);

    if (!valid) {
      errors.forEach((e) => console.error(chalk.red.bold('Error: ') + e));
      process.exit(1);
    }

    try {
      const sessions = loadSessions();
      const session = createSession(description, duration);
      saveSessions([...sessions, session]);

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
  .action(() => {
    try {
      const sessions = loadSessions();
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
  .action(() => {
    try {
      const sessions = loadSessions();
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
  .action(() => {
    try {
      const sessions = loadSessions();
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

// ── export command ───────────────────────────────────────────────────────────
function exportAction(options) {
  // Validate --output at the CLI boundary before any I/O
  if (options.output !== undefined && options.output.trim() === '') {
    console.error(chalk.red.bold('Error: ') + 'Output path cannot be empty.');
    process.exit(1);
  }

  let sessions;
  try {
    sessions = loadSessions();
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

program.parse(process.argv);
