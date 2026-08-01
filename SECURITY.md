# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| `0.2.x` (main) | Yes |
| Older releases | Best-effort only |

---

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately to:

- **Email:** [contact@arnobmahmud.com](mailto:contact@arnobmahmud.com)
- **Portfolio:** [https://www.arnobmahmud.com](https://www.arnobmahmud.com)

Include as much detail as you can:

1. Description of the issue and impact
2. Steps to reproduce (or proof of concept)
3. Affected URL / route / component if known
4. Your contact details for follow-up

You should receive an acknowledgment within a few business days. Please give us reasonable time to investigate and patch before any public disclosure.

---

## Scope Notes

This project handles authentication, role-based access, file uploads, and personal/university identifiers. Treat production credentials, `ADMIN_DELETE_SECRET`, database dumps, and private ImageKit/Redis/email keys as sensitive. Never commit real `.env` values.
