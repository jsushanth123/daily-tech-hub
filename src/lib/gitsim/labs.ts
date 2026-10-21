import {
  type Repo,
  emptyRepo,
  runScript,
  teammatePush,
  makeRemote,
  headId,
  currentBranch,
  status,
  isAncestor,
  resolve,
  firstParentMessages,
  reachable,
  short,
} from "./engine";

export interface LabStep {
  goal: string;
  hint: string;
  /** Shown to the learner as the expected command (may contain placeholders). */
  expected: string;
  /** Commands used by automated tests to solve the step; defaults to [expected]. */
  solution?: (r: Repo) => string[];
  check: (r: Repo) => boolean;
  /** Short "what just happened" note shown after the step passes. */
  explain?: string;
  /** Simulated event when the step starts (e.g. a teammate pushes). */
  onEnter?: (r: Repo) => Repo;
  /** Message describing the onEnter event, shown in the terminal. */
  event?: string;
}

export interface Lab {
  id: string;
  title: string;
  intro: string;
  setup: () => Repo;
  steps: LabStep[];
}

// ---------- check helpers ----------
const commitsOn = (r: Repo, rev: string) => {
  const id = resolve(r, rev);
  return id ? reachable(r, [id]).length : 0;
};
const onBranch = (r: Repo, b: string) => currentBranch(r) === b;
const clean = (r: Repo) => {
  const s = status(r);
  return !s.staged.length && !s.unstaged.length && !s.untracked.length && !s.conflicted.length && !r.merge && !r.rebase;
};
const tipMsg = (r: Repo, rev = "HEAD") => {
  const id = resolve(r, rev);
  return id ? r.commits[id].message : "";
};
const isMerge = (r: Repo, rev = "HEAD") => {
  const id = resolve(r, rev);
  return !!id && r.commits[id].parents.length > 1;
};
const fileAt = (r: Repo, rev: string, f: string) => {
  const id = resolve(r, rev);
  return id ? r.commits[id].tree[f] : undefined;
};
const contains = (r: Repo, branch: string, rev: string) => {
  const a = resolve(r, rev);
  const b = resolve(r, branch);
  return !!a && !!b && isAncestor(r, a, b);
};
const remoteTip = (r: Repo, b: string) => r.remotes.origin?.branches[b];
const linear = (r: Repo, rev = "HEAD") => {
  const id = resolve(r, rev);
  return !!id && reachable(r, [id]).every((c) => c.parents.length <= 1);
};
const hashOf = (r: Repo, msg: string) => short(Object.values(r.commits).find((c) => c.message === msg)?.id);
const noMarkers = (r: Repo, f: string) => !!r.work[f] && !r.work[f].includes("<<<<<<<") && !r.work[f].includes(">>>>>>>");

const hasRemoteMain = (r: Repo, branch: string) => {
  const t = remoteTip(r, "main");
  const b = r.branches[branch];
  return !!t && !!b && !!r.commits[t] && isAncestor(r, t, b);
};

function base(script: string[]): () => Repo {
  return () => runScript(emptyRepo(), script);
}

function withRemote(script: string[], push = true): () => Repo {
  return () => {
    let r = runScript(emptyRepo(), ["git init", "git config user.name you", ...script]);
    r.remotes.origin = makeRemote("origin", "https://github.com/team/app.git");
    if (push) r = runScript(r, ["git push -u origin main"]);
    return r;
  };
}

const START = ['echo "# Shop app" > README.md', "git add README.md", 'git commit -m "Initial commit"'];

export const LABS: Lab[] = [
  {
    id: "setup",
    title: "Lab: your first repository",
    intro: "You'll create a brand-new repository, tell Git who you are, and look around.",
    setup: () => emptyRepo(),
    steps: [
      { goal: "Tell Git your name (it's stamped on every commit).", hint: "git config takes a key and a value.", expected: 'git config --global user.name "Ada"', check: (r) => !!r.config["user.name"] },
      { goal: "Tell Git your email.", hint: "Same idea, key user.email.", expected: 'git config --global user.email "ada@example.com"', check: (r) => !!r.config["user.email"] },
      { goal: "Turn this folder into a Git repository.", hint: "One word after git.", expected: "git init", check: (r) => r.initialized, explain: "Git created a hidden .git folder: that's where all history lives." },
      { goal: "Ask Git what's going on.", hint: "The command you'll type most often in your life.", expected: "git status", check: (r) => r.initialized, explain: "No commits yet — nothing tracked. That's normal for a fresh repo." },
    ],
  },
  {
    id: "staging",
    title: "Lab: stage and commit",
    intro: "Working tree → staging area (index) → commit. Watch the graph grow as you commit.",
    setup: base(["git init", "git config user.name you"]),
    steps: [
      { goal: "Create a file called README.md containing a title.", hint: 'Use echo with > to write a file.', expected: 'echo "# My project" > README.md', check: (r) => r.work["README.md"] !== undefined },
      { goal: "Stage README.md so it goes into the next commit.", hint: "git add <file>", expected: "git add README.md", check: (r) => r.index["README.md"] !== undefined, explain: "Staged! Run git status and you'll see it under 'Changes to be committed'." },
      { goal: "Commit it with a clear message.", hint: 'git commit -m "..."', expected: 'git commit -m "Add README"', check: (r) => commitsOn(r, "HEAD") === 1, explain: "Your first commit — a dot appears in the graph." },
      { goal: "Create two files: app.py and notes.txt.", hint: "Two echo commands.", expected: 'echo "print(1)" > app.py', solution: () => ['echo "print(1)" > app.py', 'echo "todo" > notes.txt'], check: (r) => r.work["app.py"] !== undefined && r.work["notes.txt"] !== undefined },
      { goal: "Stage ONLY app.py (leave notes.txt out) and commit it.", hint: "Add one file, then commit.", expected: 'git add app.py && git commit -m "Add app"', solution: () => ["git add app.py", 'git commit -m "Add app"'], check: (r) => commitsOn(r, "HEAD") === 2 && fileAt(r, "HEAD", "app.py") !== undefined && fileAt(r, "HEAD", "notes.txt") === undefined, explain: "Staging lets you choose exactly what goes into each commit." },
      { goal: "Change app.py, then stage and commit in one go with -a (works for already-tracked files).", hint: "echo ... >> app.py, then git commit -am", expected: 'git commit -am "Print more"', solution: () => ['echo "print(2)" >> app.py', 'git commit -am "Print more"'], check: (r) => commitsOn(r, "HEAD") === 3 && (fileAt(r, "HEAD", "app.py") ?? "").includes("print(2)") },
    ],
  },
  {
    id: "history",
    title: "Lab: read the history",
    intro: "A repo with a few commits is ready. Explore it with log, show, and diff.",
    setup: base(["git init", ...START, 'echo "a" > app.txt', "git add .", 'git commit -m "Add app"', 'echo "b" >> app.txt', 'git commit -am "Add feature b"']),
    steps: [
      { goal: "Show the history, one line per commit.", hint: "log with --oneline", expected: "git log --oneline", check: () => true },
      { goal: "Show the history as a graph of all branches.", hint: "Add --graph and --all", expected: "git log --oneline --graph --all", check: () => true },
      { goal: "Show exactly what the latest commit changed.", hint: "git show (defaults to HEAD)", expected: "git show HEAD", check: () => true },
      { goal: "Edit app.txt (append a line) and view the unstaged diff.", hint: "echo >> then git diff", expected: "git diff", solution: () => ['echo "c" >> app.txt', "git diff"], check: (r) => status(r).unstaged.some((u) => u.path === "app.txt") },
      { goal: "Stage it and view the STAGED diff.", hint: "git diff --staged", expected: "git add app.txt && git diff --staged", solution: () => ["git add app.txt", "git diff --staged"], check: (r) => status(r).staged.some((u) => u.path === "app.txt") },
    ],
  },
  {
    id: "undo",
    title: "Lab: undo things safely",
    intro: "Mistakes happen. Practise restore, reset (soft/mixed/hard), amend, and revert.",
    setup: base(["git init", ...START, 'echo "v1" > app.txt', "git add .", 'git commit -m "Add app"', 'echo "secret=123" > config.txt', "git add .", 'git commit -m "Add config with secret"']),
    steps: [
      {
        goal: "Someone scribbled over app.txt (cat it to see). Throw that edit away with restore.",
        hint: "git restore <file> brings back the last staged/committed version.",
        expected: "git restore app.txt",
        onEnter: (r) => ({ ...r, work: { ...r.work, "app.txt": "oops, broken\n" } }),
        event: "app.txt was overwritten with junk.",
        check: (r) => r.work["app.txt"] === "v1\n",
      },
      { goal: "Stage a change to app.txt, then UNstage it (keep the edit).", hint: "git restore --staged <file>", expected: "git restore --staged app.txt", solution: () => ['echo "v2" > app.txt', "git add app.txt", "git restore --staged app.txt"], check: (r) => r.work["app.txt"] === "v2\n" && r.index["app.txt"] === "v1\n" },
      { goal: "Commit app.txt with a typo message, then fix the message with --amend.", hint: 'git commit --amend -m "better message"', expected: 'git commit --amend -m "Update app to v2"', solution: () => ['git commit -am "Updte app"', 'git commit --amend -m "Update app to v2"'], check: (r) => tipMsg(r) === "Update app to v2" && commitsOn(r, "HEAD") === 4 },
      { goal: "Undo the last commit but KEEP its changes staged.", hint: "reset --soft moves the branch only.", expected: "git reset --soft HEAD~1", check: (r) => commitsOn(r, "HEAD") === 3 && r.index["app.txt"] === "v2\n", explain: "--soft: branch moved back; your changes are still staged." },
      { goal: "Now unstage everything too (mixed reset to HEAD).", hint: "reset with no flag = --mixed", expected: "git reset HEAD", solution: () => ["git reset"], check: (r) => commitsOn(r, "HEAD") === 3 && r.index["app.txt"] === "v1\n" && r.work["app.txt"] === "v2\n" },
      { goal: "Throw away all local changes completely (dangerous!).", hint: "--hard resets index AND working files.", expected: "git reset --hard HEAD", check: (r) => r.work["app.txt"] === "v1\n" && clean(r), explain: "--hard rewrites your files. Use it only when you're sure (reflog can still rescue commits)." },
      { goal: 'The "Add config with secret" commit was already shared. Undo it safely with a NEW commit.', hint: "revert makes an opposite commit — no history rewrite.", expected: "git revert HEAD", check: (r) => tipMsg(r).startsWith("Revert") && fileAt(r, "HEAD", "config.txt") === undefined, explain: "revert is the safe undo for shared branches." },
    ],
  },
  {
    id: "branches",
    title: "Lab: branches and merging",
    intro: "Make branches, switch between them, and see fast-forward vs 3-way merges in the graph.",
    setup: base(["git init", ...START]),
    steps: [
      { goal: "Create a branch called feature/login and switch to it in one command.", hint: "git switch -c <name> (or git checkout -b)", expected: "git switch -c feature/login", check: (r) => onBranch(r, "feature/login") },
      { goal: "Add login.txt and commit it on this branch.", hint: "echo, add, commit", expected: 'git add login.txt && git commit -m "Add login"', solution: () => ['echo "login form" > login.txt', "git add login.txt", 'git commit -m "Add login"'], check: (r) => fileAt(r, "feature/login", "login.txt") !== undefined && fileAt(r, "main", "login.txt") === undefined },
      { goal: "Switch back to main. Notice login.txt disappears (it lives on the branch).", hint: "git switch main", expected: "git switch main", check: (r) => onBranch(r, "main") && r.work["login.txt"] === undefined },
      { goal: "Merge feature/login into main. main hasn't moved, so Git can fast-forward.", hint: "git merge <branch>", expected: "git merge feature/login", check: (r) => onBranch(r, "main") && contains(r, "main", "feature/login") && !isMerge(r), explain: "Fast-forward: no new commit, main's label just slid forward." },
      { goal: "Now create feature/cart from main, commit cart.txt there.", hint: "switch -c, echo, add, commit", expected: 'git switch -c feature/cart … git commit -m "Add cart"', solution: () => ["git switch -c feature/cart", 'echo "cart" > cart.txt', "git add .", 'git commit -m "Add cart"'], check: (r) => fileAt(r, "feature/cart", "cart.txt") !== undefined },
      { goal: "Go back to main and make a different commit there (e.g. edit README.md) so the branches diverge.", hint: "switch main, echo >> README.md, commit -am", expected: 'git switch main && git commit -am "Update readme"', solution: () => ["git switch main", 'echo "More docs" >> README.md', 'git commit -am "Update readme"'], check: (r) => onBranch(r, "main") && !contains(r, "main", "feature/cart") && !contains(r, "feature/cart", "main") },
      { goal: "Merge feature/cart. Branches diverged, so Git makes a 3-way merge commit.", hint: "git merge feature/cart", expected: "git merge feature/cart", check: (r) => isMerge(r) && contains(r, "main", "feature/cart"), explain: "3-way merge: Git combined base + both tips into a new commit with TWO parents." },
      { goal: "Clean up: delete the merged branch feature/cart.", hint: "git branch -d <name>", expected: "git branch -d feature/cart", check: (r) => !r.branches["feature/cart"] },
    ],
  },
  {
    id: "conflicts",
    title: "Lab: resolve merge conflicts",
    intro: "Two branches changed the same line of price.txt. You'll hit a conflict, read the markers, and resolve it — twice.",
    setup: base([
      "git init",
      'echo "price = 10" > price.txt',
      'echo "color = blue" > theme.txt',
      "git add .",
      'git commit -m "Initial prices"',
      "git switch -c sale",
      'echo "price = 8" > price.txt',
      'git commit -am "Sale price"',
      "git switch main",
      'echo "price = 12" > price.txt',
      'git commit -am "Raise price"',
    ]),
    steps: [
      { goal: "Merge the sale branch into main.", hint: "git merge sale — expect a CONFLICT.", expected: "git merge sale", check: (r) => !!r.merge && r.merge.conflicts.includes("price.txt"), explain: "Conflict! Git paused the merge. Nothing is broken." },
      { goal: "Look at the conflicted file to see the markers.", hint: "cat price.txt", expected: "cat price.txt", check: (r) => !!r.merge, explain: "Between <<<<<<< and ======= is YOUR side (HEAD); between ======= and >>>>>>> is THEIR side." },
      { goal: "Decide the final content: write price = 9 into price.txt (no markers).", hint: 'echo "price = 9" > price.txt', expected: 'echo "price = 9" > price.txt', check: (r) => r.work["price.txt"] === "price = 9\n" },
      { goal: "Mark it resolved by staging it.", hint: "git add price.txt", expected: "git add price.txt", check: (r) => !!r.merge && !r.merge.conflicts.length },
      { goal: "Finish the merge with a commit.", hint: "git commit (a default merge message is used)", expected: 'git commit -m "Merge sale, settle on 9"', check: (r) => isMerge(r) && fileAt(r, "HEAD", "price.txt") === "price = 9\n" && !r.merge },
      {
        goal: "Round 2: a theme conflict is set up on branch dark. Merge it, then keep THEIR version with checkout --theirs, add, commit.",
        hint: "git merge dark → git checkout --theirs theme.txt → git add theme.txt → git commit -m ...",
        expected: "git checkout --theirs theme.txt",
        onEnter: (r) => runScript(r, ["git switch -c dark HEAD~1", 'echo "color = black" > theme.txt', 'git commit -am "Dark theme"', "git switch main", 'echo "color = white" > theme.txt', 'git commit -am "Light theme"']),
        event: "Setup: branch 'dark' sets color = black while main set color = white.",
        solution: () => ["!git merge dark", "git checkout --theirs theme.txt", "git add theme.txt", 'git commit -m "Merge dark theme"'],
        check: (r) => isMerge(r) && fileAt(r, "HEAD", "theme.txt") === "color = black\n",
      },
      {
        goal: "Round 3: start a merge of branch 'promo' that conflicts, then change your mind and abort it.",
        hint: "git merge promo, then git merge --abort",
        expected: "git merge --abort",
        onEnter: (r) => runScript(r, ["git switch -c promo HEAD~3", 'echo "price = 5" > price.txt', 'git commit -am "Promo"', "git switch main"]),
        event: "Setup: branch 'promo' sets price = 5.",
        solution: () => ["!git merge promo", "git merge --abort"],
        check: (r) => !r.merge && clean(r) && r.config["__last_abort"] === "merge" && !contains(r, "main", "promo"),
      },
    ],
  },
  {
    id: "rebase",
    title: "Lab: rebase and interactive rebase",
    intro: "Replay your feature on top of the latest main, then tidy messy commits with squash, fixup, and reorder.",
    setup: base([
      "git init",
      ...START,
      "git switch -c feature",
      'echo "step 1" > feature.txt',
      "git add .",
      'git commit -m "Add feature"',
      'echo "step 2" >> feature.txt',
      'git commit -am "wip"',
      'echo "step 3" >> feature.txt',
      'git commit -am "fix typo"',
      "git switch main",
      'echo "hotfix" > hotfix.txt',
      "git add .",
      'git commit -m "Hotfix on main"',
      "git switch feature",
    ]),
    steps: [
      { goal: "Rebase feature onto main so it includes the hotfix and history is linear.", hint: "git rebase main", expected: "git rebase main", check: (r) => onBranch(r, "feature") && contains(r, "feature", "main") && linear(r), explain: "Your 3 commits were replayed as NEW commits (new hashes) on top of main." },
      {
        goal: 'Start an interactive rebase of the last 3 commits, then plan: pick "Add feature", squash "wip", fixup "fix typo", and save.',
        hint: "git rebase -i HEAD~3, then type: pick <hash> / squash <hash> / fixup <hash> / save",
        expected: "git rebase -i HEAD~3",
        solution: (r) => ["git rebase -i HEAD~3", `pick ${hashOf2(r, "Add feature", "feature")}`, `squash ${hashOf2(r, "wip", "feature")}`, `fixup ${hashOf2(r, "fix typo", "feature")}`, "save"],
        check: (r) => !r.interactive && !r.rebase && commitsOn(r, "feature") === commitsOn(r, "main") + 1 && (fileAt(r, "feature", "feature.txt") ?? "").includes("step 3") && tipMsg(r).includes("wip") && !tipMsg(r).includes("fix typo"),
        explain: "squash keeps the message (combined); fixup throws its message away.",
      },
      { goal: "Fast-forward main to the tidy feature.", hint: "switch main, merge feature", expected: "git switch main && git merge feature", solution: () => ["git switch main", "git merge feature"], check: (r) => onBranch(r, "main") && r.branches.main === r.branches.feature && linear(r) },
      {
        goal: "Reorder: two new commits A then B are on branch 'order'. Rewrite them so B comes before A.",
        hint: "git switch order, git rebase -i HEAD~2, pick <B>, pick <A>, save",
        expected: "git rebase -i HEAD~2",
        onEnter: (r) => runScript(r, ["git switch -c order", 'echo "a" > a.txt', "git add .", 'git commit -m "A"', 'echo "b" > b.txt', "git add .", 'git commit -m "B"', "git switch main"]),
        event: "Setup: branch 'order' has commits A then B.",
        solution: (r) => ["git switch order", "git rebase -i HEAD~2", `pick ${hashOf2(r, "B", "order")}`, `pick ${hashOf2(r, "A", "order")}`, "save"],
        check: (r) => onBranch(r, "order") && tipMsg(r) === "A" && tipMsg(r, "HEAD~1") === "B",
      },
    ],
  },
  {
    id: "remotes",
    title: "Lab: remotes — clone, fetch, pull, push",
    intro: "Work with a shared repo on 'GitHub' (simulated). A teammate, Sam, pushes too.",
    setup: () => emptyRepo(),
    steps: [
      { goal: "Clone the team repository.", hint: "git clone <url>", expected: "git clone https://github.com/team/app.git", check: (r) => r.initialized && !!r.remotes.origin && !!r.tracking["origin/main"] },
      { goal: "See which remotes you have.", hint: "git remote -v", expected: "git remote -v", check: (r) => !!r.remotes.origin },
      { goal: "Create branch feature/search, commit search.txt, and push it with upstream tracking.", hint: "git push -u origin feature/search", expected: "git push -u origin feature/search", solution: () => ["git switch -c feature/search", 'echo "search" > search.txt', "git add .", 'git commit -m "Add search"', "git push -u origin feature/search"], check: (r) => !!remoteTip(r, "feature/search") && r.upstream["feature/search"] === "origin/feature/search" },
      {
        goal: "Sam just pushed to main. Download it WITHOUT changing your branches.",
        hint: "git fetch",
        expected: "git fetch",
        onEnter: (r) => {
          const n = structuredClone(r);
          teammatePush(n, "main", "Sam: update footer", { "app.txt": "header\nbody\nnew footer\n" }, "sam");
          return n;
        },
        event: "🔔 Sam pushed 'Sam: update footer' to origin/main.",
        check: (r) => r.tracking["origin/main"] === remoteTip(r, "main"),
        explain: "fetch updates origin/main (your view of the remote) but not your local main.",
      },
      { goal: "Switch to main and bring it up to date.", hint: "git switch main, git pull", expected: "git pull", solution: () => ["git switch main", "git pull"], check: (r) => onBranch(r, "main") && r.branches.main === remoteTip(r, "main") },
      {
        goal: "Commit on main locally. Sam pushes again first — your push gets rejected. Fix it with pull --rebase and push.",
        hint: "commit → git push (rejected) → git pull --rebase → git push",
        expected: "git pull --rebase && git push",
        onEnter: (r) => {
          const n = structuredClone(r);
          teammatePush(n, "main", "Sam: add docs", { "docs.txt": "docs\n" }, "sam");
          return n;
        },
        event: "🔔 Sam pushed 'Sam: add docs' to origin/main (you don't have it yet).",
        solution: () => ['echo "header v2\nbody\nnew footer" > app.txt', 'git commit -am "Bump header"', "!git push", "git pull --rebase", "git push"],
        check: (r) => remoteTip(r, "main") === r.branches.main && linear(r, "main") && (fileAt(r, "main", "docs.txt") ?? "") !== "" && firstParentMessages(r, "main").length >= 5,
        explain: "pull --rebase replays your commit on top of Sam's, keeping history linear.",
      },
    ],
  },
  {
    id: "toolbox",
    title: "Lab: stash, cherry-pick, tags, reflog",
    intro: "Power tools for real days: park work, copy a single fix, mark releases, and recover 'lost' commits.",
    setup: base(["git init", ...START, "git switch -c hotfix", 'echo "fix" > fix.txt', "git add .", 'git commit -m "Fix crash"', "git switch main"]),
    steps: [
      { goal: "Start editing README.md (append a line) — then park the work with stash.", hint: "echo >> README.md, then git stash", expected: "git stash", solution: () => ['echo "wip" >> README.md', "git stash"], check: (r) => r.stash.length === 1 && clean(r) },
      { goal: "List your stashes.", hint: "git stash list", expected: "git stash list", check: (r) => r.stash.length === 1 },
      { goal: "Copy ONLY the 'Fix crash' commit from hotfix onto main.", hint: "git cherry-pick hotfix (the branch tip)", expected: "git cherry-pick hotfix", check: (r) => onBranch(r, "main") && fileAt(r, "main", "fix.txt") === "fix\n" && tipMsg(r) === "Fix crash" && !contains(r, "main", "hotfix") },
      { goal: "Bring back your parked work.", hint: "git stash pop", expected: "git stash pop", check: (r) => r.stash.length === 0 && (r.work["README.md"] ?? "").includes("wip") },
      { goal: "Commit it, then tag the release v1.0.0 with an annotated tag.", hint: 'git tag -a v1.0.0 -m "First release"', expected: 'git tag -a v1.0.0 -m "First release"', solution: () => ['git commit -am "Docs wip"', 'git tag -a v1.0.0 -m "First release"'], check: (r) => !!r.tags["v1.0.0"] && r.tags["v1.0.0"].id === headId(r) && clean(r) },
      { goal: "Oops: hard-reset main back 2 commits (simulating a mistake).", hint: "git reset --hard HEAD~2", expected: "git reset --hard HEAD~2", check: (r) => commitsOn(r, "main") === 1 },
      { goal: "Find the lost commit in the reflog…", hint: "git reflog", expected: "git reflog", check: (r) => commitsOn(r, "main") === 1 },
      { goal: "…and recover it: reset back to where HEAD was before the mistake.", hint: "git reset --hard HEAD@{1}", expected: "git reset --hard HEAD@{1}", check: (r) => r.branches.main === r.tags["v1.0.0"]?.id, explain: "reflog remembers where HEAD has been — your safety net (about 90 days locally)." },
    ],
  },
  {
    id: "ignore",
    title: "Lab: .gitignore",
    intro: "Keep junk (logs, secrets, build output) out of your repo.",
    setup: base(["git init", ...START, 'echo "debug" > app.log', 'echo "KEY=abc" > .env', 'echo "x" > build/out.js', 'echo "code" > main.py']),
    steps: [
      { goal: "Check status — notice app.log, .env and build/ are untracked noise.", hint: "git status", expected: "git status", check: () => true },
      { goal: "Create a .gitignore that ignores *.log files.", hint: 'echo "*.log" > .gitignore', expected: 'echo "*.log" > .gitignore', check: (r) => (r.work[".gitignore"] ?? "").includes("*.log") },
      { goal: "Also ignore .env and the build/ folder (append lines).", hint: "echo ... >> .gitignore (twice)", expected: 'echo ".env" >> .gitignore', solution: () => ['echo ".env" >> .gitignore', 'echo "build/" >> .gitignore'], check: (r) => { const u = status(r).untracked; return !u.includes(".env") && !u.includes("build/out.js") && !u.includes("app.log"); } },
      { goal: "Stage everything and commit — only .gitignore and main.py should go in.", hint: "git add . then commit", expected: 'git add . && git commit -m "Add main and gitignore"', solution: () => ["git add .", 'git commit -m "Add main and gitignore"'], check: (r) => fileAt(r, "HEAD", "main.py") !== undefined && fileAt(r, "HEAD", ".gitignore") !== undefined && fileAt(r, "HEAD", ".env") === undefined && fileAt(r, "HEAD", "app.log") === undefined },
    ],
  },
  {
    id: "pr-flow",
    title: "Lab: pull-request flow",
    intro: "Branch → commit → push → (open PR on GitHub) → address review → merge → clean up.",
    setup: withRemote(START),
    steps: [
      { goal: "Create branch feature/profile from main.", hint: "git switch -c", expected: "git switch -c feature/profile", check: (r) => onBranch(r, "feature/profile") },
      { goal: "Commit profile.txt and push the branch with -u. (On GitHub you'd now click 'Open pull request'.)", hint: "echo, add, commit, git push -u origin feature/profile", expected: "git push -u origin feature/profile", solution: () => ['echo "profile page" > profile.txt', "git add .", 'git commit -m "Add profile page"', "git push -u origin feature/profile"], check: (r) => !!remoteTip(r, "feature/profile") },
      { goal: "Reviewer asks: 'please add an avatar'. Commit that change and push again (the PR updates automatically).", hint: "echo >> profile.txt, commit -am, git push", expected: "git push", solution: () => ['echo "avatar" >> profile.txt', 'git commit -am "Add avatar (review feedback)"', "git push"], check: (r) => remoteTip(r, "feature/profile") === r.branches["feature/profile"] && commitsOn(r, "feature/profile") === 3 },
      { goal: "PR approved! Merge it into main with a merge commit (like GitHub's 'Create a merge commit').", hint: "git switch main, git merge --no-ff feature/profile", expected: "git merge --no-ff feature/profile", solution: () => ["git switch main", "git merge --no-ff feature/profile"], check: (r) => onBranch(r, "main") && isMerge(r) },
      { goal: "Push main, delete the branch locally and on the remote.", hint: "git push, git branch -d, git push origin --delete", expected: "git push origin --delete feature/profile", solution: () => ["git push", "git branch -d feature/profile", "git push origin --delete feature/profile"], check: (r) => remoteTip(r, "main") === r.branches.main && !r.branches["feature/profile"] && !remoteTip(r, "feature/profile") },
    ],
  },
  {
    id: "detective",
    title: "Lab: bisect, blame, worktrees",
    intro: "Somewhere in 6 commits, calc.txt started saying 'result = WRONG'. Find the culprit fast.",
    setup: base([
      "git init",
      'echo "result = ok" > calc.txt',
      "git add .",
      'git commit -m "v1 calc"',
      "git tag v1",
      'echo "docs" > docs.txt',
      "git add .",
      'git commit -m "Add docs"',
      'echo "style" > style.txt',
      "git add .",
      'git commit -m "Add styles"',
      "git config user.name lee",
      'echo "result = WRONG" > calc.txt',
      'git commit -am "Refactor calc"',
      "git config user.name you",
      'echo "more docs" >> docs.txt',
      'git commit -am "More docs"',
      'echo "more style" >> style.txt',
      'git commit -am "More styles"',
    ]),
    steps: [
      { goal: "Start bisecting.", hint: "git bisect start", expected: "git bisect start", check: (r) => !!r.bisect },
      { goal: "Mark the current commit as bad and v1 as good.", hint: "git bisect bad, then git bisect good v1", expected: "git bisect good v1", solution: () => ["git bisect bad", "git bisect good v1"], check: (r) => !!r.bisect?.bad && !!r.bisect.good.length },
      {
        goal: "Test each commit Git checks out (cat calc.txt) and answer good/bad until Git names the first bad commit.",
        hint: "If calc.txt says WRONG → git bisect bad, else git bisect good.",
        expected: "git bisect good | git bisect bad",
        solution: (r) => {
          const out: string[] = [];
          let cur = r;
          for (let i = 0; i < 5 && !cur.config["__bisect_result"]; i++) {
            const bad = (cur.work["calc.txt"] ?? "").includes("WRONG");
            const cmd = bad ? "git bisect bad" : "git bisect good";
            out.push(cmd);
            cur = runScript(cur, [cmd]);
          }
          return out;
        },
        check: (r) => !!r.config["__bisect_result"] && r.commits[r.config["__bisect_result"]].message === "Refactor calc",
        explain: "Binary search: 6 commits needed only ~3 tests.",
      },
      { goal: "Finish bisecting and return to main.", hint: "git bisect reset", expected: "git bisect reset", check: (r) => !r.bisect && onBranch(r, "main") },
      { goal: "Who last touched each line of calc.txt?", hint: "git blame calc.txt", expected: "git blame calc.txt", check: () => true, explain: "blame shows commit + author per line. Use it to find context, not to blame people!" },
      { goal: "Open a second working folder for an urgent fix without stashing: a worktree on a new branch 'urgent'.", hint: "git worktree add -b urgent ../urgent", expected: "git worktree add -b urgent ../urgent", check: (r) => r.worktrees.some((w) => w.branch === "urgent") },
      { goal: "List worktrees.", hint: "git worktree list", expected: "git worktree list", check: (r) => r.worktrees.length > 0 },
    ],
  },
  // ---------- branching strategies ----------
  {
    id: "github-flow",
    title: "Team sim: GitHub Flow",
    intro: "main is always deployable. Every change = short branch → PR → review → merge → deploy.",
    setup: withRemote(START),
    steps: [
      { goal: "Pull the latest main before starting.", hint: "git pull", expected: "git pull", check: (r) => onBranch(r, "main") },
      { goal: "Create a short-lived branch feature/dark-mode.", hint: "git switch -c feature/dark-mode", expected: "git switch -c feature/dark-mode", check: (r) => onBranch(r, "feature/dark-mode") },
      { goal: "Commit your work and push the branch (open a PR on GitHub).", hint: "commit then git push -u origin feature/dark-mode", expected: "git push -u origin feature/dark-mode", solution: () => ['echo "dark" > theme.txt', "git add .", 'git commit -m "Add dark mode"', "git push -u origin feature/dark-mode"], check: (r) => !!remoteTip(r, "feature/dark-mode") },
      {
        goal: "While you waited for review, a teammate merged to main. Update your branch with rebase and force-push safely.",
        hint: "git fetch, git rebase origin/main, git push --force-with-lease",
        expected: "git push --force-with-lease",
        onEnter: (r) => {
          const n = structuredClone(r);
          teammatePush(n, "main", "Mia: fix login bug", { "login.txt": "fixed\n" }, "mia");
          return n;
        },
        event: "🔔 Mia merged 'fix login bug' to main.",
        solution: () => ["git fetch", "git rebase origin/main", "git push --force-with-lease"],
        check: (r) => hasRemoteMain(r, "feature/dark-mode") && remoteTip(r, "feature/dark-mode") === r.branches["feature/dark-mode"],
      },
      { goal: "Approved ✅. Merge into main (squash-style: one tidy commit) and push. CI deploys main.", hint: 'git switch main, git pull, git merge --squash feature/dark-mode, git commit -m "...", git push', expected: "git merge --squash feature/dark-mode", solution: () => ["git switch main", "git pull", "git merge --squash feature/dark-mode", 'git commit -m "Dark mode (#42)"', "git push"], check: (r) => remoteTip(r, "main") === r.branches.main && fileAt(r, "main", "theme.txt") === "dark\n" && linear(r, "main") },
      { goal: "Delete the feature branch everywhere.", hint: "git branch -D (squash merges aren't 'merged' by ancestry) and git push origin --delete", expected: "git push origin --delete feature/dark-mode", solution: () => ["git branch -D feature/dark-mode", "git push origin --delete feature/dark-mode"], check: (r) => !r.branches["feature/dark-mode"] && !remoteTip(r, "feature/dark-mode") },
    ],
  },
  {
    id: "git-flow",
    title: "Team sim: Git Flow",
    intro: "Two long-lived branches: main (released code) and develop (next release). Plus feature/*, release/*, hotfix/* branches.",
    setup: base(["git init", ...START, 'git tag -a v1.0.0 -m "v1.0.0"']),
    steps: [
      { goal: "Create the develop branch from main.", hint: "git switch -c develop", expected: "git switch -c develop", check: (r) => !!r.branches.develop && onBranch(r, "develop") },
      { goal: "Start feature/reports from develop and commit reports.txt.", hint: "git switch -c feature/reports develop …", expected: 'git switch -c feature/reports && … git commit -m "Add reports"', solution: () => ["git switch -c feature/reports", 'echo "reports" > reports.txt', "git add .", 'git commit -m "Add reports"'], check: (r) => fileAt(r, "feature/reports", "reports.txt") !== undefined },
      { goal: "Finish the feature: merge it into develop with --no-ff (keeps the feature visible) and delete it.", hint: "git switch develop, git merge --no-ff feature/reports, git branch -d feature/reports", expected: "git merge --no-ff feature/reports", solution: () => ["git switch develop", "git merge --no-ff feature/reports", "git branch -d feature/reports"], check: (r) => isMerge(r, "develop") && !r.branches["feature/reports"] },
      { goal: "Cut a release branch release/1.1 from develop and bump the version file.", hint: "git switch -c release/1.1, echo 1.1.0 > VERSION, commit", expected: "git switch -c release/1.1", solution: () => ["git switch -c release/1.1", 'echo "1.1.0" > VERSION', "git add .", 'git commit -m "Bump version to 1.1.0"'], check: (r) => fileAt(r, "release/1.1", "VERSION") === "1.1.0\n" },
      { goal: "Ship it: merge release/1.1 into main (--no-ff) and tag v1.1.0.", hint: "git switch main, git merge --no-ff release/1.1, git tag -a v1.1.0 -m ...", expected: 'git tag -a v1.1.0 -m "v1.1.0"', solution: () => ["git switch main", "git merge --no-ff release/1.1", 'git tag -a v1.1.0 -m "v1.1.0"'], check: (r) => !!r.tags["v1.1.0"] && r.tags["v1.1.0"].id === r.branches.main && fileAt(r, "main", "VERSION") === "1.1.0\n" },
      { goal: "Merge the release back into develop too, then delete release/1.1.", hint: "git switch develop, git merge --no-ff release/1.1, git branch -d release/1.1", expected: "git merge --no-ff release/1.1", solution: () => ["git switch develop", "git merge --no-ff release/1.1", "git branch -d release/1.1"], check: (r) => fileAt(r, "develop", "VERSION") === "1.1.0\n" && !r.branches["release/1.1"] },
      { goal: "🔥 Production bug! Create hotfix/1.1.1 from main, fix it (commit), merge to main, tag v1.1.1.", hint: "git switch -c hotfix/1.1.1 main … git switch main, git merge --no-ff hotfix/1.1.1, git tag", expected: "git switch -c hotfix/1.1.1 main", solution: () => ["git switch -c hotfix/1.1.1 main", 'echo "1.1.1" > VERSION', 'git commit -am "Fix crash on export"', "git switch main", "git merge --no-ff hotfix/1.1.1", 'git tag -a v1.1.1 -m "v1.1.1"'], check: (r) => r.tags["v1.1.1"]?.id === r.branches.main && fileAt(r, "main", "VERSION") === "1.1.1\n" },
      { goal: "Merge the hotfix into develop as well so the fix isn't lost, then delete the hotfix branch.", hint: "git switch develop, git merge --no-ff hotfix/1.1.1, git branch -d hotfix/1.1.1", expected: "git merge --no-ff hotfix/1.1.1", solution: () => ["git switch develop", "git merge --no-ff hotfix/1.1.1", "git branch -d hotfix/1.1.1"], check: (r) => fileAt(r, "develop", "VERSION") === "1.1.1\n" && isMerge(r, "develop") && !r.branches["hotfix/1.1.1"] },
    ],
  },
  {
    id: "trunk",
    title: "Team sim: trunk-based development",
    intro: "Everyone integrates into main (the trunk) at least daily. Unfinished work hides behind a feature flag.",
    setup: withRemote(['echo "checkout_v2 = false" > flags.txt', 'echo "old checkout" > checkout.txt', "git add .", 'git commit -m "Initial app with flags"']),
    steps: [
      { goal: "Create a tiny short-lived branch for step 1 of the new checkout.", hint: "git switch -c checkout-v2-step1", expected: "git switch -c checkout-v2-step1", check: (r) => onBranch(r, "checkout-v2-step1") },
      { goal: "Add the new code behind the flag (flag stays false) and commit.", hint: 'echo "new checkout (behind flag)" > checkout_v2.txt …', expected: 'git commit -m "Checkout v2 step 1 (flag off)"', solution: () => ['echo "new checkout (behind flag)" > checkout_v2.txt', "git add .", 'git commit -m "Checkout v2 step 1 (flag off)"'], check: (r) => fileAt(r, "HEAD", "checkout_v2.txt") !== undefined && fileAt(r, "HEAD", "flags.txt") === "checkout_v2 = false\n" },
      {
        goal: "A teammate integrated to main meanwhile. Rebase on origin/main, merge to main (fast-forward), push — all within the same day.",
        hint: "git fetch, git rebase origin/main, git switch main, git pull, git merge checkout-v2-step1, git push",
        expected: "git merge checkout-v2-step1 && git push",
        onEnter: (r) => {
          const n = structuredClone(r);
          teammatePush(n, "main", "Raj: tweak search", { "search.txt": "faster\n" }, "raj");
          return n;
        },
        event: "🔔 Raj pushed 'tweak search' to main.",
        solution: () => ["git fetch", "git rebase origin/main", "git switch main", "git pull", "git merge checkout-v2-step1", "git push"],
        check: (r) => remoteTip(r, "main") === r.branches.main && linear(r, "main") && fileAt(r, "main", "checkout_v2.txt") !== undefined,
        explain: "The new code is in production but switched off. No long-lived branch, no big-bang merge.",
      },
      { goal: "Feature is ready: flip the flag ON directly on main with a tiny commit and push.", hint: 'echo "checkout_v2 = true" > flags.txt, commit -am, push', expected: 'git commit -am "Enable checkout v2" && git push', solution: () => ["git branch -d checkout-v2-step1", 'echo "checkout_v2 = true" > flags.txt', 'git commit -am "Enable checkout v2"', "git push"], check: (r) => fileAt(r, "origin/main", "flags.txt") === "checkout_v2 = true\n" && remoteTip(r, "main") === r.branches.main },
      { goal: "Tag the release from trunk.", hint: 'git tag -a v2.0.0 -m "..." and git push origin v2.0.0', expected: "git push origin v2.0.0", solution: () => ['git tag -a v2.0.0 -m "Checkout v2"', "git push origin v2.0.0"], check: (r) => !!r.remotes.origin?.tags["v2.0.0"] },
    ],
  },
  {
    id: "gitlab-flow",
    title: "Team sim: GitLab Flow (environment branches)",
    intro: "main → staging → production. Code flows downstream only, by merging; fixes go to main first, then get promoted.",
    setup: base(["git init", ...START, "git branch staging", "git branch production"]),
    steps: [
      { goal: "Develop a feature on a branch and merge it to main.", hint: "git switch -c feature/invoice … commit … git switch main, git merge feature/invoice", expected: "git merge feature/invoice", solution: () => ["git switch -c feature/invoice", 'echo "invoice" > invoice.txt', "git add .", 'git commit -m "Add invoices"', "git switch main", "git merge feature/invoice"], check: (r) => fileAt(r, "main", "invoice.txt") !== undefined },
      { goal: "Promote main to staging (merge main INTO staging).", hint: "git switch staging, git merge main", expected: "git switch staging && git merge main", solution: () => ["git switch staging", "git merge main"], check: (r) => fileAt(r, "staging", "invoice.txt") !== undefined },
      { goal: "QA found a bug. Fix it upstream FIRST: on main, commit the fix.", hint: "git switch main, edit invoice.txt, commit -am", expected: 'git switch main && git commit -am "Fix invoice rounding"', solution: () => ["git switch main", 'echo "invoice (rounding fixed)" > invoice.txt', 'git commit -am "Fix invoice rounding"'], check: (r) => (fileAt(r, "main", "invoice.txt") ?? "").includes("fixed") && !(fileAt(r, "staging", "invoice.txt") ?? "").includes("fixed") },
      { goal: "Promote again: main → staging, then staging → production.", hint: "git switch staging, git merge main, git switch production, git merge staging", expected: "git switch production && git merge staging", solution: () => ["git switch staging", "git merge main", "git switch production", "git merge staging"], check: (r) => (fileAt(r, "production", "invoice.txt") ?? "").includes("fixed") && contains(r, "production", "main") },
    ],
  },
  {
    id: "release-branching",
    title: "Team sim: release branches",
    intro: "Each version gets its own maintenance branch (release/1.x). New work continues on main; fixes are cherry-picked to supported releases.",
    setup: base(["git init", ...START, 'echo "1.0" > VERSION', "git add .", 'git commit -m "Version 1.0"']),
    steps: [
      { goal: "Cut release/1.x from main and tag v1.0.0 on it.", hint: "git branch release/1.x, git tag -a v1.0.0 -m ...", expected: "git branch release/1.x", solution: () => ["git branch release/1.x", 'git tag -a v1.0.0 -m "v1.0.0"'], check: (r) => !!r.branches["release/1.x"] && !!r.tags["v1.0.0"] },
      { goal: "Keep building v2 on main: commit a new feature.", hint: "echo, add, commit on main", expected: 'git commit -m "Start v2 API"', solution: () => ['echo "v2 api" > api.txt', "git add .", 'git commit -m "Start v2 API"'], check: (r) => fileAt(r, "main", "api.txt") !== undefined && fileAt(r, "release/1.x", "api.txt") === undefined },
      { goal: "A security bug affects both. Fix it on main first.", hint: 'echo "patched" > security.txt …commit', expected: 'git commit -m "Patch XSS"', solution: () => ['echo "patched" > security.txt', "git add .", 'git commit -m "Patch XSS"'], check: (r) => tipMsg(r, "main") === "Patch XSS" },
      { goal: "Back-port ONLY the fix to release/1.x with cherry-pick, and tag v1.0.1.", hint: "git switch release/1.x, git cherry-pick main, git tag -a v1.0.1 -m ...", expected: "git cherry-pick main", solution: () => ["git switch release/1.x", "git cherry-pick main", 'git tag -a v1.0.1 -m "v1.0.1"'], check: (r) => fileAt(r, "release/1.x", "security.txt") === "patched\n" && fileAt(r, "release/1.x", "api.txt") === undefined && r.tags["v1.0.1"]?.id === r.branches["release/1.x"] },
    ],
  },
  {
    id: "forking",
    title: "Team sim: forking workflow",
    intro: "Open-source style: you can't push to the main repo ('upstream'). You push to your fork ('origin') and open a PR across repos.",
    setup: () => {
      let r = emptyRepo();
      r = runScript(r, ["git clone https://github.com/you/fork.git"]);
      const up = structuredClone(r.remotes.origin);
      up.name = "upstream";
      up.url = "https://github.com/bigproject/app.git";
      r.config["__fork_seed"] = JSON.stringify(up);
      return r;
    },
    steps: [
      { goal: "You cloned your fork. Add the original project as a second remote called upstream.", hint: "git remote add upstream <url>", expected: "git remote add upstream https://github.com/bigproject/app.git", check: (r) => !!r.remotes.upstream },
      {
        goal: "Maintainers merged new work upstream. Fetch it and update your main from upstream/main, then push it to your fork.",
        hint: "git fetch upstream, git merge upstream/main (or git pull upstream main), git push origin main",
        expected: "git pull upstream main && git push origin main",
        onEnter: (r) => {
          const n = structuredClone(r);
          if (n.remotes.upstream && n.config["__fork_seed"]) {
            const seed = JSON.parse(n.config["__fork_seed"]);
            n.remotes.upstream.commits = { ...seed.commits, ...n.remotes.upstream.commits };
            if (!n.remotes.upstream.branches.main) n.remotes.upstream.branches = seed.branches;
            teammatePush(n, "main", "Maintainer: add plugin API", { "plugins.txt": "api\n" }, "maintainer", "upstream");
          }
          return n;
        },
        event: "🔔 A maintainer merged 'add plugin API' into upstream/main.",
        solution: () => ["git pull upstream main", "git push origin main"],
        check: (r) => fileAt(r, "main", "plugins.txt") !== undefined && remoteTip(r, "main") === r.branches.main,
      },
      { goal: "Create fix/typo, commit, and push it to YOUR fork (origin).", hint: "git switch -c fix/typo … git push -u origin fix/typo", expected: "git push -u origin fix/typo", solution: () => ["git switch -c fix/typo", 'echo "# Team app (typo fixed)" > README.md', 'git commit -am "Fix README typo"', "git push -u origin fix/typo"], check: (r) => !!remoteTip(r, "fix/typo") && !r.remotes.upstream?.branches["fix/typo"] },
      { goal: "On GitHub you'd open a PR from you/fork:fix/typo → bigproject/app:main. Confirm your remotes with -v.", hint: "git remote -v", expected: "git remote -v", check: (r) => !!r.remotes.upstream && !!r.remotes.origin },
    ],
  },
  {
    id: "capstone",
    title: "Capstone: team simulation",
    intro: "You're on a 3-person team (you, Sam, Mia) using GitHub Flow with releases. Teammates push while you work — handle every situation.",
    setup: withRemote(['echo "header\nbody\nfooter" > app.txt', 'echo "price = 10" > price.txt', "git add .", 'git commit -m "Initial app"', 'git tag -a v1.0.0 -m "v1.0.0"']),
    steps: [
      { goal: "Start the ticket: branch feature/discounts from an up-to-date main.", hint: "git pull, git switch -c feature/discounts", expected: "git switch -c feature/discounts", solution: () => ["git pull", "git switch -c feature/discounts"], check: (r) => onBranch(r, "feature/discounts") },
      { goal: "Make two small commits: set price = 9 in price.txt, then add discount.txt.", hint: "echo > price.txt, commit -am; echo > discount.txt, add, commit", expected: 'git commit -am "Discount price" … git commit -m "Add discount rules"', solution: () => ['echo "price = 9" > price.txt', 'git commit -am "Discount price"', 'echo "10% off" > discount.txt', "git add .", 'git commit -m "Add discount rules"'], check: (r) => commitsOn(r, "feature/discounts") >= 3 && fileAt(r, "HEAD", "discount.txt") !== undefined && fileAt(r, "HEAD", "price.txt") === "price = 9\n" },
      {
        goal: "Sam changed price.txt on main too. Fetch and rebase your branch on origin/main — you'll get a conflict. Resolve it to price = 9, add, continue.",
        hint: "git fetch → git rebase origin/main → echo \"price = 9\" > price.txt → git add price.txt → git rebase --continue",
        expected: "git rebase --continue",
        onEnter: (r) => {
          const n = structuredClone(r);
          teammatePush(n, "main", "Sam: price 11", { "price.txt": "price = 11\n" }, "sam");
          return n;
        },
        event: "🔔 Sam pushed 'price 11' to main.",
        solution: () => ["git fetch", "!git rebase origin/main", 'echo "price = 9" > price.txt', "git add price.txt", "git rebase --continue"],
        check: (r) => !r.rebase && onBranch(r, "feature/discounts") && hasRemoteMain(r, "feature/discounts") && fileAt(r, "HEAD", "price.txt") === "price = 9\n" && linear(r),
      },
      { goal: "Tidy up before review: squash your 2 commits into one with interactive rebase.", hint: "git rebase -i HEAD~2 → pick <first> → squash <second> → save", expected: "git rebase -i HEAD~2", solution: (r) => ["git rebase -i HEAD~2", `pick ${hashOf2(r, "Discount price", "feature/discounts")}`, `squash ${hashOf2(r, "Add discount rules", "feature/discounts")}`, "save"], check: (r) => !r.interactive && !r.rebase && commitsOn(r, "feature/discounts") === commitsOn(r, "origin/main") + 1 },
      { goal: "Push your branch for review (it's new on the remote).", hint: "git push -u origin feature/discounts", expected: "git push -u origin feature/discounts", check: (r) => remoteTip(r, "feature/discounts") === r.branches["feature/discounts"] },
      {
        goal: "Urgent! Mia says production crashes. Your work is committed and pushed, so no stash needed: check status, then create hotfix/crash from origin/main, fix it, push it.",
        hint: "git switch -c hotfix/crash origin/main, echo fix, commit, git push -u origin hotfix/crash",
        expected: "git push -u origin hotfix/crash",
        event: "🔥 Mia: 'checkout crashes in prod!' (fix footer in app.txt)",
        solution: () => ["git status", "git switch -c hotfix/crash origin/main", 'echo "header\nbody\nfooter (crash fixed)" > app.txt', 'git commit -am "Fix footer crash"', "git push -u origin hotfix/crash"],
        check: (r) => !!remoteTip(r, "hotfix/crash") && (fileAt(r, "hotfix/crash", "app.txt") ?? "").includes("crash fixed"),
      },
      { goal: "Hotfix approved: merge it to main, tag v1.0.1, push main and the tag.", hint: "git switch main, git pull, git merge hotfix/crash, git tag -a v1.0.1 -m ..., git push, git push origin v1.0.1", expected: "git push origin v1.0.1", solution: () => ["git switch main", "git pull", "git merge hotfix/crash", 'git tag -a v1.0.1 -m "v1.0.1"', "git push", "git push origin v1.0.1"], check: (r) => !!r.remotes.origin?.tags["v1.0.1"] && remoteTip(r, "main") === r.branches.main && (fileAt(r, "main", "app.txt") ?? "").includes("crash fixed") },
      { goal: "Your discounts PR is approved too. Rebase it onto the new main, merge with --no-ff, push.", hint: "git switch feature/discounts, git rebase main, git switch main, git merge --no-ff feature/discounts, git push", expected: "git merge --no-ff feature/discounts", solution: () => ["git switch feature/discounts", "git rebase main", "git switch main", "git merge --no-ff feature/discounts", "git push"], check: (r) => isMerge(r, "main") && remoteTip(r, "main") === r.branches.main && fileAt(r, "main", "discount.txt") !== undefined && (fileAt(r, "main", "app.txt") ?? "").includes("crash fixed") },
      { goal: "Clean up both branches locally and remotely, then view the final graph.", hint: "git branch -d …, git push origin --delete …, git log --oneline --graph --all", expected: "git log --oneline --graph --all", solution: () => ["git branch -d feature/discounts", "git branch -d hotfix/crash", "git push origin --delete feature/discounts", "git push origin --delete hotfix/crash", "git log --oneline --graph --all"], check: (r) => !r.branches["feature/discounts"] && !r.branches["hotfix/crash"] && !remoteTip(r, "feature/discounts") && !remoteTip(r, "hotfix/crash") },
    ],
  },
];

function hashOf2(r: Repo, msg: string, branch: string): string {
  const id = resolve(r, branch);
  if (!id) return hashOf(r, msg);
  return short(reachable(r, [id]).find((c) => c.message === msg)?.id);
}

export function getLab(id: string): Lab | undefined {
  return LABS.find((l) => l.id === id);
}

export { noMarkers };
