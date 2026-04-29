---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", "UX design guidelines", or "check my site against best practices".
argument-hint: <file-or-pattern>
metadata:
  author: vercel
  version: "1.0.0"
  source: https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Fetch the latest guidelines from the source URL below.
2. Read the specified files or ask the user for files/patterns.
3. Check against all rules in the fetched guidelines.
4. Output findings grouped by file with concise line-based findings.

## Guidelines Source

Fetch fresh guidelines before each review:

```text
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use available web-fetch tooling to retrieve the latest rules. The fetched content contains the rules and output format instructions.

## Usage

When a user provides a file or pattern argument:

1. Fetch guidelines from the source URL above.
2. Read the specified files.
3. Apply all rules from the fetched guidelines.
4. Output findings using the format specified in the guidelines.

If no files are specified, ask the user which files to review.

## Project Notes

- This skill is installed as a project skill so the Skills panel can surface it alongside implementation skills.
- Use it for UI/UX review passes, accessibility checks, visual polish reviews, and design-system consistency checks.