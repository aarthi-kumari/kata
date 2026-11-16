// Linked lists are written as plain arrays; the runner converts them to/from ListNode.
const long = Array.from({ length: 5000 }, (_, i) => i - 2500);

module.exports = {
  method: 'reverseList',
  cases: [
    { name: 'example 1', input: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
    { name: 'two nodes', input: [[1, 2]], expected: [2, 1] },
    { name: 'empty list', input: [[]], expected: [] },
    { name: 'single node', input: [[7]], expected: [7] },
    { name: 'duplicates', input: [[1, 1, 2, 2]], expected: [2, 2, 1, 1] },
    { name: '5000 nodes', input: [long], expected: [...long].reverse() },
  ],
};
