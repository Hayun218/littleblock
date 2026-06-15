-- 문의하기(/contact) 기능에 필요한 테이블.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요.

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table inquiries enable row level security;

-- 누구나 문의를 남길 수 있게 (insert만 허용)
create policy "누구나 문의 작성"
  on inquiries for insert
  with check ( true );

-- 조회/수정/삭제 정책은 만들지 않음 → 일반 사용자는 못 봄.
-- 관리자는 Supabase 대시보드의 Table Editor에서 직접 확인하세요.
