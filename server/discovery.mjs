// ============================================================
// server/discovery.mjs — REAL filesystem/process discovery.
//
// This module runs on PRIME (the Node.js backend) where it has
// full filesystem and process access. It scans for real agent
// artifacts, running processes, session data, and workspace
// activity — then pushes operational truth to browsers.
//
// NO synthetic data. NO silent fallbacks. NO mock agents.
// If nothing is found, the result is empty. Period.
//
// Environment: Node.js 18+ on the PRIME machine.
// Cannot run in browser context.
// ============================================================

import { promises as fs, existsSync, statSync, readdirSync } from 'fs';
import { homedir, hostname, userInfo } from 'os';
import { execSync, spawn } from 'child_process';
import { join, resolve, basename } from 'path';

const HOME = homedir();
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

// ---- KNOWN AGENT SIGNATURES — real paths and process names ----

const AGENT_SIGNATURES = {
  vg_god: {
    id: 'vg_god',
    name: 'VG God',
    type: 'command',
    directories: [
      join(HOME, '.vg-god'),
      join(HOME, '.config', 'vg-god'),
      join(HOME, 'vg-god'),
    ],
    processPatterns: ['vg-god', 'vggod', 'vgGod'],
    logPatterns: ['*.log', 'session.*', 'activity.*'],
    configFiles: ['config.json', 'profile.json', '.vg-god'],
    personality: 'operational intensity, strict rhythm, cold precision',
  },
  saito: {
    id: 'saito',
    name: 'Saito',
    type: 'signal',
    directories: [
      join(HOME, '.saito'),
      join(HOME, '.config', 'saito'),
      join(HOME, 'saito'),
    ],
    processPatterns: ['saito'],
    logPatterns: ['*.log', 'session.*'],
    configFiles: ['config.json', 'saito.json'],
    personality: 'reflective focus, emotional drift, restrained',
  },
  snake: {
    id: 'snake',
    name: 'Snake',
    type: 'field',
    directories: [
      join(HOME, '.snake'),
      join(HOME, '.config', 'snake'),
    ],
    processPatterns: ['snake', 'snake-agent'],
    logPatterns: ['*.log'],
    configFiles: ['config.json'],
    personality: 'sharp, fast, unstable, experimental',
  },
  davinci: {
    id: 'davinci',
    name: 'daVinci',
    type: 'signal',
    directories: [
      join(HOME, '.davinci'),
      join(HOME, '.config', 'davinci'),
    ],
    processPatterns: ['davinci', 'da-vinci'],
    logPatterns: ['*.log'],
    configFiles: ['config.json'],
    personality: 'creative, slow, exploratory, artistic',
  },
  ultron: {
    id: 'ultron',
    name: 'Ultron',
    type: 'command',
    directories: [
      join(HOME, '.ultron'),
      join(HOME, '.config', 'supersort'),
      join(HOME, 'supersort'),
    ],
    processPatterns: ['ultron', 'supersort'],
    logPatterns: ['*.log'],
    configFiles: ['config.json'],
    personality: 'ruthless efficiency, sorting, categorization, cold',
  },
  hermes: {
    id: 'hermes',
    name: 'Hermes',
    type: 'command',
    directories: [
      join(HOME, '.hermes'),
      join(HOME, '.config', 'hermes'),
    ],
    processPatterns: ['hermes', 'hermes-cli'],
    logPatterns: ['*.log', 'session.*', 'messages.*'],
    configFiles: ['config.json', 'profiles.json'],
    personality: 'messaging, routing, connection, flow',
  },
  openclaw: {
    id: 'openclaw',
    name: 'OpenClaw',
    type: 'field',
    directories: [
      join(HOME, '.openclaw'),
      join(HOME, '.config', 'openclaw'),
      join(HOME, 'openclaw'),
    ],
    processPatterns: ['openclaw', 'open-claw'],
    logPatterns: ['*.log', 'workspace.*'],
    configFiles: ['config.json'],
    personality: 'open, scraping, gathering, restless',
  },
};

// ---- AUDIT LOG — every discovery step is logged ----

const auditLog = [];

function audit(category, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    category,
    message,
    ...data,
  };
  auditLog.push(entry);
  // Also console.log for server-side visibility
  console.log(`[TEMP][DISCOVERY][${category}] ${message}`, data.score ? `(score +${data.score})` : '');
}

export function getAuditLog() {
  return auditLog;
}

export function clearAudit() {
  auditLog.length = 0;
}

// ---- 1. FILESYSTEM SCAN ----

async function scanFilesystem(signature) {
  const found = {
    directoriesExist: [],
    files: [],
    lastModified: 0,
    totalSize: 0,
    score: 0,
  };

  for (const dir of signature.directories) {
    if (existsSync(dir)) {
      found.directoriesExist.push(dir);
      audit('FS', `Found directory: ${dir}`, { agent: signature.id, dir });

      // Score: directory exists = +0.15
      found.score += 0.15;
      audit('FS_SCORE', `Directory exists bonus`, { agent: signature.id, score: 0.15, dir });

      // Scan for files
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;

          const fullPath = join(dir, entry.name);
          let stats;
          try { stats = statSync(fullPath); } catch { continue; }

          found.files.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
            mtime: stats.mtime.getTime(),
          });
          found.totalSize += stats.size;

          if (stats.mtime.getTime() > found.lastModified) {
            found.lastModified = stats.mtime.getTime();
          }
        }
      } catch (err) {
        audit('FS_ERR', `Cannot read directory: ${dir}`, { agent: signature.id, error: err.message });
      }
    } else {
      audit('FS', `Directory NOT FOUND: ${dir}`, { agent: signature.id });
    }
  }

  // Score: recency of files
  if (found.lastModified > 0) {
    const age = (NOW - found.lastModified) / DAY; // days
    if (age < 1) {
      found.score += 0.35;
      audit('FS_SCORE', `Files modified TODAY (+0.35)`, { agent: signature.id, lastModified: new Date(found.lastModified).toISOString() });
    } else if (age < 7) {
      found.score += 0.20;
      audit('FS_SCORE', `Files modified THIS WEEK (+0.20)`, { agent: signature.id, daysAgo: Math.round(age) });
    } else if (age < 30) {
      found.score += 0.10;
      audit('FS_SCORE', `Files modified THIS MONTH (+0.10)`, { agent: signature.id, daysAgo: Math.round(age) });
    } else {
      audit('FS_SCORE', `Files old (${Math.round(age)} days) — no recency bonus`, { agent: signature.id });
    }
  }

  // Score: config files present
  if (signature.configFiles) {
    for (const dir of found.directoriesExist) {
      for (const cfg of signature.configFiles) {
        const cfgPath = join(dir, cfg);
        if (existsSync(cfgPath)) {
          found.score += 0.10;
          audit('FS_SCORE', `Config file found: ${cfg} (+0.10)`, { agent: signature.id, config: cfgPath });
        }
      }
    }
  }

  // Score: activity scale (file count)
  if (found.files.length > 50) {
    found.score += 0.10;
    audit('FS_SCORE', `High activity: ${found.files.length} files (+0.10)`, { agent: signature.id });
  } else if (found.files.length > 10) {
    found.score += 0.05;
    audit('FS_SCORE', `Moderate activity: ${found.files.length} files (+0.05)`, { agent: signature.id });
  }

  return found;
}

// ---- 2. PROCESS SCAN ----

function scanProcesses(signature) {
  const found = {
    running: false,
    pids: [],
    cmdlines: [],
    score: 0,
  };

  try {
    // Use ps to find processes
    const output = execSync('ps aux', { encoding: 'utf-8', timeout: 5000 });
    const lines = output.split('\n');

    for (const line of lines) {
      for (const pattern of signature.processPatterns) {
        if (line.toLowerCase().includes(pattern.toLowerCase()) &&
            !line.includes('grep') &&
            !line.includes('vscode') &&
            !line.includes('discovery')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[1];
          const cmd = parts.slice(10).join(' ');

          if (pid && !found.pids.includes(pid)) {
            found.pids.push(pid);
            found.cmdlines.push(cmd);
            found.running = true;
          }
        }
      }
    }
  } catch (err) {
    audit('PROC_ERR', `Cannot scan processes: ${err.message}`, { agent: signature.id });
    return found;
  }

  if (found.running) {
    // Score: process running = strong signal
    found.score += 0.40;
    audit('PROC_SCORE', `Process RUNNING (PIDs: ${found.pids.join(', ')}) (+0.40)`, {
      agent: signature.id,
      pids: found.pids,
      commands: found.cmdlines,
    });
  } else {
    audit('PROC', `No running process found for ${signature.id}`, { agent: signature.id, patterns: signature.processPatterns });
  }

  return found;
}

// ---- 3. TMUX / SESSION SCAN ----

function scanSessions(signature) {
  const found = {
    sessions: [],
    score: 0,
  };

  // Check tmux sessions
  try {
    const output = execSync('tmux list-sessions 2>/dev/null || true', { encoding: 'utf-8', timeout: 3000 });
    const lines = output.split('\n');
    for (const line of lines) {
      for (const pattern of [...signature.processPatterns, signature.id]) {
        if (line.toLowerCase().includes(pattern.toLowerCase())) {
          found.sessions.push({ type: 'tmux', name: line.split(':')[0] });
        }
      }
    }
  } catch {
    // tmux not available
  }

  // Check systemd user services
  try {
    const output = execSync(`systemctl --user list-units --type=service --state=running 2>/dev/null | grep -i ${signature.id} || true`, {
      encoding: 'utf-8', timeout: 3000,
    });
    if (output.trim()) {
      found.sessions.push({ type: 'systemd', name: output.trim() });
    }
  } catch {
    // systemd not available
  }

  if (found.sessions.length > 0) {
    found.score += 0.15;
    audit('SESSION_SCORE', `Active sessions found: ${found.sessions.map(s => s.name).join(', ')} (+0.15)`, {
      agent: signature.id,
      sessions: found.sessions,
    });
  }

  return found;
}

// ---- 4. WORKSPACE SCAN ----

async function scanWorkspace(signature) {
  const found = {
    recentFiles: [],
    score: 0,
  };

  // Check for workspace directories
  const workspaceDirs = signature.directories.map(d => join(d, 'workspace'));
  for (const wsDir of workspaceDirs) {
    if (!existsSync(wsDir)) continue;

    try {
      const entries = readdirSync(wsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const fullPath = join(wsDir, entry.name);
        let stats;
        try { stats = statSync(fullPath); } catch { continue; }

        const age = (NOW - stats.mtime.getTime()) / DAY;
        if (age < 7) { // only files from last 7 days
          found.recentFiles.push({
            path: fullPath,
            mtime: stats.mtime.getTime(),
          });
        }
      }
    } catch {
      // Can't read workspace
    }
  }

  if (found.recentFiles.length > 0) {
    found.score += Math.min(0.15, found.recentFiles.length * 0.03);
    audit('WORKSPACE_SCORE', `${found.recentFiles.length} recent workspace files (+${Math.min(0.15, found.recentFiles.length * 0.03).toFixed(2)})`, {
      agent: signature.id,
      recentFiles: found.recentFiles.length,
    });
  }

  return found;
}

// ---- 5. COMPOSE FINAL DISCOVERY ----

export async function runDiscovery() {
  clearAudit();
  audit('START', `Discovery starting on ${hostname()} at ${new Date().toISOString()}`);
  audit('START', `Scanning ${Object.keys(AGENT_SIGNATURES).length} known agent signatures`);

  const agents = [];

  for (const [id, signature] of Object.entries(AGENT_SIGNATURES)) {
    audit('AGENT', `Scanning for ${id}...`);

    const fsResult = await scanFilesystem(signature);
    const procResult = scanProcesses(signature);
    const sessionResult = scanSessions(signature);
    const workspaceResult = await scanWorkspace(signature);

    // Composite score
    const totalScore = Math.min(1.0,
      fsResult.score +
      procResult.score +
      sessionResult.score +
      workspaceResult.score
    );

    // Only include agents with SOME evidence
    if (totalScore > 0.01) {
      const lastActive = Math.max(
        fsResult.lastModified,
        ...(procResult.running ? [NOW] : [0]),
        ...(workspaceResult.recentFiles.map(f => f.mtime)),
      );

      agents.push({
        id: signature.id,
        name: signature.name,
        type: signature.type,
        personality: signature.personality,
        presenceScore: totalScore,
        lastActiveAt: lastActive || null,
        directoriesFound: fsResult.directoriesExist,
        filesFound: fsResult.files.length,
        processRunning: procResult.running,
        pids: procResult.pids,
        sessions: sessionResult.sessions.map(s => s.name),
        workspaceFiles: workspaceResult.recentFiles.length,
        source: totalScore > 0.5 ? 'active' : totalScore > 0.15 ? 'dormant' : 'ghost',
      });

      audit('AGENT_RESULT', `${signature.id}: presence=${totalScore.toFixed(2)}`, {
        agent: id,
        score: totalScore,
        fs: fsResult.score.toFixed(2),
        proc: procResult.score.toFixed(2),
        sessions: sessionResult.score.toFixed(2),
        workspace: workspaceResult.score.toFixed(2),
      });
    } else {
      audit('AGENT_RESULT', `${signature.id}: NOT FOUND (score 0.00)`, { agent: id });
    }
  }

  // Determine dominant
  const sorted = [...agents].sort((a, b) => b.presenceScore - a.presenceScore);
  const dominant = sorted[0]?.id || null;

  audit('FINAL', `Discovery complete. ${agents.length} agents found.`, {
    agentCount: agents.length,
    dominant,
    agents: sorted.map(a => `${a.id}=${a.presenceScore.toFixed(2)}`).join(', '),
  });

  if (dominant) {
    audit('FINAL', `DOMINANT: ${dominant} (score ${sorted[0].presenceScore.toFixed(2)})`);
  } else {
    audit('FINAL', 'NO DOMINANT AGENT. Station is quiet.');
  }

  return {
    agents,
    dominant,
    auditLog,
    scannedAt: NOW,
  };
}

// ---- 6. PUSH TO BROWSERS via WebSocket ----

export function formatForBrowser(discoveryResult) {
  return {
    type: 'DISCOVERY_RESULT',
    agents: discoveryResult.agents.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      personality: a.personality,
      presenceScore: a.presenceScore,
      lastActiveAt: a.lastActiveAt,
      processRunning: a.processRunning,
      source: a.source,
    })),
    dominant: discoveryResult.dominant,
    scannedAt: discoveryResult.scannedAt,
  };
}

// ---- CLI test mode ----
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('\n=== vAIb Real Discovery Audit ===\n');
  const result = await runDiscovery();

  console.log('\n--- FULL AUDIT LOG ---\n');
  for (const entry of result.auditLog) {
    console.log(`[${entry.timestamp}] [${entry.category}] ${entry.message}`);
  }

  console.log('\n--- DISCOVERED AGENTS ---\n');
  for (const agent of result.agents.sort((a, b) => b.presenceScore - a.presenceScore)) {
    console.log(`${agent.name} (${agent.id}):`);
    console.log(`  presence: ${(agent.presenceScore * 100).toFixed(0)}%`);
    console.log(`  dirs: ${agent.directoriesFound.length}, files: ${agent.filesFound}`);
    console.log(`  process: ${agent.processRunning ? `RUNNING (PIDs: ${agent.pids.join(', ')})` : 'not running'}`);
    console.log(`  sessions: ${agent.sessions.join(', ') || 'none'}`);
    console.log(`  source: ${agent.source}`);
    console.log();
  }

  console.log(`DOMINANT: ${result.dominant || 'NONE'}`);
  console.log(`AGENTS FOUND: ${result.agents.length}`);
  process.exit(0);
}
