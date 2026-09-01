create table if not exists public.uploaded_materials (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  file_path text not null,
  subject text not null,
  topic text not null,
  concepts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists uploaded_materials_student_id_idx
  on public.uploaded_materials (student_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('uploaded_materials', 'uploaded_materials', false)
on conflict (id) do nothing;