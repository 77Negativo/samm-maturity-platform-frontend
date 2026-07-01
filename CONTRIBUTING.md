# Contributing

Thanks for contributing to `samm-maturity-platform-frontend`.

## Before you start

- Open an issue or discussion describing the change.
- Keep the change focused on one problem.
- Do not commit secrets, tokens, `.env` files, or editor artifacts.

## Local workflow

1. Install dependencies:

```bash
npm install
```

2. Run a build before opening a pull request:

```bash
npm run build
```

3. If the change affects runtime behavior, validate the Docker flow:

```bash
docker compose up -d --build
```

## Code style

- Keep HTTP access centralized in `src/api.js`.
- Do not move business rules from the backend into the frontend.
- Prefer small, reviewable commits.
- Update documentation when routes, flows, or runtime behavior change.

## Pull request checklist

- Explain what changed and why.
- Include screenshots for UI changes when relevant.
- Mention any backend contract impact.
- Confirm that the build succeeds.

