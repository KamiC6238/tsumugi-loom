#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PLAN_DIRS = [
  "docs/exec-plans/active",
  "docs/exec-plans/completed"
];
const REQUIRED_SECTIONS = [
  "Goal",
  "Branch",
  "Context",
  "Scope",
  "Steps",
  "Decisions",
  "Progress",
  "Notes",
  "Validation"
];
const BRANCH_PATTERN = /^(feat|fix|docs|chore|refactor|test)\/[a-z0-9._-]+$/;
const PLAN_NAME_PATTERN = /^[A-Z][A-Za-z0-9]*(?:_[A-Z][A-Za-z0-9]*)*\.md$/;

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

function extractStepChunks(content) {
  const stepsSection = extractSection(content, "Steps");
  const chunks = stepsSection.split(/\n###\s+/).slice(1);
  return chunks;
}

function getProgressItems(content) {
  const progressSection = extractSection(content, "Progress");
  return progressSection.match(/^- \[(?: |x)\] .+$/gim) || [];
}

async function listPlanFiles(dir) {
  const entries = await fs.readdir(path.join(ROOT, dir));
  return entries
    .filter((entry) => entry.endsWith(".md") && entry !== "README.md")
    .map((entry) => path.posix.join(dir, entry));
}

async function main() {
  const errors = [];
  const allPlanFiles = [];
  const branchOwners = new Map();

  for (const dir of PLAN_DIRS) {
    try {
      const files = await listPlanFiles(dir);
      allPlanFiles.push(...files);
    } catch {
      errors.push(`${dir}: unable to read plan directory`);
    }
  }

  for (const relPath of allPlanFiles) {
    const fileName = path.posix.basename(relPath);
    const content = await fs.readFile(path.join(ROOT, relPath), "utf8");

    if (!PLAN_NAME_PATTERN.test(fileName)) {
      errors.push(`${relPath}: file name must use PascalCase with underscores`);
    }

    for (const section of REQUIRED_SECTIONS) {
      if (!extractSection(content, section)) {
        errors.push(`${relPath}: missing required section ## ${section}`);
      }
    }

    const branchValue = extractSection(content, "Branch")
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean);

    if (!branchValue) {
      errors.push(`${relPath}: branch section must contain a branch name`);
    } else {
      if (!BRANCH_PATTERN.test(branchValue)) {
        errors.push(`${relPath}: branch name must match feat/*, fix/*, docs/*, chore/*, refactor/*, or test/*`);
      }

      if (branchOwners.has(branchValue)) {
        errors.push(`${relPath}: branch ${branchValue} is already used by ${branchOwners.get(branchValue)}`);
      } else {
        branchOwners.set(branchValue, relPath);
      }
    }

    const stepChunks = extractStepChunks(content);
    if (stepChunks.length === 0) {
      errors.push(`${relPath}: steps section must contain at least one ### Step subsection`);
    }

    for (const chunk of stepChunks) {
      if (!/\nRed:\s*/.test(`\n${chunk}`)) {
        errors.push(`${relPath}: each step must contain a Red: phase`);
      }
      if (!/\nGreen:\s*/.test(`\n${chunk}`)) {
        errors.push(`${relPath}: each step must contain a Green: phase`);
      }
      if (!/\nRefactor:\s*/.test(`\n${chunk}`)) {
        errors.push(`${relPath}: each step must contain a Refactor: phase`);
      }
    }

    const progressItems = getProgressItems(content);
    if (progressItems.length === 0) {
      errors.push(`${relPath}: progress section must contain checklist items`);
    }

    if (stepChunks.length > 0 && progressItems.length > 0 && stepChunks.length !== progressItems.length) {
      errors.push(`${relPath}: number of progress items must match the number of steps`);
    }

    if (relPath.startsWith("docs/exec-plans/completed/") && progressItems.some((item) => item.startsWith("- [ ]"))) {
      errors.push(`${relPath}: completed plans cannot contain incomplete progress items`);
    }
  }

  if (errors.length > 0) {
    console.error("Documentation consistency check failed:\n");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Documentation consistency check passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});