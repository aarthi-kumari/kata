#!/usr/bin/env node
/*
 * DSA practice runner.
 *
 *   npm test                       run every problem
 *   npm test two-sum               run one problem (any substring of the folder name works)
 *   npm test arrays                run every problem in a topic
 *   npm run watch two-sum          re-run whenever you save Solution.java
 *   npm test -- two-sum -v         also show input/output for passing cases
 *   npm run list                   list problems and whether they pass
 *   npm run new <topic> <slug>     scaffold a new problem folder
 *   npm run new-concept <t> <slug> scaffold a new Java concept lesson
 *   npm test concepts              run only the Java concept exercises
 *
 * (or call it directly: node scripts/run.js <same args>)
 *
 * Node compiles Solution.java with javac, then runs lib/Runner.java which calls your
 * method via reflection and streams results back as JSON. Comparison happens here.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PROBLEMS = path.join(ROOT, 'problems');
const CONCEPTS = path.join(ROOT, 'concepts');
const LIB = path.join(ROOT, 'lib');
const OUT = path.join(ROOT, 'out');
const MARK = '@@DSA@@ ';

const tty = process.stdout.isTTY;
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const green = c(32), red = c(31), yellow = c(33), dim = c(2), bold = c(1), cyan = c(36);

// ------------------------------------------------------------------ discovery

function discover() {
  const out = [];
  for (const root of [PROBLEMS, CONCEPTS]) {
    if (!fs.existsSync(root)) continue;
    const kind = path.basename(root);
    for (const topic of fs.readdirSync(root).sort()) {
      const tdir = path.join(root, topic);
      if (!fs.statSync(tdir).isDirectory()) continue;
      for (const slug of fs.readdirSync(tdir).sort()) {
        const dir = path.join(tdir, slug);
        if (fs.existsSync(path.join(dir, 'tests.js'))) out.push({ kind, topic, slug, dir, id: `${kind}/${topic}/${slug}` });
      }
    }
  }
  return out;
}

function select(all, filter) {
  if (!filter) return all;
  const exact = all.filter((p) => p.slug === filter);
  if (exact.length) return exact;
  return all.filter((p) => p.id.includes(filter));
}

// ------------------------------------------------------------------ compile

function hasJavac() {
  const r = spawnSync('javac', ['-version'], { encoding: 'utf8' });
  return !r.error && r.status === 0;
}

function jdkCandidates() {
  const subdirs = (dir, re) => {
    try {
      return fs.readdirSync(dir).filter((n) => re.test(n)).sort().reverse().map((n) => path.join(dir, n));
    } catch {
      return [];
    }
  };
  const out = [];
  if (process.env.JAVA_HOME) out.push(path.join(process.env.JAVA_HOME, 'bin'));
  if (process.platform === 'win32') {
    const pf = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean);
    for (const base of pf)
      for (const vendor of ['Eclipse Adoptium', 'Java', 'Microsoft', 'Zulu', 'Amazon Corretto', 'BellSoft'])
        out.push(...subdirs(path.join(base, vendor), /^(jdk|zulu)/i).map((d) => path.join(d, 'bin')));
  } else {
    for (const d of ['/opt/homebrew/opt', '/usr/local/opt'])
      out.push(...subdirs(d, /^openjdk(@\d+)?$/).map((n) => path.join(n, 'bin')));
    out.push(...subdirs('/Library/Java/JavaVirtualMachines', /jdk/).map((d) => path.join(d, 'Contents', 'Home', 'bin')));
  }
  return out;
}

function requireJava() {
  // JDKs often aren't on PATH (Homebrew's openjdk is keg-only; Windows installers may skip PATH),
  // so look in JAVA_HOME and the usual install locations before giving up.
  if (!hasJavac()) {
    const found = jdkCandidates().find((b) => fs.existsSync(path.join(b, process.platform === 'win32' ? 'javac.exe' : 'javac')));
    if (found) process.env.PATH = found + path.delimiter + process.env.PATH;
  }
  if (!hasJavac()) {
    const how = process.platform === 'win32'
      ? '  winget install EclipseAdoptium.Temurin.21.JDK\n(then open a new terminal)'
      : '  brew install openjdk@21';
    console.error(red('javac not found.') + ' Install a JDK (17+), e.g.:\n' + how +
      '\nor set JAVA_HOME to your JDK folder.');
    process.exit(2);
  }
}

function newestMtime(files) {
  return Math.max(0, ...files.filter(fs.existsSync).map((f) => fs.statSync(f).mtimeMs));
}

function javac(srcs, outDir, classpath) {
  fs.mkdirSync(outDir, { recursive: true });
  const args = ['-encoding', 'UTF-8', '-nowarn', '-d', outDir];
  if (classpath) args.push('-cp', classpath);
  const r = spawnSync('javac', args.concat(srcs), { encoding: 'utf8' });
  return { ok: r.status === 0, log: (r.stdout || '') + (r.stderr || '') };
}

function compileLib() {
  const srcs = fs.readdirSync(LIB).filter((f) => f.endsWith('.java')).map((f) => path.join(LIB, f));
  const outDir = path.join(OUT, 'lib');
  const stamp = path.join(outDir, '.stamp');
  if (fs.existsSync(stamp) && fs.statSync(stamp).mtimeMs >= newestMtime(srcs)) return;
  const r = javac(srcs, outDir);
  if (!r.ok) {
    console.error(red('Failed to compile lib/:\n') + r.log);
    process.exit(2);
  }
  fs.writeFileSync(stamp, '');
}

function compileProblem(p) {
  const src = path.join(p.dir, 'Solution.java');
  const outDir = path.join(OUT, p.kind, p.topic, p.slug);
  const stamp = path.join(outDir, '.stamp');
  const libStamp = path.join(OUT, 'lib', '.stamp');
  if (fs.existsSync(stamp) && fs.statSync(stamp).mtimeMs >= newestMtime([src, libStamp])) return { ok: true, outDir };
  fs.rmSync(outDir, { recursive: true, force: true });
  const r = javac([src], outDir, path.join(OUT, 'lib'));
  if (r.ok) fs.writeFileSync(stamp, '');
  return { ...r, outDir };
}

// ------------------------------------------------------------------ run

function loadSpec(p) {
  const file = path.join(p.dir, 'tests.js');
  delete require.cache[require.resolve(file)];
  const spec = require(file);
  if (!Array.isArray(spec.cases) || !spec.cases.length) throw new Error(`${file}: no cases`);
  if (!spec.design && !spec.method && !spec.cases.every((tc) => tc.method)) throw new Error(`${file}: missing "method" (or design: true)`);
  return spec;
}

function runJava(outDir, job, timeoutMs) {
  return new Promise((resolve) => {
    const cp = [outDir, path.join(OUT, 'lib')].join(path.delimiter);
    const child = spawn('java', ['-Xss512m', '-cp', cp, 'Runner'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8'); // decode as a stream so multi-byte chars split across chunks survive
    child.stderr.setEncoding('utf8');
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      clearTimeout(timer);
      const results = stdout.split(/\r?\n/).filter((l) => l.startsWith(MARK)).map((l) => JSON.parse(l.slice(MARK.length)));
      resolve({ results, stderr, code });
    });
    child.stdin.end(JSON.stringify(job));
  });
}

// ------------------------------------------------------------------ compare

const stableKey = (x) => JSON.stringify(x);
const sortTop = (a) => (Array.isArray(a) ? [...a].sort((x, y) => (stableKey(x) < stableKey(y) ? -1 : stableKey(x) > stableKey(y) ? 1 : 0)) : a);
const sortDeep = (a) => (Array.isArray(a) ? sortTop(a.map(sortDeep)) : a);

function deepEqual(a, b, eps) {
  if (typeof a === 'number' && typeof b === 'number') return eps ? Math.abs(a - b) <= eps : a === b;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i], eps));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k], eps));
  }
  return a === b;
}

function compare(mode, actual, expected, input) {
  if (typeof mode === 'function') return !!mode(actual, expected, input);
  switch (mode || 'exact') {
    case 'exact': return deepEqual(actual, expected);
    case 'unordered': return deepEqual(sortTop(actual), sortTop(expected));
    case 'unorderedDeep': return deepEqual(sortDeep(actual), sortDeep(expected));
    case 'approx': return deepEqual(actual, expected, 1e-5);
    default: throw new Error(`unknown compare mode "${mode}"`);
  }
}

// ------------------------------------------------------------------ report

function show(v, max = 160) {
  const s = JSON.stringify(v);
  if (s === undefined) return 'undefined';
  return s.length > max ? s.slice(0, max) + dim(` …(${s.length} chars)`) : s;
}

async function runProblem(p, opts) {
  const header = `${bold(p.slug)} ${dim(p.topic)}`;
  let spec;
  try {
    spec = loadSpec(p);
  } catch (e) {
    console.log(`\n${header}\n  ${red('BROKEN tests.js')}: ${e.message}`);
    return { p, status: 'broken', passed: 0, total: 0 };
  }
  const total = spec.cases.length;
  const comp = compileProblem(p);
  if (!comp.ok) {
    console.log(`\n${header}\n  ${red('COMPILE ERROR')}\n` + comp.log.trim().split(/\r?\n/).map((l) => '    ' + l).join('\n'));
    return { p, status: 'compile', passed: 0, total };
  }

  const timeoutMs = spec.timeoutMs || 2000;
  const job = {
    mode: spec.design ? 'design' : 'method',
    method: spec.method,
    outputArg: spec.outputArg ?? null,
    timeoutMs,
    cases: spec.cases.map((tc) => (tc.method ? { method: tc.method, input: tc.input } : { input: tc.input })),
  };
  const { results, stderr } = await runJava(comp.outDir, job, timeoutMs * total + 15000);

  if (!opts.quiet) console.log(`\n${header}`);
  if (results.length === total && results.every((r) => r && r.notImplemented)) {
    if (!opts.quiet) console.log(yellow(`  not started: ${total} test cases waiting`) + dim(`  (${path.relative(ROOT, path.join(p.dir, 'Solution.java'))})`));
    return { p, status: 'todo', passed: 0, total };
  }
  let passed = 0, notImpl = 0;
  spec.cases.forEach((tc, i) => {
    const r = results[i];
    const name = tc.name || `case ${i + 1}`;
    let ok = false, why = '';
    if (!r) why = 'no result (JVM crashed?)' + (stderr ? '\n' + stderr.trim() : '');
    else if (!r.ok) {
      why = r.notImplemented ? yellow('not implemented yet') : r.error;
      if (r.notImplemented) notImpl++;
    } else {
      try {
        ok = compare(spec.compare, r.output, tc.expected, tc.input);
      } catch (e) {
        why = 'compare failed: ' + e.message;
      }
      if (!ok && !why) why = `expected ${show(tc.expected)}\n         got      ${show(r.output)}`;
    }
    if (ok) passed++;
    if (opts.quiet) return;
    const ms = r ? dim(` ${r.ms}ms`) : '';
    if (ok) {
      console.log(`  ${green('PASS')} ${name}${ms}`);
      if (opts.verbose) console.log(dim(`         input  ${show(tc.input)}\n         output ${show(r.output)}`));
    } else {
      console.log(`  ${red('FAIL')} ${name}${ms}`);
      if (!(r && r.notImplemented)) console.log(`         input    ${show(tc.input)}`);
      console.log(`         ${why}`);
    }
    if (r && r.stdout) console.log(cyan(r.stdout.trimEnd().split(/\r?\n/).map((l) => '         │ ' + l).join('\n')));
  });

  const status = passed === total ? 'pass' : notImpl === total ? 'todo' : 'fail';
  if (!opts.quiet) {
    const color = status === 'pass' ? green : status === 'todo' ? yellow : red;
    console.log(color(`  ${passed}/${total} passed`));
  }
  return { p, status, passed, total };
}

function summary(rows) {
  if (rows.length < 2) return;
  const label = { pass: green('✔ solved'), fail: red('✘ failing'), todo: yellow('· todo'), compile: red('✘ compile error'), broken: red('✘ broken tests') };
  console.log('\n' + bold('Summary'));
  const w = Math.max(...rows.map((r) => r.p.id.length));
  for (const r of rows) console.log(`  ${r.p.id.padEnd(w)}  ${`${r.passed}/${r.total}`.padStart(6)}  ${label[r.status]}`);
  const solved = rows.filter((r) => r.status === 'pass').length;
  console.log(bold(`\n  ${solved}/${rows.length} solved`));
}

// ------------------------------------------------------------------ scaffold

function scaffold(kind, topic, slug) {
  const base = kind === 'concept' ? CONCEPTS : PROBLEMS;
  if (!topic || !slug) {
    console.error(kind === 'concept'
      ? 'usage: npm run new-concept <topic> <slug>   e.g. npm run new-concept collections arraydeque'
      : 'usage: npm run new <topic> <slug>           e.g. npm run new arrays best-time-to-buy-stock');
    process.exit(2);
  }
  // Reuse an existing numbered topic folder like "01-arrays" if one matches.
  // Otherwise create the next number, e.g. "stack" -> "03-stack".
  const topics = fs.existsSync(base) ? fs.readdirSync(base) : [];
  let folder = topics.find((t) => t === topic || t.replace(/^\d+-/, '') === topic);
  if (!folder) {
    const next = Math.max(0, ...topics.map((t) => parseInt(t, 10) || 0)) + 1;
    folder = /^\d+-/.test(topic) ? topic : `${String(next).padStart(2, '0')}-${topic}`;
  }
  const dir = path.join(base, folder, slug);
  if (fs.existsSync(dir)) {
    console.error(red(`${path.relative(ROOT, dir)} already exists`));
    process.exit(2);
  }
  fs.mkdirSync(dir, { recursive: true });
  const title = slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(dir, 'README.md'), kind === 'concept'
    ? `# ${title}\n\n**Topic:** ${topic}  **Added:** ${today}\n\n## The idea\n\n...\n\n## In code\n\n\`\`\`java\n...\n\`\`\`\n\n## Gotchas\n\n- ...\n\n## Exercises (Solution.java)\n\n1. \`method\`: ...\n`
    : `# ${title}\n\n**Topic:** ${topic}  **Difficulty:** Easy  **Added:** ${today}\n\n<problem statement>\n\n## Examples\n\n\`\`\`\nInput:  ...\nOutput: ...\n\`\`\`\n\n## Constraints\n\n- ...\n\n<details>\n<summary>Hint</summary>\n\n...\n</details>\n`);
  fs.writeFileSync(path.join(dir, 'Solution.java'),
    `import java.util.*;\n\nclass Solution {\n    public int solve(int[] nums) {\n        // TODO: write your solution here\n        throw new UnsupportedOperationException();\n    }\n}\n`);
  fs.writeFileSync(path.join(dir, 'tests.js'),
    `// See PROBLEM_FORMAT.md for all options.\nmodule.exports = {\n  method: 'solve',\n  compare: 'exact', // exact | unordered | unorderedDeep | approx | (actual, expected, input) => boolean\n  cases: [\n    { name: 'example 1', input: [[1, 2, 3]], expected: 0 },\n  ],\n};\n`);
  console.log(green('created ') + path.relative(ROOT, dir) + '/{README.md,Solution.java,tests.js}');
}

// ------------------------------------------------------------------ main

async function runAll(selected, opts) {
  compileLib();
  const rows = [];
  for (const p of selected) rows.push(await runProblem(p, opts));
  if (opts.quiet) {
    const label = { pass: green('✔'), fail: red('✘'), todo: yellow('·'), compile: red('✘ compile'), broken: red('✘ tests') };
    for (const r of rows) console.log(`  ${label[r.status]} ${r.p.id} ${dim(`${r.passed}/${r.total}`)}`);
  } else summary(rows);
  return rows.every((r) => r.status === 'pass');
}

async function main() {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter((a) => a.startsWith('-')));
  const pos = argv.filter((a) => !a.startsWith('-'));
  const opts = { verbose: flags.has('-v') || flags.has('--verbose'), quiet: false };

  if (flags.has('-h') || flags.has('--help') || pos[0] === 'help') {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\r?\n\/\*\r?\n?/, '').replace(/^ \* ?/gm, ''));
    return;
  }
  if (pos[0] === 'new') return scaffold('problem', pos[1], pos[2]);
  if (pos[0] === 'new-concept') return scaffold('concept', pos[1], pos[2]);

  requireJava();
  const all = discover();
  if (pos[0] === 'list') {
    opts.quiet = true;
    await runAll(all, opts);
    return;
  }

  const filter = pos[0] === 'all' ? null : pos[0];
  const selected = select(all, filter);
  if (!selected.length) {
    console.error(red(`no problem matches "${filter}".`) + ' Try: npm run list');
    process.exit(2);
  }

  if (flags.has('--watch') || flags.has('-w')) {
    // Watch the folders, not the files: many editors save by replacing the file, which breaks file watches.
    const watched = new Set(['Solution.java', 'tests.js']);
    let busy = false;
    const go = async () => {
      if (busy) return;
      busy = true;
      if (tty) process.stdout.write('\x1b[2J\x1b[H');
      await runAll(selected, opts);
      console.log(dim('\nwatching for changes… (ctrl+c to stop)'));
      busy = false;
    };
    let t;
    for (const p of selected)
      fs.watch(p.dir, (_ev, name) => {
        if (name && !watched.has(path.basename(String(name)))) return;
        clearTimeout(t);
        t = setTimeout(go, 150);
      });
    await go();
    return;
  }

  const ok = await runAll(selected, opts);
  process.exitCode = ok ? 0 : 1;
}

main().catch((e) => {
  console.error(red(e.stack || e));
  process.exit(2);
});
