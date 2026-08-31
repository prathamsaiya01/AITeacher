create extension if not exists pgcrypto;

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  title text not null,
  subject text not null,
  topic text not null,
  status text default 'completed',
  duration_minutes int default 0,
  created_at timestamptz default now()
);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  lesson_id text not null,
  score int not null,
  max_score int not null,
  percentage int not null,
  strong_concepts text[] default '{}',
  weak_concepts text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists lessons_student_id_idx on public.lessons (student_id);
create index if not exists assessment_results_student_id_idx on public.assessment_results (student_id);

