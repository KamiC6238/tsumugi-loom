#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const DEFAULT_CONFIG_PATH = path.join(__dirname, "check-doc-updates.config.js");
let defaultConfig;

function unique(items) {
  return [...new Set(items)];
}

function isPattern(value) {
  return Boolean(value) && typeof value.test === "function";
}

function validateConfig(loadedConfig, configPath) {
  if (!loadedConfig || typeof loadedConfig !== "object") {
    throw new Error("Doc update config must export an object.");
  }

  if (!Array.isArray(loadedConfig.durableDocPatterns)) {
    throw new Error("Doc update config must export a durableDocPatterns array.");
  }

  if (!Array.isArray(loadedConfig.routes)) {
    throw new Error("Doc update config must export a routes array.");
  }

  for (const [index, pattern] of loadedConfig.durableDocPatterns.entries()) {
    if (!isPattern(pattern)) {
      throw new Error(`Doc update config has an invalid durableDocPatterns entry at index ${index} in ${configPath}.`);
    }
  }

  for (const [index, route] of loadedConfig.routes.entries()) {
    if (!route || typeof route !== "object") {
      throw new Error(`Doc update config has an invalid route entry at index ${index} in ${configPath}.`);
    }

    if (!isPattern(route.pattern)) {
      throw new Error(`Doc update config route ${index} must define a RegExp pattern in ${configPath}.`);
    }

    if (!Array.isArray(route.requiredDocs)) {
      throw new Error(`Doc update config route ${index} must define a requiredDocs array in ${configPath}.`);
    }

    for (const [docIndex, docPath] of route.requiredDocs.entries()) {
      if (typeof docPath !== "string" || docPath.length === 0) {
        throw new Error(`Doc update config route ${index} has an invalid requiredDocs entry at index ${docIndex} in ${configPath}.`);
      }
    }
  }
}

function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  delete require.cache[require.resolve(configPath)];
  const loadedConfig = require(configPath);

  validateConfig(loadedConfig, configPath);

  return {
    durableDocPatterns: loadedConfig.durableDocPatterns,
    routes: loadedConfig.routes
  };
}

function getDefaultConfig() {
  if (!defaultConfig) {
    defaultConfig = loadConfig(DEFAULT_CONFIG_PATH);
  }

  return defaultConfig;
}

function isDurableDoc(filePath, config = getDefaultConfig()) {
  return config.durableDocPatterns.some((pattern) => pattern.test(filePath));
}

function getRequiredDocMatches(changedFiles, config = getDefaultConfig()) {
  const matches = new Map();

  for (const filePath of changedFiles) {
    if (isDurableDoc(filePath, config)) {
      continue;
    }

    for (const route of config.routes) {
      if (route.pattern.test(filePath)) {
        for (const docPath of route.requiredDocs) {
          if (!matches.has(docPath)) {
            matches.set(docPath, []);
          }

          matches.get(docPath).push(filePath);
        }
      }
    }
  }

  return Array.from(matches.entries()).reduce((result, [docPath, filePaths]) => {
    result[docPath] = unique(filePaths);
    return result;
  }, {});
}

function getRequiredDurableDocs(changedFiles, config = getDefaultConfig()) {
  return Object.keys(getRequiredDocMatches(changedFiles, config));
}

function findMissingDurableDocs(changedFiles, config = getDefaultConfig()) {
  const stagedFiles = new Set(changedFiles);
  return getRequiredDurableDocs(changedFiles, config).filter((docPath) => !stagedFiles.has(docPath));
}

function getStagedFiles() {
  const output = execFileSync(
    "git",
    ["diff", "--name-only", "--cached", "--diff-filter=ACMRD"],
    { encoding: "utf8" }
  );

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function main() {
  const stagedFiles = getStagedFiles();
  const config = getDefaultConfig();
  const matches = getRequiredDocMatches(stagedFiles, config);
  const missingDocs = Object.keys(matches).filter((docPath) => !stagedFiles.includes(docPath));

  if (missingDocs.length === 0) {
    console.log("Durable doc sync check passed.");
    return;
  }

  console.error("Durable doc sync check failed. The staged diff requires updates to:");
  for (const docPath of missingDocs) {
    console.error(`- ${docPath}`);
    console.error(`  Triggered by: ${matches[docPath].join(", ")}`);
  }
  console.error("");
  console.error("Inspect .github/skills/doc-update-routing/SKILL.md, update the required durable docs, stage them, and retry the commit.");
  process.exit(1);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  findMissingDurableDocs,
  getDefaultConfig,
  getRequiredDocMatches,
  getRequiredDurableDocs,
  isDurableDoc,
  loadConfig,
  validateConfig
};