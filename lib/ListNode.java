/**
 * Singly linked list node (LeetCode-style), plus helpers for tests.
 * toString prints the whole chain starting at this node (handy for debugging).
 */
public class ListNode {
    public int val;
    public ListNode next;

    public ListNode() {}
    public ListNode(int val) { this.val = val; }
    public ListNode(int val, ListNode next) { this.val = val; this.next = next; }

    /** ListNode.of(1, 2, 3) -> 1 -> 2 -> 3. Returns null for no args. */
    public static ListNode of(int... vals) {
        ListNode dummy = new ListNode(), cur = dummy;
        for (int v : vals) {
            cur.next = new ListNode(v);
            cur = cur.next;
        }
        return dummy.next;
    }

    /** Flatten to an array (stops after 10_000 nodes to survive accidental cycles). */
    public static int[] toArray(ListNode head) {
        java.util.List<Integer> out = new java.util.ArrayList<>();
        for (ListNode cur = head; cur != null && out.size() < 10_000; cur = cur.next) out.add(cur.val);
        return out.stream().mapToInt(Integer::intValue).toArray();
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("[");
        int[] a = toArray(this);
        for (int i = 0; i < a.length; i++) sb.append(i == 0 ? "" : " -> ").append(a[i]);
        return sb.append("]").toString();
    }
}
