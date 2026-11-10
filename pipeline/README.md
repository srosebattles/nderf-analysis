# Coding in-session (prototype)

A way to run the coding passes through Claude Code's non-interactive mode (`claude -p`) on the
subscription Claude Code is logged in with, instead of paying for the API. Built to compare with
an API pipeline before choosing one; nothing here has coded an account yet.

```bash
npm run pass -- ../nderf-raw-data --pass probe-religion --model claude-sonnet-5-5 --effort low --practice --limit 5 --dry-run
```

## How one account is coded

- **One fresh process per account** (`claude-code.ts`), in an empty working directory, so nothing
  carries over from one account to the next and nothing is summarized partway.
- **Only the coding prompt.** It replaces Claude Code's own system prompt. No tools, no MCP
  servers, no settings files, no CLAUDE.md or other customizations, and nothing saved to disk.
- **Only what the experiencer wrote** (`coder-input.ts`): narratives and NDERF's questions with
  the answers, each labeled with the place evidence points to. Never NDERF's classification,
  tags, summary, or dates, and never the account ID, which carries NDERF's classification in its
  name; the coder gets a neutral key (`A0007`) and the runner puts the ID back.
- **The model is pinned.** No fallback model, and Claude Code reports which model served each
  call; a call any other model touched is rejected.
- **Structured output.** The answer is constrained to the pass's JSON Schema, then validated
  again with zod, cross-field rules included. A failure is retried once, in a fresh call, with
  the problems listed; a second failure is logged and nothing is kept.
- **Everything is kept privately** (`run-pass.ts`): each attempt's full result, the coded answer,
  and a log line per account with tokens and time, under `<data>/llm-raw/<runId>/`. A run is
  resumable, and refuses to continue if the prompt, schema, model, or effort changed.

## What was checked (November 10, 2026)

On invented text only, so no account has been sent anywhere yet:

- The plumbing, end to end, against a stand-in for `claude` (`run-pass.test.ts`): pinning, the
  neutral key, the retry, rejection of another model's answer, and resuming.
- Real calls on an invented account, with the probe pass (area 2's religion and heritage
  statements, a real slice of the schema): the answer validated with zod; about 8 seconds a
  call; the instructions and schema were cached between separate processes (about 5,000 tokens
  read from the cache on the second call).
- Two things had to be fixed for real calls: Claude Code's own schema check knows only draft 7,
  while the API wants draft 2020-12, so tuples (evidence spans) are rewritten as fixed-length
  lists and formats are dropped (`forClaudeCode`).

## Still open

- **Data terms.** Coding through a personal subscription sends the accounts through it, so the
  account's setting for using conversations to train models must be off; NDERF permits private
  research use only. Confirmed off by the project's author (November 10, 2026).
- **Usage limits.** The plan is Claude Pro, whose usage resets in five-hour windows. How much of
  a window one account uses isn't known; the probe on a few practice pages will show it.
- **Quotes.** The pipeline turns a short quote from the coder into character offsets. The
  model-facing schema needs a quote field for that, and the step that locates and strips it.
- **The real passes.** How to split the first run into passes, and each pass's prompt.
- **Variation.** The same invented account, coded twice, gave different amounts of output (and
  thinking on one call, none on the other). Agreement between runs needs measuring like
  agreement between coders.
