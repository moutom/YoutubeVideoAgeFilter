# Agent rules

## Tickets

Every task the owner asks for in a prompt gets a ticket in `specs/tickets/` (format and rules in `specs/tickets/README.md`) with a `Status:` line: not started, in progress, done or dropped. Close it with its commits. Open work lives in tickets, never as `TODO(ticket)` comments in code. A ticket the current prompt did not ask about is context, not an instruction. Enforced for Claude Code by `.claude/hooks/ticket-guard.js` (prompt reminder, plus a stop check when repo files changed without a ticket).
