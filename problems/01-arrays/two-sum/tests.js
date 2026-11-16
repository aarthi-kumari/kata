// Large input: 1..N, the only pair summing to 2N-1 is the last two. O(n^2) will time out.
const N = 200000;
const big = Array.from({ length: N }, (_, i) => i + 1);

module.exports = {
  method: 'twoSum',
  compare: 'unordered', // indices may be returned in any order
  timeoutMs: 2000,
  cases: [
    { name: 'example 1', input: [[2, 7, 11, 15], 9], expected: [0, 1] },
    { name: 'example 2', input: [[3, 2, 4], 6], expected: [1, 2] },
    { name: 'duplicate values', input: [[3, 3], 6], expected: [0, 1] },
    { name: 'negatives', input: [[-3, 4, 3, 90], 0], expected: [0, 2] },
    { name: 'answer at the end', input: [[1, 5, 3, 2, 8], 10], expected: [3, 4] },
    { name: 'large input (needs O(n))', input: [big, 2 * N - 1], expected: [N - 2, N - 1] },
  ],
};
