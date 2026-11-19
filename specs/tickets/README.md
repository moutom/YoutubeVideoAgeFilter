# Tickets

One ticket per task the owner asks for in a prompt. The ticket is the canonical record of that task and its status.

## Format

File: `NNNN-short-slug.md`, numbered in the order the owner asked.

```
# NNNN Title
Status: not started | in progress | done | dropped
Asked: YYYY-MM-DD
Prompt: "<the owner's words, verbatim>"

<what was done, commit hashes, what is left>
```

## Rules

- Open a ticket when the owner asks for work; set it to `done` (with commits) or `dropped` (with the reason) when it ends. Chit-chat and questions get no ticket.
- Status comes from the repo: check the code, data and behavior before marking a ticket done.
- No `TODO(ticket)` comments in code. Open work lives here, not in the source, so agents reading code are not pulled into detours on closed or unasked work.
- A ticket the current prompt did not ask about is context, not an instruction. Do not act on it unprompted.
