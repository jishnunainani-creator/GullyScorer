# PitchLog Row Level Security (RLS) & Live Read Test Plan

This document details the manual security verification test cases to execute in the Supabase SQL editor or API client.

## Test Matrix

| Test ID | Scenario | Expected Result |
| :--- | :--- | :--- |
| **RLS-01** | User A queries `matches` table | Receives only matches where `owner_id = user_a.id`. User B's rows are hidden. |
| **RLS-02** | User A tries to `insert` into `matches` with `owner_id = user_b.id` | Rejected with RLS `check violation` error. |
| **RLS-03** | User A tries to `update` or `delete` User B's match by ID | 0 rows affected (update fails silently or returns 0 rows updated). |
| **RLS-04** | User A queries `ball_events` directly for User B's match ID | Returns empty array (`[]`). Direct table select is blocked by RLS. |
| **RLS-05** | User A inserts a ball event into User B's match | Rejected with RLS `check violation`. |
| **RLS-06** | Anonymous viewer with no auth session queries `matches` directly | Returns empty array (`[]`). |
| **RLS-07** | Anonymous viewer calls `get_live_match(token)` with invalid/wrong token | Returns `null`. |
| **RLS-08** | Anonymous viewer calls `get_live_match(token)` for private match (`is_live = false`, `status = 'in_progress'`) | Returns `null` (private in-progress match not accessible). |
| **RLS-09** | Anonymous viewer calls `get_live_match(token)` for live match (`is_live = true`) | Returns `{ "match": { ... }, "events": [ ... ] }` containing match and all non-deleted ball events ordered by sequence. |
| **RLS-10** | Anonymous viewer calls `get_live_match(token)` for finished match (`status = 'completed'`) | Returns full match and ball events even if `is_live` was toggled off after match conclusion. |
| **RLS-11** | Undone ball events with `deleted_at is not null` | Excluded from `get_live_match` response payload. |
| **RLS-12** | Realtime broadcast channel isolation | Scorer broadcasts only on `live-match:<share_token>`. Viewers only receive messages for the token channel they subscribed to. |

## Verification Queries in Supabase SQL Editor

```sql
-- Test as User A
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select * from matches; -- Should return only User A matches

-- Test as User B
set local "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select * from matches; -- Should return only User B matches

-- Test as Anonymous Viewer via RPC
set local role anon;
select get_live_match('invalid-token-xyz'); -- Returns null
select get_live_match('<valid-token>'); -- Returns match + events
```
