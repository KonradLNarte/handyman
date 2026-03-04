# [FEEDBACK:gen1-impl] — Resonansia MCP Server Implementation Feedback

Generated during gen1-impl. These markers feed into gen2-spec evolution.

---

## F1: PGlite — No RLS Support

**Severity:** HIGH
**Spec ref:** §4.2 (RLS policies), D-013 (blast radius)

PGlite (PostgreSQL compiled to WASM) does not support Row-Level Security. All tenant isolation is enforced at the application level via `WHERE tenant_id = $X` clauses in every query.

**Impact:**
- D-013 blast-radius safety net (RLS as defense-in-depth) is completely untested
- A bug in application code could leak cross-tenant data
- `SET LOCAL app.current_tenant_id` pattern from spec §4.2 is not applicable

**Recommendation for gen2-spec:**
- Keep RLS as a mandatory requirement for production deployments
- Add a "tenant isolation audit" tool that verifies all queries include tenant_id filtering
- Consider making RLS vs. application-level isolation an explicit deployment profile

---

## F2: No Supabase Auth Integration

**Severity:** MEDIUM
**Spec ref:** §4.1 (JWT structure), D-012 (Supabase Auth flow)

Custom JWT implementation using `jose` library with HS256 symmetric signing. No Supabase Auth integration.

**Impact:**
- D-012 user token flow (Supabase → JWT → MCP) is untested
- No refresh token handling
- No integration with Supabase's `auth.users` table

**Recommendation:**
- Spec should define a clear JWT interface contract that works with both Supabase Auth and custom JWT
- Consider adding a `token_source` claim to distinguish auth methods

---

## F3: btree_gist EXCLUDE Constraint Not Available

**Severity:** MEDIUM
**Spec ref:** §2.1 (nodes table DDL)

PGlite does not support the btree_gist extension. The EXCLUDE constraint that prevents overlapping valid ranges (`tstzrange(valid_from, valid_to) WITH &&`) cannot be enforced at the database level.

**Impact:**
- Non-overlapping bitemporal ranges are only enforced at application level
- A concurrent write bug could create overlapping versions
- Bitemporal queries might return multiple "current" versions

**Recommendation:**
- Add an application-level CHECK before INSERT that verifies no overlap
- Add a periodic integrity check tool that detects overlapping ranges
- Document btree_gist as a hard requirement for production deployments

---

## F4: UUIDv7 Generated in Application Layer

**Severity:** LOW
**Spec ref:** §2.1 (DEFAULT uuid_generate_v7())

UUIDv7 is generated in TypeScript (`crypto.getRandomValues()`) rather than via the PostgreSQL `uuid_generate_v7()` function. The SQL fallback function uses `gen_random_uuid()` as an entropy source because PGlite doesn't have `gen_random_bytes()`.

**Impact:**
- UUIDs are always generated before INSERT, not by DEFAULT
- Ordering guarantees depend on JavaScript's `Date.now()` precision (ms)
- SQL function fallback is less random than spec intended

**Recommendation:**
- This is acceptable for gen1. Spec should note that UUIDv7 generation is implementation-dependent.

---

## F5: Embedding Queue is In-Memory

**Severity:** MEDIUM
**Spec ref:** §3.2 (async embedding), D-008 (bulk strategy)

The embedding queue is an in-memory array. If the server restarts, pending embeddings are lost.

**Impact:**
- D-008 bulk embedding strategy is untested under load
- Server restart = some entities may permanently lack embeddings
- No retry logic for failed embedding API calls

**Recommendation:**
- Gen2 should specify a durable queue (e.g., events table + `embedding_status` column)
- Consider a periodic "re-embed orphans" job

---

## F6: SET LOCAL Pattern Not Applicable

**Severity:** LOW
**Spec ref:** §4.2 (D-013 Scenario C)

PGlite doesn't support `SET LOCAL` for GUC variables. The `app.current_tenant_id` pattern described in D-013 cannot be tested.

**Impact:**
- D-013 Scenario C (SET LOCAL + RLS) is completely untestable in PGlite

---

## F7: Local Filesystem Blob Storage

**Severity:** LOW
**Spec ref:** §2.1 (blobs table), D-018 (external storage)

Blobs are stored on local filesystem (`./data/blobs/`) rather than external object storage (S3, Supabase Storage).

**Impact:**
- D-018 external storage integration is untested
- Not suitable for production (no replication, no CDN)
- File path stored as `storage_ref` works locally but won't work in distributed deployment

**Recommendation:**
- Blob storage adapter should be an interface with local/S3/Supabase implementations
- Spec should define the storage_ref format for each adapter

---

## F8: PGlite Performance Not Representative

**Severity:** LOW
**Spec ref:** D-016 (latency requirements)

PGlite runs in-process as WASM. Performance characteristics differ significantly from PostgreSQL on Supabase.

**Impact:**
- D-016 latency targets (50ms median, 200ms p99) are not testable
- Query plans may differ
- Memory usage patterns differ (no connection pool needed)

---

## F9: JSON Schema Validation is Simplified

**Severity:** MEDIUM
**Spec ref:** §3.4 (label_schema validation)

The spec references JSON Schema validation against `label_schema`. The gen1 implementation uses simplified validation (required fields + basic type checking) rather than full JSON Schema Draft-07 compliance.

**Impact:**
- `format` constraints (email, date, uri) are not validated
- `enum` constraints are not validated
- `minLength`, `maxLength`, `minimum`, `maximum` are not validated
- Nested object schemas are not validated

**Recommendation:**
- Gen2 should specify exact JSON Schema draft version and validation library
- Consider using `ajv` for full compliance

---

## F10: Tier 3 Deduplication (LLM) Deferred

**Severity:** LOW
**Spec ref:** §3.2 (3-tier deduplication)

Only Tier 1 (exact match) and partial Tier 2 (embedding similarity) are implemented. Tier 3 (LLM disambiguation) is deferred.

**Impact:**
- Near-duplicate entities (e.g., "Erik Lindström" vs "E. Lindström") may not be caught
- Dedup accuracy depends heavily on exact name matching

---

## F11: intent_type CHECK Constraint Limits Extensibility

**Severity:** MEDIUM
**Spec ref:** §2.1 (events table DDL)

The events table has a CHECK constraint on `intent_type` with a fixed list of allowed values. The `propose_event` tool cannot create events with arbitrary intent types.

**Impact:**
- Custom event types require DDL migration
- `propose_event` is limited to known intent types

**Recommendation:**
- Consider removing the CHECK constraint in favor of a validation table/enum
- Or add an `other` category with free-form intent_type

---

## Summary

| ID | Severity | Category | Summary |
|----|----------|----------|---------|
| F1 | HIGH | Security | No RLS — tenant isolation is application-level only |
| F2 | MEDIUM | Auth | No Supabase Auth integration |
| F3 | MEDIUM | Data integrity | No btree_gist EXCLUDE constraint |
| F4 | LOW | Identity | UUIDv7 in app layer, not DB |
| F5 | MEDIUM | Reliability | In-memory embedding queue |
| F6 | LOW | Security | SET LOCAL pattern not testable |
| F7 | LOW | Storage | Local filesystem blob storage |
| F8 | LOW | Performance | PGlite perf not representative |
| F9 | MEDIUM | Validation | Simplified JSON Schema validation |
| F10 | LOW | AI | Tier 3 LLM dedup deferred |
| F11 | MEDIUM | Extensibility | intent_type CHECK limits propose_event |
