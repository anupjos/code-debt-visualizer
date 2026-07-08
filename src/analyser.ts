import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);

const LOC_CEILING = 1000;
const DAYS_CEILING = 600;
const CONTRIB_CEILING = 6;

const WEIGHT_LOC = 0.30;
const WEIGHT_AGE = 0.35;
const WEIGHT_TEST = 0.25;
const WEIGHT_CONTRIB = 0.10;

export const THRESHOLD_AMBER = 0.33;
export const THRESHOLD_RED = 0.66;

export type DebtLevel = 'low' | 'medium' | 'high';

export interface FileDebt {
  absPath: string;
  relPath: string;
  loc: number;
  daysSinceCommit: number;
  hasTest: boolean;
  contributors: number;
  score: number;
  level: DebtLevel;
  reasons: string[];
}

export interface AnalysisResult {
  files: FileDebt[];
  averageScore: number;
  byPath: Map<string, FileDebt>;
  hasGitHistory: boolean;
}

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.kts', '.scala',
  '.c', '.cc', '.cpp', '.cxx', '.h', '.hpp', '.hh',
  '.cs', '.php', '.swift', '.m', '.mm',
  '.vue', '.svelte', '.html', '.css', '.scss', '.sass', '.less',
  '.sh', '.bash', '.zsh', '.ps1',
  '.sql', '.lua', '.dart', '.ex', '.exs', '.clj', '.cljs', '.elm', '.erl'
]);

function isSourceFile(relPath: string): boolean {
  const ext = path.extname(relPath).toLowerCase();
  return SOURCE_EXTENSIONS.has(ext);
}

function looksLikeTestFile(relPath: string): boolean {
  const base = path.basename(relPath).toLowerCase();
  return (
    /\.(test|spec)\.[^.]+$/.test(base) ||
    /^test_.+/.test(base) ||
    /_test\.[^.]+$/.test(base) ||
    /_spec\.[^.]+$/.test(base)
  );
}

function levelFor(score: number): DebtLevel {
  if (score >= THRESHOLD_RED) return 'high';
  if (score >= THRESHOLD_AMBER) return 'medium';
  return 'low';
}

async function gitAvailable(workspaceRoot: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: workspaceRoot });
    return true;
  } catch {
    return false;
  }
}

async function listTrackedFiles(workspaceRoot: string): Promise<string[]> {
  const { stdout } = await execFileAsync(
    'git',
    ['ls-files', '-z'],
    { cwd: workspaceRoot, maxBuffer: 64 * 1024 * 1024 }
  );
  return stdout.split('\0').filter(Boolean);
}

interface GitFileStats {
  lastCommitEpochSec: number;
  contributors: Set<string>;
}

async function batchGitStats(workspaceRoot: string): Promise<Map<string, GitFileStats>> {
  const stats = new Map<string, GitFileStats>();
  const { stdout } = await execFileAsync(
    'git',
    ['log', '--name-only', '--pretty=format:__COMMIT__%at%x09%aE', '-M', '--no-renames'],
    { cwd: workspaceRoot, maxBuffer: 256 * 1024 * 1024 }
  );

  let currentEpoch = 0;
  let currentAuthor = '';
  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    if (line.startsWith('__COMMIT__')) {
      const rest = line.slice('__COMMIT__'.length);
      const [epochStr, author] = rest.split('\t');
      currentEpoch = Number(epochStr) || 0;
      currentAuthor = author || '';
      continue;
    }
    let entry = stats.get(line);
    if (!entry) {
      entry = { lastCommitEpochSec: currentEpoch, contributors: new Set<string>() };
      stats.set(line, entry);
    } else if (currentEpoch > entry.lastCommitEpochSec) {
      entry.lastCommitEpochSec = currentEpoch;
    }
    if (currentAuthor) entry.contributors.add(currentAuthor);
  }
  return stats;
}

function countLines(absPath: string): number {
  try {
    const buf = fs.readFileSync(absPath);
    if (buf.length === 0) return 0;
    let lines = 0;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === 0x0a) lines++;
    }
    if (buf[buf.length - 1] !== 0x0a) lines++;
    return lines;
  } catch {
    return 0;
  }
}

function hasSiblingTest(absPath: string, siblingFiles: Set<string>): boolean {
  const dir = path.dirname(absPath);
  const ext = path.extname(absPath);
  const base = path.basename(absPath, ext);

  const candidates = [
    `${base}.test${ext}`,
    `${base}.spec${ext}`,
    `test_${base}${ext}`,
    `${base}_test${ext}`,
    `${base}_spec${ext}`
  ];

  for (const candidate of candidates) {
    if (siblingFiles.has(path.join(dir, candidate))) return true;
  }
  return false;
}

function buildReasons(f: Omit<FileDebt, 'reasons' | 'level'>): string[] {
  const reasons: string[] = [];
  if (f.loc >= 500) reasons.push(`${f.loc} lines of code`);
  if (f.daysSinceCommit >= 180) reasons.push(`${f.daysSinceCommit} days since last commit`);
  if (!f.hasTest) reasons.push('no matching test file');
  if (f.contributors >= 4) reasons.push(`${f.contributors} contributors`);
  return reasons;
}

export async function analyseWorkspace(workspaceRoot: string, nowMs: number = Date.now()): Promise<AnalysisResult> {
  const hasGit = await gitAvailable(workspaceRoot);

  let trackedFiles: string[] = [];
  let gitStats = new Map<string, GitFileStats>();

  if (hasGit) {
    try {
      trackedFiles = await listTrackedFiles(workspaceRoot);
      gitStats = await batchGitStats(workspaceRoot);
    } catch {
      trackedFiles = [];
      gitStats = new Map();
    }
  }

  if (trackedFiles.length === 0) {
    trackedFiles = walkFilesystem(workspaceRoot);
  }

  const sourceFiles = trackedFiles.filter(isSourceFile).filter(rel => !looksLikeTestFile(rel));
  const allAbsPathsSet = new Set(trackedFiles.map(rel => path.join(workspaceRoot, rel)));

  const files: FileDebt[] = [];
  for (const rel of sourceFiles) {
    const abs = path.join(workspaceRoot, rel);
    const loc = countLines(abs);

    const g = gitStats.get(rel);
    let daysSinceCommit: number;
    let contributors: number;
    if (g && g.lastCommitEpochSec > 0) {
      daysSinceCommit = Math.max(0, Math.floor((nowMs / 1000 - g.lastCommitEpochSec) / 86400));
      contributors = Math.max(1, g.contributors.size);
    } else {
      daysSinceCommit = 0;
      contributors = 1;
    }

    const hasTest = hasSiblingTest(abs, allAbsPathsSet);

    const locNorm = Math.min(1, loc / LOC_CEILING);
    const ageNorm = Math.min(1, daysSinceCommit / DAYS_CEILING);
    const testNorm = hasTest ? 0 : 1;
    const contribNorm = Math.min(1, contributors / CONTRIB_CEILING);

    const score = (
      locNorm * WEIGHT_LOC +
      ageNorm * WEIGHT_AGE +
      testNorm * WEIGHT_TEST +
      contribNorm * WEIGHT_CONTRIB
    );

    const base = { absPath: abs, relPath: rel, loc, daysSinceCommit, hasTest, contributors, score };
    files.push({ ...base, level: levelFor(score), reasons: buildReasons(base) });
  }

  files.sort((a, b) => b.score - a.score);

  const averageScore = files.length
    ? files.reduce((sum, f) => sum + f.score, 0) / files.length
    : 0;

  const byPath = new Map<string, FileDebt>();
  for (const f of files) byPath.set(f.absPath, f);

  return { files, averageScore, byPath, hasGitHistory: hasGit && gitStats.size > 0 };
}

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'out', 'dist', 'build', '.next', '.nuxt',
  'target', 'venv', '.venv', '__pycache__', '.gradle', '.idea', '.vscode-test',
  'coverage', '.pytest_cache', '.mypy_cache', 'vendor'
]);

function walkFilesystem(root: string): string[] {
  const results: string[] = [];
  const stack: string[] = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
      if (IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        results.push(path.relative(root, full));
      }
    }
  }
  return results;
}
