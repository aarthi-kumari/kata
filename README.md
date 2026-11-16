# DSA + Java Practice

Two tracks, both added daily by a bot:

- **`problems/`**: DSA problems (arrays, linked lists, trees, graphs, DP…)
- **`concepts/`**: Java concepts (collections, generics, equals/hashCode, streams…). Each is a short lesson in `README.md` plus small exercises.

You write the **Java**. Tests are written in **JavaScript** and run by **Node**, which compiles your code with `javac`. Works on macOS, Linux and Windows.

## Setup (once)

```bash
# macOS
brew install openjdk@21

# Windows (PowerShell), then open a new terminal
winget install EclipseAdoptium.Temurin.21.JDK
```

Any JDK 17+ works. The runner also finds a JDK that isn't on your PATH (Homebrew, `JAVA_HOME`, or the standard `Program Files` locations).

Node 18+ is the only other requirement. There are no npm dependencies, so you don't need `npm install`.

## Daily loop

```bash
npm run list                   # every problem + its status (solved / failing / todo)
npm run watch two-sum          # open problems/.../two-sum/Solution.java, save → tests re-run
npm test two-sum               # run once
npm test -- two-sum -v         # also show inputs/outputs of passing cases (flags need the --)
npm test arrays                # run a whole topic
npm test concepts              # only the Java concept exercises
npm test problems              # only the DSA problems
npm test                       # run everything + summary
```

`System.out.println` inside your solution shows up under the test case that printed it.

All commands also work as `node scripts/run.js <args>`.

## Layout

```
problems/
  01-arrays/
    two-sum/
      README.md        problem statement, examples, constraints, hints
      Solution.java    ← you edit this
      tests.js         test cases (written by the bot)
  02-linked-list/
    reverse-linked-list/
concepts/
  01-collections/
    hashmap-essentials/
      README.md        the lesson: idea, code, gotchas
      Solution.java    ← exercises
      tests.js
lib/
  ListNode.java  TreeNode.java   shared data structures you can use in solutions
  Runner.java  Json.java         test driver internals (you never touch these)
scripts/run.js                   the Node test runner
package.json                     npm scripts (test / watch / list / new)
PROBLEM_FORMAT.md                spec for adding problems and concepts (for the daily bot)
AGENTS.md                        instructions for AI agents working in this repo
```

## How it works

1. `npm test` finds `problems/*/*/tests.js` and `concepts/*/*/tests.js`.
2. Compiles `lib/` and your `Solution.java` with `javac` into `out/` (cached until you change the file).
3. Starts one JVM per problem running `lib/Runner.java`, sends the test inputs as JSON on stdin.
4. Runner converts JSON into your method's parameter types (`int[]`, `List<List<Integer>>`, `ListNode`, `TreeNode`, `char[][]`, …) by reflection, calls it with a per-case timeout, and sends the output back as JSON.
5. Node compares against `expected` and prints PASS/FAIL.

## Adding problems

```bash
npm run new arrays best-time-to-buy-sell-stock   # scaffolds README.md, Solution.java, tests.js
npm run new-concept collections arraydeque       # same, under concepts/
```

See [PROBLEM_FORMAT.md](PROBLEM_FORMAT.md) for the `tests.js` options.

## Re-practicing a problem

Commit your solution, then restore the template with `git log -- <path>` / `git checkout <first-commit> -- <path>/Solution.java`.
