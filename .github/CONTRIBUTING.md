# Contributing

Thanks for contributing to Chrome Extension Scout.

## Quick Start

1. Fork the repository and create a feature branch.
2. Install dependencies:
   - `yarn install`
3. Configure environment:
   - Copy `.env.example` to `.env`
   - Fill required `PG_*` variables
4. Run checks:
   - `yarn lint`
   - `yarn build`
5. Open a Pull Request using the PR template.

## Development Rules

- Keep changes focused and scoped to one concern per PR.
- Prefer existing `shadcn` components before creating custom UI components.
- Keep all user-facing strings in locale JSON files (`src/locales/*.json`).
- Do not hardcode limits and tuning values inline; use named constants.
- Preserve current database schema compatibility.

## Commit Style

Use Conventional Commits, for example:

- `feat(opportunities): add extension name filter`
- `fix(home): prevent theme hydration mismatch`

## Pull Request Checklist

- `yarn lint` passes
- `yarn build` passes
- RU/EN translations are updated if UI text changed
- README/docs are updated if behavior changed
- Screenshots added for visible UI changes

## Reporting Bugs

Please use the Bug Report issue template and include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, browser, Node version)
- Screenshots/logs when relevant
