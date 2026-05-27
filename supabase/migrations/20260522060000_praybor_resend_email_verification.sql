create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_codes_lookup_idx
  on public.email_verification_codes (email, code_hash)
  where consumed_at is null;

create index if not exists email_verification_codes_expiry_idx
  on public.email_verification_codes (expires_at);

alter table public.email_verification_codes enable row level security;

revoke all on public.email_verification_codes from anon, authenticated;
