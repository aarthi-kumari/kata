# Reverse Linked List

**Topic:** Linked List  **Difficulty:** Easy  **Added:** 2026-11-16

Given the `head` of a singly linked list, reverse the list and return the new head.

`ListNode` is provided in `lib/ListNode.java`:

```java
class ListNode { int val; ListNode next; }
```

## Examples

```
Input:  1 -> 2 -> 3 -> 4 -> 5
Output: 5 -> 4 -> 3 -> 2 -> 1

Input:  1 -> 2
Output: 2 -> 1

Input:  (empty list, head = null)
Output: (empty list)
```

(In `tests.js`, lists are written as arrays: `[1, 2, 3]`.)

## Constraints

- `0 <= number of nodes <= 5000`
- `-5000 <= Node.val <= 5000`

## Goal

Solve it **iteratively** in O(n) time and O(1) extra space. Then try it **recursively**.

<details>
<summary>Hint 1</summary>

Walk the list keeping three pointers: `prev`, `cur`, and `next`. At each step, point `cur.next` back at `prev`.
</details>

<details>
<summary>Hint 2 (recursive)</summary>

`reverseList(head.next)` returns the reversed tail. `head.next` is now the *last* node of that tail, so set `head.next.next = head` and `head.next = null`.
</details>
