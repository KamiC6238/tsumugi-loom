#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ACTIVE_DIR = path.join(ROOT, "docs/exec-plans/active");
const COMPLETED_DIR = path.join(ROOT, "docs/exec-plans/completed");
const isCheckMode = process.argv.includes("--check");
const isDryRun = process.argv.includes("--dry-run");

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
  await fs.mkdir(COMPLETED_DIR, { recursive: true });

  const entries = await fs.readdir(ACTIVE_DIR);
  const plansToMove = [];

  for (const entry of entries) {
    if (!entry.endsWith(".md") || entry === "README.md") {
      continue;
    }

    const sourcePath = path.join(ACTIVE_DIR, entry);
    const content = await fs.readFile(sourcePath, "utf8");
    const progressItems = getProgressItems(content);

    if (progressItems.length > 0 && progressItems.every((item) => item.startsWith("- [x]"))) {
      plansToMove.push(entry);
    }
  }

  if (plansToMove.length === 0) {
    console.log("No completed plans found in active/.");
    return;
  }

  if (isCheckMode) {
    console.error("Completed plans still exist in active/:");
    for (const fileName of plansToMove) {
      console.error(`- ${fileName}`);
    }
    process.exit(1);
  }

  if (isDryRun) {
    console.log("Plans that would be moved:");
    for (const fileName of plansToMove) {
      console.log(`- ${fileName}`);
    }
    return;
  }

  for (const fileName of plansToMove) {
    const sourcePath = path.join(ACTIVE_DIR, fileName);
    const destinationPath = path.join(COMPLETED_DIR, fileName);
    try {
      await fs.access(destinationPath);
      throw new Error(`destination already exists for ${fileName}`);
    } catch (error) {
      if (error.code && error.code !== "ENOENT") {
        throw error;
      }
    }

    await fs.rename(sourcePath, destinationPath);
    console.log(`Moved ${fileName} to docs/exec-plans/completed/.`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});