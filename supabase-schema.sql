-- AZZATUL BOUQUET — Supabase PostgreSQL Schema
-- Jalankan 1 kali di Supabase Dashboard -> SQL Editor -> New Query -> Run

create table if not exists public.app_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Aktifkan Row Level Security (akses dilakukan aman lewat server Vercel menggunakan Service Role Key)
alter table public.app_store enable row level security;
