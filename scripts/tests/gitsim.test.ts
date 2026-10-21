/* Run: npx tsx scripts/tests/gitsim.test.ts */
import { LABS } from "../../src/lib/gitsim/labs";
import { run, emptyRepo, runScript, type Repo } from "../../src/lib/gitsim/engine";

let failures = 0;
const assert = (cond: unknown, msg: string) => {
  if (!cond) {
    failures++;
    console.error("  ✗ " + msg);
  }
};

// 1) Every lab is solvable with its solution, and checks start false where it matters.
for (const lab of LABS) {
  let r: Repo = lab.setup();
  let ok = true;
  lab.steps.forEach((step, i) => {
    if (!ok) return;
    if (step.onEnter) r = step.onEnter(r);
    if (step.check(r) && !/status|log|show|reflog|list|blame|remote -v|cat /.test(step.expected)) console.warn(`  ! [${lab.id}] step ${i + 1} already passes before solving`);
    const cmds = step.solution ? step.solution(r) : [step.expected];
    for (const raw of cmds) {
      const allowFail = raw.startsWith("!");
      const res = run(r, allowFail ? raw.slice(1) : raw);
      if (!res.result.ok && !allowFail && !raw.includes("git push") && !step.check(res.repo)) {
        console.error(`  [${lab.id}#${i + 1}] "${raw}" failed:\n${res.result.output}`);
      }
      r = res.repo;
    }
    if (!step.check(r)) {
      ok = false;
      assert(false, `[${lab.id}] step ${i + 1} check failed: ${step.goal}`);
    }
  });
  console.log(`${ok ? "✓" : "✗"} lab ${lab.id} (${lab.steps.length} steps)`);
}

// 2) Unit-ish checks of core commands.
{
  let r = runScript(emptyRepo(), ["git init", 'echo "a" > f.txt', "git add .", 'git commit -m "one"']);
  const out = run(r, "git log --oneline --graph").result.output;
  assert(/\* [0-9a-f]{7} \(HEAD -> main\) one/.test(out), "log --oneline --graph shows HEAD -> main");
  r = runScript(r, ["git switch -c b", 'echo "b" > f.txt', 'git commit -am "two"', "git switch main", 'echo "c" > f.txt', 'git commit -am "three"']);
  const m = run(r, "git merge b");
  assert(!m.result.ok && m.repo.merge?.conflicts.includes("f.txt"), "merge conflict detected");
  assert(m.repo.work["f.txt"].includes("<<<<<<< HEAD") && m.repo.work["f.txt"].includes(">>>>>>> b"), "conflict markers written");
  const c = run(m.repo, 'git commit -m "x"');
  assert(!c.result.ok, "cannot commit with unresolved conflict");
  const st = run(m.repo, "git status").result.output;
  assert(st.includes("both modified"), "status shows both modified");
  r = runScript(m.repo, ["git merge --abort"]);
  assert(!r.merge && r.work["f.txt"] === "c\n", "merge --abort restores");
  const bad = run(r, "git frobnicate");
  assert(!bad.result.ok, "unknown command fails");
  const rv = run(r, "git revert HEAD");
  assert(rv.result.ok && rv.repo.work["f.txt"] === "a\n", "revert HEAD");
  const ch = run(r, "git cherry-pick b");
  assert(!ch.result.ok && ch.repo.merge?.op === "cherry-pick", "cherry-pick conflict");
  const st2 = runScript(r, ['echo "d" > f.txt', "git stash", "git stash list"]);
  assert(st2.stash.length === 1 && st2.work["f.txt"] === "c\n", "stash");
  const tag = runScript(r, ['git tag -a v1 -m "rel"', "git tag"]);
  assert(tag.tags.v1, "tag");
  const g = run(r, "git log --graph --oneline --all");
  assert(g.result.output.includes("b") && g.result.output.split("\n").length >= 3, "graph lists all branches");
  const rs = runScript(r, ["git reset --soft HEAD~1"]);
  assert(rs.index["f.txt"] === "c\n" && rs.commits[rs.branches.main].message === "one", "reset --soft");
  const det = run(r, "git checkout HEAD~1");
  assert(det.result.ok && det.repo.head.kind === "detached", "checkout rev detaches");
  const ign = runScript(r, ['echo "*.log" > .gitignore', 'echo "x" > a.log']);
  assert(!run(ign, "git status").result.output.includes("a.log"), "gitignore respected");
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nAll sandbox tests passed.");
