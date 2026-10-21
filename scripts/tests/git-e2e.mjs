// Browser smoke test for the Git course + sandbox.  Usage: node scripts/tests/git-e2e.mjs [baseURL]
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
let fails = 0;
const check = (c, msg) => {
  console.log(`${c ? "✓" : "✗"} ${msg}`);
  if (!c) fails++;
};
const type = async (cmd) => {
  const input = page.locator("#git-term-input").first();
  await input.fill(cmd);
  await input.press("Enter");
  await page.waitForTimeout(120);
};

// Free sandbox
await page.goto(`${BASE}/git/sandbox`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.removeItem("dth-git-sandbox-v1"));
await page.reload({ waitUntil: "networkidle" });
await page.locator("#git-term-input").waitFor();
for (const c of ["git init", 'echo "hello" > a.txt', "git add a.txt", 'git commit -m "First"', "git switch -c feature", 'echo "x" >> a.txt', 'git commit -am "Second"', "git switch main", 'echo "y" > b.txt', "git add .", 'git commit -m "Third"', "git merge feature", "git log --oneline --graph --all"])
  await type(c);
const nodes = await page.locator('[aria-label="Commit graph"] .gitgraph-node').count();
check(nodes === 4, `sandbox graph shows 4 commits (got ${nodes})`);
const log = await page.locator('[role="log"]').innerText();
check(log.includes("Merge made by the 'ort' strategy"), "3-way merge output shown");
check(/\* [0-9a-f]{7} \(HEAD -> main\)/.test(log), "log --graph output shown");
await type("git frobnicate");
check((await page.locator('[role="log"]').innerText()).includes("not supported"), "unknown command handled");
await page.reload({ waitUntil: "networkidle" });
await page.locator("#git-term-input").waitFor();
check((await page.locator('[aria-label="Commit graph"] .gitgraph-node').count()) === 4, "sandbox session restored after reload");

// Guided conflict lab
await page.goto(`${BASE}/training/git/git-merge-conflicts`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.removeItem("dth-progress-v3"));
await page.reload({ waitUntil: "networkidle" });
const lab = page.locator('[data-testid="git-lab-conflicts"]');
await lab.waitFor();
const goal1 = await lab.locator('[data-testid="lab-goal"]').innerText();
await type("git merge sale");
check((await lab.innerText()).includes("CONFLICT"), "conflict lab: conflict reported");
const goal2 = await lab.locator('[data-testid="lab-goal"]').innerText();
check(goal1 !== goal2, "conflict lab: step 1 auto-checked and next step unlocked");
await type("cat price.txt");
await type('echo "price = 9" > price.txt');
await type("git add price.txt");
await type('git commit -m "Merge sale"');
check((await lab.innerText()).includes("5/7"), "conflict lab: 5/7 steps after resolving");
const prog = await page.evaluate(() => localStorage.getItem("dth-progress-v3"));
check(prog?.includes("git:lab-conflicts"), "lab progress saved to progress store");
check((await page.locator("#quiz").count()) === 1, "quiz present on lesson");
check((await page.locator(".code-copy-btn").count()) > 0, "copy buttons on code blocks");

// Strategy page diagram + lab
await page.goto(`${BASE}/training/git/git-git-flow`, { waitUntil: "networkidle" });
check((await page.locator('[data-testid="diagram-git-flow"] svg').count()) === 1, "git flow diagram rendered");
check((await page.locator('[data-testid="git-lab-git-flow"]').count()) === 1, "git flow lab rendered");
await page.locator('[data-testid="git-lab-git-flow"] button:has-text("Do it for me")').click();
await page.waitForTimeout(200);
check((await page.locator('[data-testid="git-lab-git-flow"]').innerText()).includes("1/8"), "'Do it for me' advances a step");

for (const p of ["/training/git", "/git/cheat-sheet", "/git/glossary", "/training/git/git-capstone-team-simulation"]) {
  const r = await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" });
  check(r?.status() === 200, `${p} → ${r?.status()}`);
}
const real = errors.filter((e) => !/favicon|401|Unauthorized|status of 4\d\d/.test(e));
check(real.length === 0, `no console/page errors${real.length ? ": " + real.slice(0, 3).join(" | ") : ""}`);
await browser.close();
process.exit(fails ? 1 : 0);
