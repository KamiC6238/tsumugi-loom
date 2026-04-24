const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  loadConfig,
  getRequiredDurableDocs,
  findMissingDurableDocs
} = require("../scripts/check-doc-updates.js");

test("workflow changes require GOLDEN_RULES and PROJECT_OPERATIONS updates", () => {
  const changedFiles = ["scripts/install-git-hooks.sh"];

  assert.deepEqual(getRequiredDurableDocs(changedFiles), [
    "docs/GOLDEN_RULES.md",
    "docs/PROJECT_OPERATIONS.md"
  ]);
});

test("repo-level workflow changes also require ARCHITECTURE updates", () => {
  const changedFiles = [".github/hooks/pre-commit"];

  assert.deepEqual(getRequiredDurableDocs(changedFiles), [
    "docs/ARCHITECTURE.md",
    "docs/GOLDEN_RULES.md",
    "docs/PROJECT_OPERATIONS.md",
    "docs/QUALITY.md"
  ]);
});

test("skill changes require workflow durable docs", () => {
  const changedFiles = [".github/skills/doc-update-routing/SKILL.md"];

  assert.deepEqual(getRequiredDurableDocs(changedFiles), [
    "docs/GOLDEN_RULES.md",
    "docs/PROJECT_OPERATIONS.md"
  ]);
});

test("missing required durable docs are reported from a staged diff", () => {
  const changedFiles = [
    "scripts/install-git-hooks.sh",
    "scripts/check-doc-updates.js",
    "docs/PROJECT_OPERATIONS.md"
  ];

  assert.deepEqual(findMissingDurableDocs(changedFiles), [
    "docs/GOLDEN_RULES.md",
    "docs/QUALITY.md"
  ]);
});

test("durable-doc-only changes do not require extra updates", () => {
  const changedFiles = [
    "docs/PROJECT_OPERATIONS.md",
    "docs/GOLDEN_RULES.md"
  ];

  assert.deepEqual(getRequiredDurableDocs(changedFiles), []);
  assert.deepEqual(findMissingDurableDocs(changedFiles), []);
});

test("repository-specific config can map application code to frontend and backend docs", () => {
  const config = {
    durableDocPatterns: [
      /^docs\/(?:ARCHITECTURE|BACKEND|FRONTEND|GOLDEN_RULES|PLAN|PROJECT_OPERATIONS|QUALITY|CODE_QUALITY)\.md$/
    ],
    routes: [
      {
        pattern: /^apps\/web\//,
        requiredDocs: ["docs/FRONTEND.md"]
      },
      {
        pattern: /^apps\/api\//,
        requiredDocs: ["docs/BACKEND.md"]
      }
    ]
  };

  assert.deepEqual(getRequiredDurableDocs(["apps/web/src/App.tsx"], config), [
    "docs/FRONTEND.md"
  ]);
  assert.deepEqual(findMissingDurableDocs(["apps/api/src/server.ts"], config), [
    "docs/BACKEND.md"
  ]);
});

test("ARCHITECTURE.md contains a Directory Classification section", () => {
  const architecturePath = path.join(__dirname, "../docs/ARCHITECTURE.md");
  const content = fs.readFileSync(architecturePath, "utf8");

  assert.ok(
    content.includes("## Directory Classification"),
    "docs/ARCHITECTURE.md must contain a '## Directory Classification' section"
  );
});

test("code-type-routing skill file exists", () => {
  const skillPath = path.join(
    __dirname,
    "../.github/skills/code-type-routing/SKILL.md"
  );

  assert.ok(
    fs.existsSync(skillPath),
    ".github/skills/code-type-routing/SKILL.md must exist"
  );
});

test("execution-planning skill references code-type-routing", () => {
  const skillPath = path.join(
    __dirname,
    "../.github/skills/execution-planning/SKILL.md"
  );
  const content = fs.readFileSync(skillPath, "utf8");

  assert.ok(
    content.includes("code-type-routing"),
    ".github/skills/execution-planning/SKILL.md must reference code-type-routing"
  );
});

test("doc-update-routing skill contains code-type skill sync check", () => {
  const skillPath = path.join(
    __dirname,
    "../.github/skills/doc-update-routing/SKILL.md"
  );
  const content = fs.readFileSync(skillPath, "utf8");

  assert.ok(
    content.includes("code-type"),
    ".github/skills/doc-update-routing/SKILL.md must contain a code-type skill sync check"
  );
});

test("AGENTS.md registers the code-type-routing skill", () => {
  const agentsPath = path.join(__dirname, "../AGENTS.md");
  const content = fs.readFileSync(agentsPath, "utf8");

  assert.ok(
    content.includes("code-type-routing"),
    "AGENTS.md must list code-type-routing in Available Skills"
  );
});

test("GOLDEN_RULES.md contains a code-type skill loading rule", () => {
  const rulesPath = path.join(__dirname, "../docs/GOLDEN_RULES.md");
  const content = fs.readFileSync(rulesPath, "utf8");

  assert.ok(
    content.includes("code-type"),
    "docs/GOLDEN_RULES.md must contain a rule about loading code-type skills before writing code"
  );
});

test("code-type-routing skill changes require workflow durable docs", () => {
  const changedFiles = [".github/skills/code-type-routing/SKILL.md"];

  assert.deepEqual(getRequiredDurableDocs(changedFiles), [
    "docs/GOLDEN_RULES.md",
    "docs/PROJECT_OPERATIONS.md"
  ]);
});

test("loadConfig rejects config without a routes array", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "doc-update-config-"));
  const configPath = path.join(tempDir, "invalid.config.js");

  try {
    fs.writeFileSync(configPath, "module.exports = { durableDocPatterns: [] };\n");

    assert.throws(
      () => loadConfig(configPath),
      /Doc update config must export a routes array/
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});