# Contributing to Latch Mobile

## Workflow

1. Open or link a GitHub issue before starting non-trivial work.
2. Create a branch from `master`.
3. Keep each branch focused on one issue or one tightly related slice of work.
4. Open a draft PR early if the change will take more than a small session.
5. Move the PR out of draft only after local validation is complete.

## Branch naming

Use a short, descriptive branch name:

- `feat/import-wallet`
- `fix/biometric-unlock`
- `chore/ci-setup`

## Pull requests

Every PR should:

- explain the user-visible impact
- link the related issue
- include testing notes
- call out any security, auth, wallet, or storage risk

Prefer squash merges to keep history easy to scan.

## Review expectations

- At least one approval is required before merge
- Changes touching wallet, auth, secure storage, signing, or secrets should get extra review
- Do not merge failing CI

## Security expectations

- Never commit mnemonics, private keys, seed phrases, tokens, API secrets, or signing artifacts
- Use `expo-secure-store` for sensitive client-side values
- Treat wallet and auth regressions as high-risk changes
- Report vulnerabilities privately using the repository security policy

## Local commands

```bash
bun install
bun start
bun run ios
bun run android
bun run web
bun run lint
```
