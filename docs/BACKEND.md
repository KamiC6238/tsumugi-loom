# Backend Conventions

Use this file to document backend-specific boundaries once the template is adopted.

## Fill In

- Runtime and framework.
- Service entry points.
- Module boundaries.
- Data access patterns.
- Error handling conventions.
- Test command and test layout.
- Matching backend code paths in `scripts/check-doc-updates.config.js` that require updates to this document.

## Suggested Sections

## Runtime

Describe the language, framework, and deployment model.

## Entry Points

List API servers, workers, cron jobs, or queues.

## Boundaries

Document where domain logic lives and where adapters live.

## Validation

Document how request parsing, schema validation, and error shaping work.

## Testing

Record the backend test command, fixtures, and integration-test rules.