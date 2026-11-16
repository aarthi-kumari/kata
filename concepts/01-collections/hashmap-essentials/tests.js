// Concept exercises: each case names the method it calls.
const repeat = (word, n) => Array.from({ length: n }, () => word);
const many = [...repeat('x', 1000), ...repeat('y', 1000), 'z'];

module.exports = {
  cases: [
    { method: 'wordFrequency', name: 'wordFrequency: basic', input: [['a', 'b', 'a', 'c', 'a', 'b']], expected: { a: 3, b: 2, c: 1 } },
    { method: 'wordFrequency', name: 'wordFrequency: empty', input: [[]], expected: {} },
    { method: 'wordFrequency', name: 'wordFrequency: case-sensitive', input: [['Go', 'go', 'GO', 'go']], expected: { Go: 1, go: 2, GO: 1 } },

    // JSON object keys are strings, so Integer keys 1, 3 appear as "1", "3" here.
    { method: 'groupByLength', name: 'groupByLength: basic', input: [['hi', 'cat', 'a', 'dog', 'yo']], expected: { 1: ['a'], 2: ['hi', 'yo'], 3: ['cat', 'dog'] } },
    { method: 'groupByLength', name: 'groupByLength: keeps input order', input: [['bb', 'aa', 'cc']], expected: { 2: ['bb', 'aa', 'cc'] } },

    { method: 'firstUniqueIndex', name: 'firstUniqueIndex: "leetcode"', input: ['leetcode'], expected: 0 },
    { method: 'firstUniqueIndex', name: 'firstUniqueIndex: "loveleetcode"', input: ['loveleetcode'], expected: 2 },
    { method: 'firstUniqueIndex', name: 'firstUniqueIndex: none', input: ['aabb'], expected: -1 },
    { method: 'firstUniqueIndex', name: 'firstUniqueIndex: empty', input: [''], expected: -1 },

    { method: 'sameCount', name: 'sameCount: small, equal', input: [['x', 'y', 'x', 'y'], 'x', 'y'], expected: true },
    { method: 'sameCount', name: 'sameCount: small, different', input: [['x', 'y', 'x'], 'x', 'y'], expected: false },
    { method: 'sameCount', name: 'sameCount: one word missing', input: [['x'], 'x', 'q'], expected: false },
    { method: 'sameCount', name: 'sameCount: both missing', input: [['x'], 'p', 'q'], expected: true },
    { method: 'sameCount', name: 'sameCount: 1000 each (Integer == trap)', input: [many, 'x', 'y'], expected: true },
  ],
};
