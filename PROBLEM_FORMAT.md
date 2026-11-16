# Problem & concept format

This file is the contract for whoever adds problems or concepts, human or the daily bot.

## Rules for the daily bot

1. Each day, add **1–2 DSA problems** under `problems/` and **1 Java concept** under `concepts/` (see the concepts section below). Follow a sensible topic progression (see the roadmap below); within a topic, go roughly Easy → Medium → Hard.
2. **Never modify an existing `Solution.java`**. It may contain the user's work. Don't touch `lib/` or `scripts/` unless asked.
3. Never put a working solution in the repo. `Solution.java` is always a stub that throws `UnsupportedOperationException()` (no message; the runner uses this to report "not implemented yet").
4. Before adding a problem, check `npm run list` / the `problems/` tree so you don't duplicate one.
5. Write original problem statements in your own words. Classic problems are fine (two sum, LRU cache…) but don't copy text from LeetCode or other sites.
6. **Verify every new problem**: write a correct reference solution in a temp copy, confirm `npm test <slug>` passes all cases, then restore the stub. Expected values must be computed, not guessed. Also confirm that the stub shows `not implemented yet`.
7. Include at least 5 cases: the README's examples, edge cases (empty, single element, duplicates, negatives, min/max values), and for anything with an efficiency goal, **one large input that times out on the naive approach**.
8. Commit with a message like `add: problems/03-stack/valid-parentheses, concepts/02-strings/stringbuilder`.

## Folder

```
problems/<NN-topic>/<slug>/
  README.md
  Solution.java
  tests.js
```

`npm run new <topic> <slug>` scaffolds this. Topics are numbered folders (`01-arrays`, `02-linked-list`, …); create the next number for a new topic.

## README.md

Title, then `**Topic:** … **Difficulty:** Easy|Medium|Hard **Added:** YYYY-MM-DD`, a statement, examples, constraints, the complexity **Goal**, and 1–3 hints inside `<details>` blocks. See `problems/01-arrays/two-sum/README.md`.

## Solution.java

- Default package, class named `Solution` (not public is fine), `import java.util.*;` at the top.
- One public method with LeetCode-style signature. The body is `// TODO` + `throw new UnsupportedOperationException();`.
- For design problems, the class is named after the thing being designed (e.g. `class MinStack { ... }`), each method stubbed the same way. The file is still called `Solution.java`.

## tests.js

A CommonJS module. Since it's JS, you can generate large inputs with loops.

```js
module.exports = {
  method: 'twoSum',          // method on Solution to call
  compare: 'unordered',      // optional, default 'exact'
  timeoutMs: 2000,           // optional per-case timeout, default 2000
  outputArg: 0,              // optional: for void/in-place methods, which argument to compare after the call
  cases: [
    { name: 'example 1', input: [[2, 7, 11, 15], 9], expected: [0, 1] },
    //                   ^ array of arguments, in order
    { method: 'otherMethod', name: '...', input: [1], expected: 2 },
    // ^ optional per-case method override (used by concepts with several exercises)
  ],
};
```

### Type mapping (JSON ↔ Java)

| JSON in tests.js            | Java parameter / return type                        |
|-----------------------------|-----------------------------------------------------|
| `5`                         | `int`, `long`, `double`, `Integer`, …               |
| `true`                      | `boolean`                                           |
| `"abc"`                     | `String`                                            |
| `"a"`                       | `char` (returned chars come back as 1-char strings) |
| `[1, 2, 3]`                 | `int[]`, `long[]`, `List<Integer>`, `Set<Integer>`  |
| `[[1, 2], [3]]`             | `int[][]`, `List<List<Integer>>`                    |
| `[["a","b"],["c","d"]]`     | `char[][]`, `String[][]`                            |
| `[1, 2, 3]`                 | `ListNode` (linked list 1→2→3; `[]` = null)         |
| `[3, 9, 20, null, null, 15, 7]` | `TreeNode` (LeetCode level order; `[]` = null)  |
| `{"a": 1}`                  | `Map<String, Integer>`                              |

Void methods: the runner reports the (mutated) first argument, or the one at `outputArg`.

### Compare modes

| mode              | use when                                                        |
|-------------------|-----------------------------------------------------------------|
| `'exact'`         | default; deep equality                                          |
| `'unordered'`     | top-level order doesn't matter (e.g. Two Sum indices)           |
| `'unorderedDeep'` | order doesn't matter at any level (subsets, group anagrams)     |
| `'approx'`        | floating point; numbers within 1e-5                             |
| `(actual, expected, input) => boolean` | several valid answers; validate the property instead |

### Design problems (class with operations)

```js
module.exports = {
  design: true,
  cases: [
    {
      name: 'example 1',
      input: {
        ops:  ['MinStack', 'push', 'push', 'getMin', 'pop', 'getMin'],
        args: [[],         [3],    [1],    [],       [],    []],
      },
      expected: [null, null, null, 1, null, 3],   // null for constructor and void calls
    },
  ],
};
```

## Topic roadmap (problems)

01 arrays & hashing → 02 linked list → 03 stack → 04 two pointers → 05 sliding window → 06 binary search → 07 recursion & backtracking → 08 trees → 09 heap / priority queue → 10 graphs (BFS/DFS) → 11 dynamic programming (1D) → 12 dynamic programming (2D) → 13 greedy → 14 intervals → 15 tries → 16 union-find → 17 advanced graphs (Dijkstra, topo sort) → 18 bit manipulation

## Java concepts (`concepts/`)

Same folder layout, runner and `tests.js` format as problems; scaffold with `npm run new-concept <topic> <slug>`.

- **README.md is the lesson** and the most important file. Sections: *The idea* (what it is and why it matters, especially for DSA/interviews), *In code* (short runnable snippets), *Gotchas* (real traps, e.g. `Integer ==`), *Exercises* (one line per method). Keep it readable in about 5 minutes.
- **Solution.java** has 3–4 small exercise methods, each a stub throwing `UnsupportedOperationException()` with a one-line TODO hint. Tests pick the method per case with `method: '...'`.
- **Tests should catch the gotcha.** Write at least one case that fails for the naive or buggy approach the README warns about (see `hashmap-essentials`, where a 1000-count case catches `Integer ==`). Verify this by running a buggy version too.
- For behaviour that's about classes (equals/hashCode, immutability, iterators, interfaces), use design mode (`design: true`) or have the exercise return something observable.
- Concepts that can't be tested by input/output (e.g. GC, JIT) are fine as README-only lessons, but pair them with an exercise on something observable nearby.

See `concepts/01-collections/hashmap-essentials/` for the reference example.

### Concept roadmap

01 collections (HashMap ✔, ArrayList vs LinkedList, ArrayDeque as stack/queue, PriorityQueue + Comparator, TreeMap/TreeSet, Iterator & ConcurrentModificationException) → 02 strings (immutability, StringBuilder, char arithmetic, String pool & `==`) → 03 object basics (equals & hashCode contract, Comparable vs Comparator, toString) → 04 generics (type params, bounded types, wildcards, type erasure) → 05 OOP (interfaces vs abstract classes, polymorphism, records, enums, sealed classes) → 06 functional (lambdas, functional interfaces, method references, streams, Optional) → 07 numbers (integer overflow, `long` vs `int`, `Math.floorMod`, bit operations, BigInteger) → 08 exceptions (checked vs unchecked, try-with-resources) → 09 memory & JVM (stack vs heap, pass-by-value, recursion depth, garbage collection) → 10 concurrency (threads, ExecutorService, synchronized, volatile, ConcurrentHashMap, CompletableFuture)
