const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const PRE_COMMIT_HOOK = fs.readFileSync(path.join(ROOT, ".github/hooks/pre-commit"), "utf8");
const DOC_SYNC_GUARD = fs.readFileSync(path.join(ROOT, "scripts/check-doc-updates.js"), "utf8");
const DOC_SYNC_CONFIG = fs.readFileSync(path.join(ROOT, "scripts/check-doc-updates.config.js"), "utf8");

function writeFile(repoRoot, relativePath, content, mode) {
  const absolutePath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
  if (mode) {
    fs.chmodSync(absolutePath, mode);
  }
}

function createTempRepo(options = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "precommit-doc-sync-"));
  const configContent = options.configContent || DOC_SYNC_CONFIG;

  execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Copilot Test"], { cwd: repoRoot, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "copilot@example.com"], { cwd: repoRoot, stdio: "ignore" });

  writeFile(repoRoot, ".github/hooks/pre-commit", PRE_COMMIT_HOOK, 0o755);
  writeFile(repoRoot, "scripts/check-doc-updates.js", DOC_SYNC_GUARD, 0o755);
  writeFile(repoRoot, "scripts/check-doc-updates.config.js", configContent, 0o755);
  writeFile(repoRoot, "scripts/migrate-completed-plans.js", 'console.log("migrate ok");\n', 0o755);
  writeFile(repoRoot, "scripts/check-docs-freshness.js", 'console.log("freshness ok");\n', 0o755);
  writeFile(repoRoot, "scripts/check-docs-consistency.js", 'console.log("consistency ok");\n', 0o755);
  writeFile(repoRoot, "scripts/install-git-hooks.sh", "#!/bin/sh\necho base\n", 0o755);
  writeFile(repoRoot, "docs/FRONTEND.md", "# Frontend\n");
  writeFile(repoRoot, "docs/BACKEND.md", "# Backend\n");
  writeFile(repoRoot, "docs/GOLDEN_RULES.md", "# Golden Rules\n");
  writeFile(repoRoot, "docs/PROJECT_OPERATIONS.md", "# Project Operations\n");
  writeFile(repoRoot, "docs/ARCHITECTURE.md", "# Architecture\n");
  writeFile(repoRoot, "docs/QUALITY.md", "# Quality\n");
  writeFile(repoRoot, "docs/exec-plans/active/README.md", "# Active\n");
  writeFile(repoRoot, "docs/exec-plans/completed/README.md", "# Completed\n");

  execFileSync("git", ["add", "."], { cwd: repoRoot, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "base"], { cwd: repoRoot, stdio: "ignore" });

  return repoRoot;
}

function runPreCommit(repoRoot) {
  return spawnSync("sh", [".github/hooks/pre-commit"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}

test("pre-commit blocks workflow changes when required durable docs are missing", () => {
  const repoRoot = createTempRepo();

  try {
    writeFile(repoRoot, "scripts/install-git-hooks.sh", "#!/bin/sh\necho changed\n", 0o755);
    execFileSync("git", ["add", "scripts/install-git-hooks.sh"], { cwd: repoRoot, stdio: "ignore" });

    const result = runPreCommit(repoRoot);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Durable doc sync check failed/);
    assert.match(result.stderr, /docs\/GOLDEN_RULES\.md/);
    assert.match(result.stderr, /docs\/PROJECT_OPERATIONS\.md/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("pre-commit allows workflow changes after the required durable docs are staged", () => {
  const repoRoot = createTempRepo();

  try {
    writeFile(repoRoot, "scripts/install-git-hooks.sh", "#!/bin/sh\necho changed\n", 0o755);
    writeFile(repoRoot, "docs/GOLDEN_RULES.md", "# Golden Rules\nUpdated\n");
    writeFile(repoRoot, "docs/PROJECT_OPERATIONS.md", "# Project Operations\nUpdated\n");
    execFileSync(
      "git",
      ["add", "scripts/install-git-hooks.sh", "docs/GOLDEN_RULES.md", "docs/PROJECT_OPERATIONS.md"],
      { cwd: repoRoot, stdio: "ignore" }
    );

    const result = runPreCommit(repoRoot);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /migrate ok/);
    assert.match(result.stdout, /freshness ok/);
    assert.match(result.stdout, /consistency ok/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("pre-commit honors repository-local routes for application code", () => {
  const repoRoot = createTempRepo({
    configContent: `module.exports = {
  durableDocPatterns: [
    /^docs\\/(?:ARCHITECTURE|BACKEND|FRONTEND|GOLDEN_RULES|PLAN|PROJECT_OPERATIONS|QUALITY|CODE_QUALITY)\\.md$/
  ],
  routes: [
    {
      pattern: /^apps\\/web\\//,
      requiredDocs: ["docs/FRONTEND.md"]
    }
  ]
};
`
  });

  try {
    writeFile(repoRoot, "apps/web/src/App.tsx", "export const App = () => null;\n");
    execFileSync("git", ["add", "apps/web/src/App.tsx"], { cwd: repoRoot, stdio: "ignore" });

    const result = runPreCommit(repoRoot);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /docs\/FRONTEND\.md/);
    assert.match(result.stderr, /apps\/web\/src\/App\.tsx/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("pre-commit fails closed when route config is malformed", () => {
  const repoRoot = createTempRepo({
    configContent: "module.exports = { durableDocPatterns: [] };\n"
  });

  try {
    writeFile(repoRoot, "scripts/install-git-hooks.sh", "#!/bin/sh\necho changed\n", 0o755);
    execFileSync("git", ["add", "scripts/install-git-hooks.sh"], { cwd: repoRoot, stdio: "ignore" });

    const result = runPreCommit(repoRoot);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Doc update config must export a routes array/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});