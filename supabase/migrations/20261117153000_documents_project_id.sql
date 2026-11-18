-- 공유 시트지·슬라이드를 프로젝트별로 나누기 위한 첫 단계.
--
-- 지금은 documents 에 default-sheet, default-deck 두 줄뿐이라
-- 어느 프로젝트에서 열어도 같은 내용이 보인다.
-- 어느 프로젝트의 문서인지 적어 둘 칸을 만든다.
--
-- 이 파일은 칸을 더하기만 한다. 읽기·쓰기 권한(RLS)은 건드리지 않는다.
-- 화면 코드가 이 칸을 제대로 채우는 것을 확인한 뒤, 권한은 다음 파일에서 바꾼다.
-- 순서를 뒤집으면 문이 먼저 잠겨 아무것도 안 보이게 된다.

-- 기존 두 줄은 프로젝트가 없으므로 null 을 허용한다.
-- 전환이 끝나면 null 을 없애고 not null 로 바꾸는 파일을 따로 만든다.
alter table public.documents
  add column if not exists project_id uuid
    references public.projectdata(id) on delete cascade;

-- 한 프로젝트의 문서를 찾을 때 쓰는 색인
create index if not exists documents_project_id_idx
  on public.documents(project_id);

comment on column public.documents.project_id is
  '이 문서가 속한 프로젝트. null 이면 프로젝트 구분이 생기기 전에 만들어진 공용 문서다.';
