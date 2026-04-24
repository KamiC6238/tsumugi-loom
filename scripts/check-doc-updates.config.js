module.exports = {
  durableDocPatterns: [
    /^docs\/(?:ARCHITECTURE|BACKEND|FRONTEND|GOLDEN_RULES|PLAN|PROJECT_OPERATIONS|QUALITY|CODE_QUALITY)\.md$/
  ],
  routes: [
    {
      pattern: /^\.github\/hooks\/pre-commit$/,
      requiredDocs: [
        "docs/ARCHITECTURE.md",
        "docs/GOLDEN_RULES.md",
        "docs/PROJECT_OPERATIONS.md",
        "docs/QUALITY.md"
      ]
    },
    {
      pattern: /^scripts\/check-doc-updates\.js$/,
      requiredDocs: [
        "docs/GOLDEN_RULES.md",
        "docs/PROJECT_OPERATIONS.md",
        "docs/QUALITY.md"
      ]
    },
    {
      pattern: /^scripts\/check-doc-updates\.config\.js$/,
      requiredDocs: [
        "docs/ARCHITECTURE.md",
        "docs/GOLDEN_RULES.md",
        "docs/PROJECT_OPERATIONS.md",
        "docs/QUALITY.md"
      ]
    },
    {
      pattern: /^scripts\/(?:check-docs-freshness|check-docs-consistency|migrate-completed-plans)\.js$/,
      requiredDocs: [
        "docs/GOLDEN_RULES.md",
        "docs/PROJECT_OPERATIONS.md",
        "docs/QUALITY.md"
      ]
    },
    {
      pattern: /^scripts\/install-git-hooks\.sh$/,
      requiredDocs: [
        "docs/GOLDEN_RULES.md",
        "docs/PROJECT_OPERATIONS.md"
      ]
    },
    {
      pattern: /^\.github\/skills\/.+\/SKILL\.md$/,
      requiredDocs: [
        "docs/GOLDEN_RULES.md",
        "docs/PROJECT_OPERATIONS.md"
      ]
    }
  ]
};