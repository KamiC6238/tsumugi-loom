# Test-Driven Development Reference

Every implementation step in an execution plan must show these three phases.

## Red

- Write or extend a focused test.
- Run the narrowest relevant test command.
- Observe the expected failure.

## Green

- Implement the smallest change that satisfies the failing test.
- Re-run the same narrow test command.
- Confirm the test is now green.

## Refactor

- Improve naming, structure, duplication, or cohesion without changing behavior.
- Re-run the same test command.
- Confirm the test stays green.

## Notes

- Prefer the narrowest possible test for each step.
- If broader verification is needed, run it after the targeted red and green cycle succeeds.
- Record important findings in the plan's `Notes` section.