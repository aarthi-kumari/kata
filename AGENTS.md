# DSA + Java practice repo

The user practices DSA problems (`problems/`) and Java concepts (`concepts/`) by writing Java solutions. Tests are JS (`tests.js`), run by `npm test` (Node, `scripts/run.js`), which compiles Java via `javac`.

- When adding problems or concepts (e.g. the daily bot), follow **PROBLEM_FORMAT.md** exactly. It covers the rules, the tests.js format and both roadmaps.
- Must work on macOS and Windows: no shell scripts, use Node's `path` for paths, and don't assume `\n` line endings.
- Never edit or overwrite an existing `Solution.java` in `problems/` or `concepts/`; it holds the user's work.
- When the user asks for help on a problem, prefer hints over full solutions unless they ask for the answer.
