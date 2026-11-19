// Enforces specs/tickets/README.md: work done in a turn must open or update a ticket in specs/tickets/.
// UserPromptSubmit: snapshot HEAD + dirty files, remind the next free ticket number.
// Stop: if the turn changed repo files but no ticket, block the stop once with a reason.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TICKETS = 'specs/tickets/';

// Files the turn touched outside specs/tickets, and whether any ticket was touched.
function verdict(baseDirty, nowChanged) {
  const fresh = nowChanged.filter(f => !baseDirty.includes(f));
  const ticket = fresh.some(f => f.startsWith(TICKETS));
  const work = fresh.filter(f => !f.startsWith(TICKETS));
  return { block: work.length > 0 && !ticket, work };
}

function git(cwd, args) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; }
}
const dirty = cwd => git(cwd, ['status', '--porcelain', '-uall']).split('\n').filter(Boolean).map(l => l.slice(3).replace(/^"|"$/g, ''));

function main() {
  const event = process.argv[2];
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const cwd = git(input.cwd || process.cwd(), ['rev-parse', '--show-toplevel']).trim();
  if (!cwd) return;
  const state = path.join(os.tmpdir(), `cw-ticket-guard-${input.session_id || 'x'}.json`);
  if (event === 'prompt') {
    fs.writeFileSync(state, JSON.stringify({ head: git(cwd, ['rev-parse', 'HEAD']).trim(), dirty: dirty(cwd) }));
    const nums = fs.readdirSync(path.join(cwd, TICKETS)).map(f => parseInt(f, 10)).filter(n => n > 0);
    const next = String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0');
    console.log(`Ticket rule (specs/tickets/README.md): if this prompt asks for work, open specs/tickets/${next}-<slug>.md (or update the ticket it continues) with Status and the verbatim prompt; close it with commits.`);
    return;
  }
  if (event === 'stop') {
    if (input.stop_hook_active || !fs.existsSync(state)) return;
    const base = JSON.parse(fs.readFileSync(state, 'utf8'));
    const committed = base.head ? git(cwd, ['diff', '--name-only', `${base.head}..HEAD`]).split('\n').filter(Boolean) : [];
    const v = verdict(base.dirty, [...new Set([...committed, ...dirty(cwd)])]);
    if (v.block) console.log(JSON.stringify({ decision: 'block',
      reason: `This turn changed ${v.work.slice(0, 5).join(', ')}${v.work.length > 5 ? ' ...' : ''} but no ticket in specs/tickets/. Open or update the ticket for this prompt (specs/tickets/README.md), commit and push it, then stop.` }));
  }
}

if (require.main === module) main();
module.exports = { verdict };
