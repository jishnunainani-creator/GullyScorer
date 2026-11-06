# Tournament Row Level Security (RLS) & Sync Test Plan

This document details the security constraints, RLS policies, and test cases for PitchLog Phase 5 Tournaments.

---

## 1. Single-Writer Security Model

- **Tournament Ownership:** A tournament is owned by the organizer's authenticated user account (`owner_id = auth.uid()`).
- **Fixtures & Teams:** Mutating fixtures and tournament teams is restricted to the owner of the parent tournament.
- **Single-Writer Constraint:** Only the organizer's client can create, update, re-score, or delete fixtures. Scorers scoring a fixture operate under the organizer's session (or share a fixture link).
- **Public Read Access:** Unauthenticated / public access is permitted **strictly** via the `SECURITY DEFINER` function `get_public_tournament(token text)`. Direct `select` queries on `tournaments`, `tournament_teams`, and `fixtures` by unauthenticated users are blocked by default RLS denial.

---

## 2. Policy Verification Matrix

| Table | Operation | Role | Policy Condition | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| `tournaments` | `INSERT` | Authenticated (Owner) | `owner_id = auth.uid()` | ✅ Allowed |
| `tournaments` | `SELECT` | Authenticated (Owner) | `owner_id = auth.uid()` | ✅ Allowed |
| `tournaments` | `SELECT` | Other User / Anonymous | `owner_id = auth.uid()` | ❌ Denied (0 rows returned) |
| `tournaments` | `UPDATE` | Other User | `owner_id = auth.uid()` | ❌ Denied |
| `tournament_teams` | `INSERT` | Authenticated (Owner) | `parent.owner_id = auth.uid()` | ✅ Allowed |
| `tournament_teams` | `SELECT` | Other User | `parent.owner_id = auth.uid()` | ❌ Denied |
| `fixtures` | `INSERT` | Authenticated (Owner) | `parent.owner_id = auth.uid()` | ✅ Allowed |
| `fixtures` | `UPDATE` | Authenticated (Owner) | `parent.owner_id = auth.uid()` | ✅ Allowed |
| `fixtures` | `DELETE` | Other User | `parent.owner_id = auth.uid()` | ❌ Denied |
| `RPC get_public_tournament` | `EXECUTE` | Public / Anon | `token = share_token AND is_public = true` | ✅ Allowed (returns JSON payload) |
| `RPC get_public_tournament` | `EXECUTE` | Public / Anon | `is_public = false` | ❌ Returns `null` |
| `RPC get_public_tournament` | `EXECUTE` | Public / Anon | Invalid / Empty token | ❌ Returns `null` |

---

## 3. Manual Test Steps in Supabase SQL Editor

### Test Case 1: Owner CRUD
```sql
-- Assume running as user-1
insert into tournaments (id, owner_id, name, format, config, share_token, is_public)
values ('11111111-1111-1111-1111-111111111111', auth.uid(), 'Cup 2026', 'league', '{}', 'token-123', true);
-- Must succeed
select * from tournaments where id = '11111111-1111-1111-1111-111111111111';
-- Must return 1 row
```

### Test Case 2: Cross-Tenant Isolation
```sql
-- Sign in as user-2
select * from tournaments where id = '11111111-1111-1111-1111-111111111111';
-- Must return 0 rows
update tournaments set name = 'Hacked' where id = '11111111-1111-1111-1111-111111111111';
-- Must affect 0 rows
```

### Test Case 3: Public Tournament RPC
```sql
-- As anon role
select get_public_tournament('token-123');
-- Must return JSON with tournament, teams, fixtures, and matches
select get_public_tournament('fake-token');
-- Must return null
```
