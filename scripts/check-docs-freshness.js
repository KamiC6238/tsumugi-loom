#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const REQUIRED_FILES = [
  "README.md",
  "AGENTS.md",
  "docs/ARCHITECTURE.md",
  "docs/BACKEND.md",
  "docs/FRONTEND.md",
  "docs/PLAN.md",
  "docs/GOLDEN_RULES.md",
  "docs/QUALITY.md",
  "docs/CODE_QUALITY.md",
  "docs/PROJECT_OPERATIONS.md",
  "docs/references/README.md",
  "docs/references/TDD.md",
  "docs/exec-plans/active/README.md",
  "docs/exec-plans/completed/README.md",
  "scripts/check-doc-updates.js",
  "scripts/check-doc-updates.config.js",
  "scripts/check-docs-freshness.js",
  "scripts/check-docs-consistency.js",
  "scripts/migrate-completed-plans.js",
  "scripts/install-git-hooks.sh",
  ".github/hooks/pre-commit"
];
const LINK_CHECK_FILES = [
  "README.md",
  "AGENTS.md",
  "docs/ARCHITECTURE.md",
  "docs/PLAN.md",
  "docs/PROJECT_OPERATIONS.md",
  "docs/references/README.md",
  "docs/exec-plans/active/README.md"
];
const ACTIVE_DIR = "docs/exec-plans/active";
const COMPLETED_DIR = "docs/exec-plans/completed";

function extractLinks(content) {
  const links = [];
  const pattern = /\[[^\]]+\]\(([^)]+)\)/g;
  let match = pattern.exec(content);
  while (match) {
    links.push(match[1]);
    match = pattern.exec(content);
  }
  return links;
}

async function exists(relPath) {
  try {
    await fs.access(path.join(ROOT, relPath));
    return true;
  } catch {
    return false;
  }
}

function extractSection(content, heading) {
  const marker = `## ${heading}`;
  const start = content.indexOf(marker);
  if (start === -1) {
    return "";
  }

  const remaining = content.slice(start + marker.length);
  const nextIndex = remaining.search(/\n##\s+/);
  return nextIndex === -1 ? remaining : remaining.slice(0, nextIndex);
}

function getProgressItems(content) {
  const progressSection = extractSection(content, "Progress");
  return progressSection.match(/^- \[(?: |x)\] .+$/gim) || [];
}

async function main() {
  const errors = [];

  for (const relPath of REQUIRED_FILES) {
    try {
      const stat = await fs.stat(path.join(ROOT, relPath));
      if (stat.size === 0) {
        errors.push(`${relPath}: file exists but is empty`);
      }
    } catch {
      errors.push(`${relPath}: required file is missing`);
    }
  }

  for (const relPath of LINK_CHECK_FILES) {
    const absolutePath = path.join(ROOT, relPath);
    let content;
    try {
      content = await fs.readFile(absolutePath, "utf8");
    } catch {
      continue;
    }

    const baseDir = path.dirname(absolutePath);
    for (const target of extractLinks(content)) {
      if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("mailto:") || target.startsWith("#")) {
        continue;
      }

      const targetPath = target.split("#")[0];
      const resolved = path.resolve(baseDir, targetPath);
      try {
        await fs.access(resolved);
      } catch {
        errors.push(`${relPath}: broken link target ${target}`);
      }
    }
  }

  if (!(await exists(ACTIVE_DIR))) {
    errors.push(`${ACTIVE_DIR}: directory is missing`);
  }

  if (!(await exists(COMPLETED_DIR))) {
    errors.push(`${COMPLETED_DIR}: directory is missing`);
  }

  try {
    const activeEntries = await fs.readdir(path.join(ROOT, ACTIVE_DIR));
    for (const entry of activeEntries) {
      if (!entry.endsWith(".md") || entry === "README.md") {
        continue;
      }

      const content = await fs.readFile(path.join(ROOT, ACTIVE_DIR, entry), "utf8");
      const progressItems = getProgressItems(content);
      if (progressItems.length > 0 && progressItems.every((item) => item.startsWith("- [x]"))) {
        errors.push(`${path.posix.join(ACTIVE_DIR, entry)}: all progress items are complete and the plan should be moved to ${COMPLETED_DIR}`);
      }
    }
  } catch {
    errors.push(`${ACTIVE_DIR}: unable to read directory`);
  }

  if (errors.length > 0) {
    console.error("Documentation freshness check failed:\n");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Documentation freshness check passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});