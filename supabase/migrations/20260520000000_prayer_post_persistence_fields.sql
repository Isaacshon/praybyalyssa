alter table public.prayer_posts
  add column if not exists author_label text,
  add column if not exists neighborhood text,
  add column if not exists paper_color text,
  add column if not exists pin_seed integer;
