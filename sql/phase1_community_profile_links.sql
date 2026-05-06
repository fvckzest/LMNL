alter table profiles
add column if not exists website_url text;

alter table profiles
add column if not exists x_url text;

alter table profiles
add column if not exists instagram_url text;
