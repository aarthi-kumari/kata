# HashMap Essentials

**Topic:** Collections  **Added:** 2026-11-16

## The idea

`HashMap<K, V>` stores key → value pairs. `get`, `put`, `containsKey` and `remove` are **O(1) on average**. It's the most-used data structure in DSA after arrays: counting things, remembering where you saw something, and grouping.

## In code

```java
Map<String, Integer> count = new HashMap<>();

// Counting, three ways (all equivalent):
count.put(w, count.getOrDefault(w, 0) + 1);
count.merge(w, 1, Integer::sum);           // "put 1, or add 1 to what's there"
count.compute(w, (k, v) -> v == null ? 1 : v + 1);

// Grouping: create the list the first time you see a key
Map<Integer, List<String>> byLen = new HashMap<>();
byLen.computeIfAbsent(w.length(), k -> new ArrayList<>()).add(w);

// Iterating
for (Map.Entry<String, Integer> e : count.entrySet()) {
    String key = e.getKey();
    int value = e.getValue();
}
```

Which map to pick:

| Map             | Iteration order          | Cost of get/put |
|-----------------|--------------------------|-----------------|
| `HashMap`       | effectively random       | O(1) average    |
| `LinkedHashMap` | insertion order          | O(1) average    |
| `TreeMap`       | sorted by key            | O(log n)        |

## Gotchas

- **`Integer == Integer` is a trap.** Map values are boxed `Integer` objects. `==` compares *references*. Java caches the objects for −128..127, so `==` *seems* to work in small tests and then breaks on large counts. Use `.equals()`, or unbox to `int` first.
  ```java
  Integer a = 1000, b = 1000;
  a == b        // false!
  a.equals(b)   // true
  (int) a == b  // true (unboxed)
  ```
- `map.get(missingKey)` returns `null`. Unboxing it (`int x = map.get(k)`) throws `NullPointerException`. Use `getOrDefault`.
- Never rely on `HashMap` iteration order. If order matters, use `LinkedHashMap` or `TreeMap`.
- Mutable keys (e.g. a `List` you later modify) break the map: the key ends up stored under its old hash.

## Exercises (Solution.java)

1. `wordFrequency(String[] words)`: map each word → how many times it appears.
2. `groupByLength(String[] words)`: map word length → the words of that length, in input order.
3. `firstUniqueIndex(String s)`: index of the first character that appears exactly once, or `-1`.
4. `sameCount(String[] words, String a, String b)`: do `a` and `b` appear the same number of times? (Read the first gotcha. The tests include large counts.)
