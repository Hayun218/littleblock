# 리틀블럭 (Next.js + Supabase)

픽셀 도안을 만들고 공유하는 웹앱. 갤러리는 누구나, 에디터는 로그인한 사람만.

## 화면 구성
- `/`        갤러리 — 공개 도안 열람 (누구나)
- `/login`   로그인 / 회원가입
- `/editor`  픽셀 에디터 (로그인 필요) — 그리기, 저장, 공개/비공개
- `/mine`    내 도안 (로그인 필요) — 본인 도안 전체

## 처음 실행하는 법 (Mac)

### 1. Node.js 설치 (이미 있으면 건너뛰기)
터미널에서 확인:  `node -v`
없으면 https://nodejs.org 에서 LTS 버전 설치.

### 2. 압축 풀고 폴더로 이동
터미널에서 (압축 푼 위치에 맞게):
    cd ~/Downloads/littleblock-app

### 3. 연결 정보 입력
`.env.local.example` 파일을 복사해서 `.env.local` 로 이름을 바꾼 뒤,
Supabase의 Project URL 과 publishable 키를 채웁니다.
터미널로 한 번에:
    cp .env.local.example .env.local
    open -e .env.local      # 텍스트 편집기로 열림 → 두 값 채우고 저장

### 4. 패키지 설치 & 실행
    npm install
    npm run dev

브라우저에서 http://localhost:3000 접속.

## 기존 도안 이미지 이전 (일회성)
1. `scripts/legacy-images/` 폴더에 도안 이미지들을 넣습니다 (파일명 = 제목).
2. Supabase에서 admin 계정으로 회원가입 → Authentication > Users 에서 그 user id 복사.
3. `scripts/upload-legacy.mjs` 상단의 `ADMIN_USER_ID` 에 붙여넣기.
4. `.env.local` 에 `SUPABASE_SERVICE_KEY=sb_secret_...` 추가 (secret 키, 본인 PC에서만 사용).
5. 실행:  `npm run migrate-images`

## Vercel 배포
1. 이 폴더를 GitHub 저장소에 올림.
2. vercel.com → New Project → 그 저장소 선택.
3. Environment Variables 에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 입력.
4. Deploy. 이후 git push 하면 자동 재배포.

## 보안 메모
- 프론트엔드에는 publishable 키(`sb_publishable_...`)만 사용. 안전합니다.
- secret 키(`sb_secret_...`)는 이전 스크립트(본인 PC)에서만. 절대 코드에 넣거나 깃에 올리지 마세요.
- 공개/비공개 접근 제어는 Supabase RLS가 DB 레벨에서 강제합니다.

## 추가 화면 (업데이트)
- `/`         홈 (히어로 + 인기 작품 + CTA)
- `/gallery`  작품 갤러리 (공개 도안 전체)
- `/about`    리틀블럭 소개
- `/contact`  문의하기 (DB 저장)
- `/editor`   에디터 — 저장 버튼은 우측 상단, '전체 지우기'는 좌측 도구에 있음

## 문의하기 테이블 추가 (한 번만)
`/contact` 기능을 쓰려면 Supabase SQL Editor에서 `db-inquiries.sql` 내용을 실행하세요.
실행 안 하면 문의 전송 시 오류가 납니다.
접수된 문의는 Supabase 대시보드 → Table Editor → inquiries 에서 확인합니다.

## 보안 패치 적용됨
next 15.1.11 / react 19.0.3 (CVE-2025-66478 등 패치 버전). 재설치 시:
    npm install

## 도안 수정 / 공개·비공개 전환 (업데이트)
- 내 도안(/mine) 카드에서 바로:
  - "공개로 / 비공개로" 버튼 → 게시 상태 전환
  - "수정" 버튼 → 에디터로 이동해 그림을 다시 편집 후 덮어쓰기 저장
  - "삭제" 버튼 → 도안 삭제
- 에디터는 /editor?id=도안ID 로 들어가면 기존 도안을 불러와 수정합니다.
- 기존 이전 이미지 도안(픽셀 데이터 없음)은 그림 편집은 불가하고,
  제목과 공개 여부만 바꿀 수 있습니다("정보수정" 버튼).

RLS 권한은 처음 만든 patterns 정책(update/delete: 본인만)으로 이미 보호됩니다.
추가 SQL 실행은 필요 없어요. (문의 기능만 db-inquiries.sql 한 번 실행)
