# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| `0.2.x` (`main`) | Yes — current development line |
| Older tags / forks | Best-effort only |

---

## Reporting a Vulnerability

**Do not** open a public GitHub issue for security vulnerabilities.

Report privately to:

- **Email:** [contact@arnobmahmud.com](mailto:contact@arnobmahmud.com)
- **Portfolio:** [https://www.arnobmahmud.com](https://www.arnobmahmud.com)

Please include:

1. Description of the issue and impact
2. Steps to reproduce (or a minimal proof of concept)
3. Affected URL / route / component if known
4. Your preferred contact for follow-up

You should receive an acknowledgment within a few business days. Give us reasonable time to investigate and patch before any public disclosure.

---

## Sensitive Areas in This Project

Treat these as high-risk if exposed:

- Auth secrets: `AUTH_SECRET`, session cookies, password hashes (`lib/auth/password.ts` — scrypt with legacy upgrade)
- Admin destructive ops: `ADMIN_DELETE_SECRET`, hard-delete book flows
- Database: `DATABASE_URL`, `TEST_DATABASE_URL` (never use production for integration tests)
- Media: `IMAGEKIT_PRIVATE_KEY`
- Rate limiting: Upstash Redis REST tokens
- Email / cron: Brevo / Resend keys, `CRON_SECRET` (reservation outbox recovery)
- Workflows: `QSTASH_TOKEN` when `ENABLE_WORKFLOWS=true`

Never commit real `.env` values. Prefer rotating any secret that may have leaked into logs, chat, or git history.

---

## Responsible Use

This is an open educational / demo library platform. Do not use it to store real student PII in a shared or public deployment without proper institutional security review, access control, and data-retention policies.
