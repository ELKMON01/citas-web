# S4 baseline and approval checkpoint

Date: 2026-09-25
Scope source: `plams5.md`

## Repository state preserved

Both repositories were clean before work began. Local `develop` branches were created from the existing stable `main` heads. Implementation and documentation changes now exist as uncommitted work on those branches; no changes were made on `main`.

| Repository | `main` at checkpoint | Initial state | Working branch |
|---|---|---|---|
| `citas-api` | `8e3d153` (`S4`) | clean | `develop` from `8e3d153` |
| `citas-web` | `11cdedf` (`S4`) | clean | `develop` from `11cdedf` |

No remote `develop` branch was present. No historical S2/S3 commits or evidence were fabricated.

Versioned hooks are installed; each repository's local `core.hooksPath` is `.githooks`. A shell quoting error found during the first validation was corrected in both hooks. Subsequent synthetic secret probes were rejected by both hooks with exit 1 before tests ran. PASS evidence is pending implementation completion.

## Specification checkpoint

The requested cut in `plams5.md` is HU-025/026, HU-027/028, HU-029/030, HU-032, and the corresponding HU-033 client scope. The selected lifecycle HU were approved for S4 on 2026-09-25 and their frontmatter records that approval; HU-033 remains in progress. DoD remains open until backend and runtime evidence can be executed.

Existing REST decisions cover authentication and S3 scheduling only. No lifecycle REST routes have been approved. `HU-030` explicitly leaves “pasada/aplicable” unresolved. `HU-032` explicitly leaves ADMIN read access unresolved. These gaps block implementation and changing either consumer contract.

## Approved lifecycle contract

The user approved this contract on 2026-09-25. All routes use `/api/v1`, JSON, the authenticated access JWT, and the existing error mapping (`400` invalid input, `401` invalid session, `403` role/ownership denial, `404` missing resource, `409` invalid transition or slot conflict). Times use the already documented `America/Bogota` convention. HU-030 eligibility is an `APPROVED` appointment whose scheduled end has passed. HU-032 allows USER owner, assigned PROFESSIONAL, and ADMIN globally.

| Operation | Proposed route | Access |
|---|---|---|
| List own appointments with `status`, `from`, `to` filters | `GET /user/appointments` | USER |
| Read own appointment | `GET /user/appointments/{id}` | USER |
| Cancel own eligible appointment | `POST /user/appointments/{id}/cancellation` | USER |
| Request rescheduling | `POST /user/appointments/{id}/rescheduling-requests` | USER |
| List pending rescheduling requests, filterable by location/professional/specialty/date | `GET /admin/rescheduling-requests` | ADMIN |
| Decide a rescheduling request with `APPROVE`/`REJECT` and optional/required reason as specified by HU | `POST /admin/rescheduling-requests/{id}/decision` | ADMIN |
| List own approved appointments by period and location | `GET /professional/appointments?from=&to=&locationId=` | PROFESSIONAL |
| Close own applicable appointment as `COMPLETED` or `NO_SHOW` | `PATCH /professional/appointments/{id}/status` | PROFESSIONAL |
| Read status history for an appointment | `GET /appointments/{id}/status-history` | USER owner, PROFESSIONAL assigned, ADMIN global |

Response fields are limited to the HU/PRD minimum: appointment id, location `{id,name}`, professional `{id,displayName}`, specialty `{id,name}`, date, start/end time, duration, status, rejection reason when present; request id/status/reason/timestamps for rescheduling; and history status, actor, source, timestamp, and reason. Professional agenda responses expose no patient personal data.

## Cross-repository change plan after approval

- `citas-api`: new Flyway migration after V2; lifecycle application/service and persistence adapters; REST controller/DTOs; authorization; integration and REST tests; lifecycle contract documentation.
- `citas-web`: lifecycle types and direct REST client methods; USER appointment/detail/cancellation/rescheduling flows; PROFESSIONAL agenda/close flows; history view; role-aware navigation and tests.
- Compatibility: additive routes under `/api/v1`; existing auth and S3 scheduling routes remain unchanged. Migration preserves existing appointments and status history, with pending rescheduling retaining new slots separately until decision.
- Validation: focused persistence/concurrency/authorization tests, full Maven suite, frontend tests/lint/build, then role-by-role cross-repo verification. No HU DoD is marked complete without recorded results.

## Approved decisions

The user approved the selected HU scope, HU-030 eligibility, HU-032 read permissions, and the route names, filters, and response fields above. The formal contract is recorded in `citas-api/docs/FCV Dev/llm-wiki/wiki/contracts.md`.

## Implementation and verification status (2026-09-25)

- API: lifecycle controller/service, V3 migration, history/audit, rescheduling slot retention, role checks, and integration/concurrency test cases are implemented on `develop`. API `git diff --check` and Docker Compose Maven compile pass; `IdentityTest,AuthRequestGuardTest` pass (4 tests). The independent backend reviewer gives a static PASS. New lifecycle/Testcontainers cases and full Maven suite remain **BLOCKED** because Testcontainers cannot reach Docker Engine from the Maven container.
- Web: role-based lifecycle screens and direct REST client are implemented. `npm test` PASS (25/25), `npm run lint` PASS, and `npm run build` PASS. Independent frontend review PASS for client scope; server authorization/persistence and visual fidelity remain unverified.
- Cross-repo: no live API/MySQL manual flow was run; runtime contract verification is **BLOCKED**.
- Hooks: synthetic fake-secret probes were rejected by both pre-commit hooks (FAIL-path verified). Frontend `git hook run pre-commit` passed with temporary staging and the index was restored. API pre-commit PASS was not possible because its Maven suite could not run; no hook-bypassing commit was made.
- Neither repository has a commit for this increment yet. The frontend commit attempt was stopped because Git author identity is not configured; no other identity was assumed. No DoD is marked complete. See `citas-api/docs/FCV Dev/evidence/S4/` for loop and test evidence.
