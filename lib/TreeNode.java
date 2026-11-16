import java.util.*;

/**
 * Binary tree node (LeetCode-style), plus helpers for tests.
 * Trees are written in level order with nulls for gaps, like LeetCode:
 *   TreeNode.of(3, 9, 20, null, null, 15, 7)
 */
public class TreeNode {
    public int val;
    public TreeNode left, right;

    public TreeNode() {}
    public TreeNode(int val) { this.val = val; }
    public TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }

    /** Build from level-order values; null means "no node here". */
    public static TreeNode of(Integer... vals) {
        if (vals.length == 0 || vals[0] == null) return null;
        TreeNode root = new TreeNode(vals[0]);
        Deque<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < vals.length) {
            TreeNode n = q.poll();
            if (i < vals.length && vals[i] != null) q.add(n.left = new TreeNode(vals[i]));
            i++;
            if (i < vals.length && vals[i] != null) q.add(n.right = new TreeNode(vals[i]));
            i++;
        }
        return root;
    }

    /** Level-order list with nulls for gaps, trailing nulls trimmed. */
    public static List<Integer> toList(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        Deque<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {
            TreeNode n = q.poll();
            if (n == null) { out.add(null); continue; }
            out.add(n.val);
            q.add(n.left);
            q.add(n.right);
        }
        while (!out.isEmpty() && out.get(out.size() - 1) == null) out.remove(out.size() - 1);
        return out;
    }

    @Override
    public String toString() { return toList(this).toString(); }
}
