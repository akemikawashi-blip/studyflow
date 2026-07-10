# Security notes

- Do not expose a Supabase service-role key in `NEXT_PUBLIC_*` variables.
- Server Actions call `requireUser()` and derive ownership from the verified session.
- Authentication Proxy refreshes tokens and redirects unauthenticated requests.
- RLS policies are scoped to `authenticated` users.
- User-owned foreign keys contain `user_id` to stop cross-account parent linking.
- Destructive Task and Skill actions require browser confirmation.
- Password reset returns a generic response to reduce account enumeration.
- Redirect parameters are limited to safe internal paths.
