-- Search runs: one record per discovery execution (per-source stats, AI scoring outcome).
alter table public.records drop constraint if exists records_collection_check;
alter table public.records add constraint records_collection_check
  check (collection in ('profile', 'preferences', 'jobs', 'resumes', 'applications', 'runs'));
