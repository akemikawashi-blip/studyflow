# Security

StudyFlow is designed around authenticated, user-owned Supabase records.

- Row Level Security must remain enabled on every user-owned table.
- Never commit `.env.local`, `.env.production`, `service_role`, or `sb_secret_...` values.
- Browser code may use only the Supabase publishable key.
- Report security problems privately to the repository owner rather than opening a public issue containing user data or credentials.
