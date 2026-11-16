import java.io.*;
import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/**
 * Test driver invoked by scripts/run.js. You never need to touch this file.
 *
 * Reads one JSON job from stdin, calls into the user's Solution.java via reflection,
 * and prints one result line per test case:  @@DSA@@ {"ok":true,"output":...,"ms":3,"stdout":"..."}
 *
 * Job shapes:
 *   method mode: {"mode":"method","method":"twoSum","outputArg":null,"timeoutMs":2000,
 *                 "cases":[{"input":[[2,7,11,15],9]}, {"method":"otherMethod","input":[1]}]}
 *   design mode: {"mode":"design","timeoutMs":2000,
 *                 "cases":[{"input":{"ops":["MinStack","push","getMin"],"args":[[],[3],[]]}}]}
 */
public class Runner {
    static final String MARK = "@@DSA@@ ";

    public static void main(String[] argv) throws Exception {
        PrintStream realOut = new PrintStream(new FileOutputStream(FileDescriptor.out), true, "UTF-8");
        String raw = new String(readAll(System.in), StandardCharsets.UTF_8);
        @SuppressWarnings("unchecked")
        Map<String, Object> job = (Map<String, Object>) Json.parse(raw);

        String mode = (String) job.getOrDefault("mode", "method");
        long timeoutMs = ((Number) job.getOrDefault("timeoutMs", 2000L)).longValue();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> cases = (List<Map<String, Object>>) job.get("cases");

        // Big stacks so recursive solutions (DFS etc.) don't overflow on large inputs.
        ExecutorService pool = Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(null, r, "case", 512L * 1024 * 1024);
            t.setDaemon(true);
            return t;
        });

        for (Map<String, Object> c : cases) {
            Object input = c.get("input");
            Callable<Object> task = () -> {
                try {
                    return "design".equals(mode) ? runDesign(input) : runMethod(job, (String) c.getOrDefault("method", job.get("method")), input);
                } catch (Exception | Error e) {
                    throw e;
                } catch (Throwable t) {
                    throw new RuntimeException(t);
                }
            };

            ByteArrayOutputStream captured = new ByteArrayOutputStream();
            PrintStream cap = new PrintStream(captured, true, "UTF-8");
            PrintStream oldOut = System.out, oldErr = System.err;
            System.setOut(cap);
            System.setErr(cap);

            Map<String, Object> res = new LinkedHashMap<>();
            long start = System.nanoTime();
            Future<Object> f = pool.submit(task);
            try {
                Object out = f.get(timeoutMs, TimeUnit.MILLISECONDS);
                res.put("ok", true);
                res.put("output", normalize(out));
            } catch (TimeoutException e) {
                f.cancel(true);
                res.put("ok", false);
                res.put("timeout", true);
                res.put("error", "timed out after " + timeoutMs + "ms (infinite loop, or too slow for the input size?)");
            } catch (ExecutionException e) {
                Throwable cause = unwrap(e.getCause());
                res.put("ok", false);
                if (cause instanceof UnsupportedOperationException && isTemplateStub(cause)) {
                    res.put("notImplemented", true);
                    res.put("error", "not implemented yet");
                } else {
                    res.put("error", describe(cause));
                }
            } finally {
                System.setOut(oldOut);
                System.setErr(oldErr);
            }
            res.put("ms", (System.nanoTime() - start) / 1_000_000);
            String printed = new String(captured.toByteArray(), StandardCharsets.UTF_8);
            if (!printed.isEmpty()) res.put("stdout", printed.length() > 4000 ? printed.substring(0, 4000) + "\n...(truncated)" : printed);
            realOut.println(MARK + Json.stringify(res));
        }
        realOut.flush();
        System.exit(0); // kill any runaway (timed-out) threads
    }

    // ---------------------------------------------------------------- method mode

    static Object runMethod(Map<String, Object> job, String name, Object input) throws Throwable {
        List<?> args = (List<?>) input;
        Class<?> cls = Class.forName("Solution");
        Method m = findMethod(cls, name, args.size());
        Object target = Modifier.isStatic(m.getModifiers()) ? null : newInstance(cls);
        Object[] converted = convertArgs(m.getGenericParameterTypes(), args);
        Object ret = invoke(m, target, converted);

        // In-place problems (void return): report the mutated argument instead.
        Object outputArg = job.get("outputArg");
        if (outputArg != null) return converted[((Number) outputArg).intValue()];
        if (m.getReturnType() == void.class && converted.length > 0) return converted[0];
        return emptyIfNullStructure(ret, m.getReturnType());
    }

    // ---------------------------------------------------------------- design mode

    @SuppressWarnings("unchecked")
    static Object runDesign(Object input) throws Throwable {
        Map<String, Object> in = (Map<String, Object>) input;
        List<String> ops = (List<String>) in.get("ops");
        List<List<Object>> args = (List<List<Object>>) in.get("args");
        List<Object> out = new ArrayList<>();

        Class<?> cls = Class.forName(ops.get(0));
        List<Object> ctorArgs = args.get(0);
        Constructor<?> ctor = null;
        for (Constructor<?> k : cls.getDeclaredConstructors()) {
            if (k.getParameterCount() == ctorArgs.size()) { ctor = k; break; }
        }
        if (ctor == null) throw new NoSuchMethodException(cls.getName() + " constructor with " + ctorArgs.size() + " args");
        ctor.setAccessible(true);
        Object obj;
        try {
            obj = ctor.newInstance(convertArgs(ctor.getGenericParameterTypes(), ctorArgs));
        } catch (InvocationTargetException e) {
            throw e.getCause();
        }
        out.add(null);

        for (int i = 1; i < ops.size(); i++) {
            Method m = findMethod(cls, ops.get(i), args.get(i).size());
            Object r = invoke(m, obj, convertArgs(m.getGenericParameterTypes(), args.get(i)));
            out.add(normalize(emptyIfNullStructure(r, m.getReturnType())));
        }
        return out;
    }

    // ---------------------------------------------------------------- reflection helpers

    static Method findMethod(Class<?> cls, String name, int argc) throws NoSuchMethodException {
        for (Class<?> c = cls; c != null; c = c.getSuperclass()) {
            for (Method m : c.getDeclaredMethods()) {
                if (m.getName().equals(name) && m.getParameterCount() == argc) {
                    m.setAccessible(true);
                    return m;
                }
            }
        }
        throw new NoSuchMethodException(cls.getName() + "." + name + " with " + argc + " parameter(s) — did you rename it?");
    }

    static Object newInstance(Class<?> cls) throws Exception {
        Constructor<?> k = cls.getDeclaredConstructor();
        k.setAccessible(true);
        return k.newInstance();
    }

    static Object invoke(Method m, Object target, Object[] args) throws Throwable {
        try {
            return m.invoke(target, args);
        } catch (InvocationTargetException e) {
            throw e.getCause();
        }
    }

    static Object[] convertArgs(Type[] types, List<?> args) {
        Object[] out = new Object[types.length];
        for (int i = 0; i < types.length; i++) out[i] = convert(args.get(i), types[i]);
        return out;
    }

    // ---------------------------------------------------------------- JSON -> Java

    static Object convert(Object v, Type t) {
        if (t instanceof WildcardType) t = ((WildcardType) t).getUpperBounds()[0];
        if (t instanceof ParameterizedType) {
            ParameterizedType p = (ParameterizedType) t;
            Class<?> raw = (Class<?>) p.getRawType();
            Type[] ta = p.getActualTypeArguments();
            if (v == null) return null;
            if (Map.class.isAssignableFrom(raw)) {
                Map<Object, Object> m = new HashMap<>();
                for (Map.Entry<?, ?> e : ((Map<?, ?>) v).entrySet())
                    m.put(convertKey((String) e.getKey(), ta[0]), convert(e.getValue(), ta[1]));
                return m;
            }
            Collection<Object> col = Set.class.isAssignableFrom(raw) ? new HashSet<>()
                    : Deque.class.isAssignableFrom(raw) || Queue.class.isAssignableFrom(raw) ? new ArrayDeque<>()
                    : new ArrayList<>();
            for (Object x : (List<?>) v) col.add(convert(x, ta[0]));
            return col;
        }
        if (t instanceof GenericArrayType) {
            Type comp = ((GenericArrayType) t).getGenericComponentType();
            List<?> l = (List<?>) v;
            Object arr = Array.newInstance(rawClass(comp), l.size());
            for (int i = 0; i < l.size(); i++) Array.set(arr, i, convert(l.get(i), comp));
            return arr;
        }
        Class<?> c = (Class<?>) t;
        if (v == null) {
            if (c.isPrimitive()) throw new IllegalArgumentException("null given for primitive " + c);
            return null;
        }
        if (c == int.class || c == Integer.class) return ((Number) v).intValue();
        if (c == long.class || c == Long.class) return ((Number) v).longValue();
        if (c == double.class || c == Double.class) return ((Number) v).doubleValue();
        if (c == float.class || c == Float.class) return ((Number) v).floatValue();
        if (c == short.class || c == Short.class) return ((Number) v).shortValue();
        if (c == byte.class || c == Byte.class) return ((Number) v).byteValue();
        if (c == boolean.class || c == Boolean.class) return v;
        if (c == char.class || c == Character.class) return v instanceof String ? ((String) v).charAt(0) : (char) ((Number) v).intValue();
        if (c == String.class) return v;
        if (c == ListNode.class) {
            List<?> l = (List<?>) v;
            int[] vals = new int[l.size()];
            for (int i = 0; i < vals.length; i++) vals[i] = ((Number) l.get(i)).intValue();
            return ListNode.of(vals);
        }
        if (c == TreeNode.class) {
            List<?> l = (List<?>) v;
            Integer[] vals = new Integer[l.size()];
            for (int i = 0; i < vals.length; i++) vals[i] = l.get(i) == null ? null : ((Number) l.get(i)).intValue();
            return TreeNode.of(vals);
        }
        if (c.isArray()) {
            List<?> l = (List<?>) v;
            Object arr = Array.newInstance(c.getComponentType(), l.size());
            for (int i = 0; i < l.size(); i++) Array.set(arr, i, convert(l.get(i), c.getComponentType()));
            return arr;
        }
        if (c == Object.class) return v;
        throw new IllegalArgumentException("Runner can't convert JSON to " + c.getName() + " (add support in lib/Runner.java)");
    }

    static Object convertKey(String k, Type t) {
        if (t == Integer.class) return Integer.parseInt(k);
        if (t == Long.class) return Long.parseLong(k);
        if (t == Character.class) return k.charAt(0);
        return k;
    }

    static Class<?> rawClass(Type t) {
        if (t instanceof Class) return (Class<?>) t;
        if (t instanceof ParameterizedType) return (Class<?>) ((ParameterizedType) t).getRawType();
        if (t instanceof GenericArrayType) return Array.newInstance(rawClass(((GenericArrayType) t).getGenericComponentType()), 0).getClass();
        return Object.class;
    }

    // ---------------------------------------------------------------- Java -> JSON-friendly

    /** A null ListNode/TreeNode means "empty list/tree", which tests write as []. */
    static Object emptyIfNullStructure(Object o, Class<?> type) {
        if (o == null && (type == ListNode.class || type == TreeNode.class)) return new ArrayList<>();
        return o;
    }

    static Object normalize(Object o) {
        if (o == null) return null;
        if (o instanceof ListNode) {
            List<Integer> l = new ArrayList<>();
            for (int x : ListNode.toArray((ListNode) o)) l.add(x);
            return l;
        }
        if (o instanceof TreeNode) return TreeNode.toList((TreeNode) o);
        if (o instanceof Character) return o.toString();
        if (o instanceof Map) {
            Map<String, Object> m = new LinkedHashMap<>();
            for (Map.Entry<?, ?> e : ((Map<?, ?>) o).entrySet()) m.put(String.valueOf(e.getKey()), normalize(e.getValue()));
            return m;
        }
        if (o instanceof Iterable) {
            List<Object> l = new ArrayList<>();
            for (Object x : (Iterable<?>) o) l.add(normalize(x));
            return l;
        }
        if (o.getClass().isArray()) {
            List<Object> l = new ArrayList<>();
            for (int i = 0; i < Array.getLength(o); i++) l.add(normalize(Array.get(o, i)));
            return l;
        }
        return o;
    }

    // ---------------------------------------------------------------- errors

    static Throwable unwrap(Throwable t) {
        while (t instanceof InvocationTargetException && t.getCause() != null) t = t.getCause();
        return t;
    }

    /** Only the template's own `throw new UnsupportedOperationException()` counts as "not implemented". */
    static boolean isTemplateStub(Throwable t) {
        return t.getMessage() == null;
    }

    static String describe(Throwable t) {
        String s = t.getClass().getSimpleName() + (t.getMessage() != null ? ": " + t.getMessage() : "");
        if (t instanceof StackOverflowError) s = "StackOverflowError (recursion never hits its base case?)";
        if (t instanceof OutOfMemoryError) s = "OutOfMemoryError (allocating too much?)";
        for (StackTraceElement el : t.getStackTrace()) {
            if ("Solution.java".equals(el.getFileName())) return s + "  (Solution.java:" + el.getLineNumber() + ")";
        }
        return s;
    }

    static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        byte[] buf = new byte[1 << 16];
        int n;
        while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
        return b.toByteArray();
    }
}
