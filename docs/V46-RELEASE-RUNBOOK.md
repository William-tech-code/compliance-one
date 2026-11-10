# Compliance One — V46 unified staging release checklist

## Preconditions (must pass before deploying)
1. Render service `srv-dbp5tu5bedkc73fpg3d0`, branch `release/compliance-one-render-hardening`, auto-deploy OFF.
2. Attach a **persistent disk** at `/var/data` (1 GB or higher); confirm the mount in Render dashboard.
3. Set `NODE_ENV=production` and `DATABASE_PATH=/var/data/compliance-one.sqlite`.
4. Set a randomly generated, persistent `JWT_SECRET` of at least 32 characters; never commit it.
5. Set a separate strong `BOOTSTRAP_SECRET`, restrict access, and rotate/disable bootstrap after initial setup.
6. Optional `OPENAI_API_KEY` for generative AI; without it the endpoint returns `AI_NOT_CONFIGURED`. Optional `OPENAI_MODEL`; default `gpt-4.1-mini`.
7. Optional `REGULATORY_MONITOR_ENABLED=true` to attempt daily official-source content checks. Checks may fail when government sites block automated requests; this does not prove legal currency.
8. Set production `CORS_ORIGIN` only if cross-origin clients are required.

## Gates
- GitHub Actions release-checks green on the exact commit.
- `npm ci && npm run build` and `node --check server/index.js` pass.
- Deploy manually only after disk and secrets exist.
- Confirm `GET /api/health` returns HTTP 200, authenticated API reads/writes work, and database survives a restart.
- Test version history and recovery; tenant isolation; revoked users; access control; AI without/with API key; regulatory monitor with failed/unreachable sources.
- Take and verify an off-instance SQLite backup (including WAL-consistent snapshot), and rehearse recovery.
- Conduct independent security review of authorization, evidence lifecycle, malware screening, encryption at rest, retention, legal-review workflows and backup recovery before onboarding real customers.

## Boundaries
- Original evidence files are now stored in the tenant-scoped directory under `/var/data/evidence` (or configured `EVIDENCE_STORAGE_PATH`), with authenticated retrieval and SHA-256. Validate upload/download, retention, backups, malware scanning and at-rest encryption before onboarding real customers.
- Regulatory monitor detects changes to downloaded source bytes, not legal validity or applicability. Human review remains mandatory.
- Generative AI is optional and not a substitute for legal advice. The endpoint transmits only an allowlisted operational summary and user question.
- Do not disable the persistent-disk startup check. Do not claim deployment complete while disk is absent.
