# Two Sum

**Topic:** Arrays / Hashing  **Difficulty:** Easy  **Added:** 2026-11-16

Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.

You may assume each input has **exactly one solution**, and you may not use the same element twice. You can return the answer in any order.

## Examples

```
Input:  nums = [2, 7, 11, 15], target = 9
Output: [0, 1]        (nums[0] + nums[1] == 9)

Input:  nums = [3, 2, 4], target = 6
Output: [1, 2]

Input:  nums = [3, 3], target = 6
Output: [0, 1]
```

## Constraints

- `2 <= nums.length <= 10^4`
- `-10^9 <= nums[i] <= 10^9`
- Exactly one valid answer exists.

## Goal

The brute-force O(n²) solution works, but aim for **O(n) time**. Includes a large test that will time out if you're quadratic.

<details>
<summary>Hint 1</summary>

For each number `x`, what number would you need to have already seen?
</details>

<details>
<summary>Hint 2</summary>

A `HashMap<Integer, Integer>` from value → index lets you check "have I seen `target - x`?" in O(1).
</details>
