## Context Engineering (Main Agent Discipline)

The main agent is the primary worker and may implement changes directly.

**Main agent role:** Coordinate files, implement code changes, run builds/tests,
and communicate with the user.

**Main agent MAY:** Explore the codebase, modify files, run commands, and handle
command output as needed for the task.

## Frontend Scope

This repository is the source of truth for:

- React SPA
- page flow and components
- API consumption through `src/api.js`
- nginx reverse proxy for `/api`
- frontend build and container image

Cross-repository rules:

- Do not add backend business logic here
- Do not duplicate server-side validation here as source of truth
- If the API contract changes, update this repository together with `~/GitHub/77Negativo/samm-maturity-platform-backend`

## Policy Alignment

The agent must follow the local `POLICY.md` in this repository.

Important inherited rules from the original workspace:

- business truth remains in PostgreSQL through the backend
- no dead code or compatibility leftovers
- minimum necessary code hygiene
- HTTP access centralized in `src/api.js`
- no final score calculation in the frontend
- no permission decisions outside backend authority
- preserve `/api` proxy behavior for cookie and CSRF flow

## Rebuild Rule

When changes affect the running system, a rebuild is mandatory. Use:

`docker compose up -d --build`
