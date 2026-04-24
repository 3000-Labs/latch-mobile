# Security Policy

## Supported Versions

Security fixes should target the latest active branch unless the team explicitly decides otherwise.

## Reporting a Vulnerability

Please do not open public GitHub issues for security vulnerabilities.

Use GitHub's private vulnerability reporting flow for this repository:

- Go to the repository's `Security` tab
- Open `Advisories`
- Create a private vulnerability report

If private vulnerability reporting is not enabled yet, a repository admin should enable it before launch.

## Sensitive Data Rules

Never include any of the following in issues, pull requests, screenshots, logs, or commits:

- recovery phrases or mnemonics
- private keys or seed material
- access tokens or refresh tokens
- API secrets
- signing payloads that should remain private

## Response Expectations

Security issues should be triaged before routine feature work, especially when they affect:

- wallet generation or recovery
- local secret storage
- authentication and biometrics
- transaction signing
- dependency supply chain risk
