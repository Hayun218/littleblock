// scripts/upload-legacy.mjs
// 기존 도안 이미지(직접 고른 파일들)를 Supabase에 일괄 업로드하는 일회성 스크립트.
//
// 사용법:
//   1) 이전할 이미지 파일들을  scripts/legacy-images/  폴더에 넣으세요.
//      파일명이 도안 제목이 됩니다. 예) "토끼 도안.png" → 제목 "토끼 도안"
//   2) 아래 ADMIN_USER_ID 에 admin 계정의 user id를 넣으세요.
//      (Supabase 대시보드 → Authentication → Users 에서 admin 계정의 ID 복사)
//   3) .env.local 에 SUPABASE_SERVICE_KEY 를 추가하세요 (secret 키, sb_secret_...).
//      이 스크립트는 본인 컴퓨터에서만 돌리므로 secret 키 사용이 안전합니다.
//   4) 터미널에서:  npm run migrate-images
//
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ====== 여기를 채우세요 ======
const ADMIN_USER_ID = "여기에_admin_계정_user_id";
const IMAGE_DIR = join(__dirname, "legacy-images");
const BUCKET = "pattern-images";
// =============================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // sb_secret_...

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_KEY 를 넣어주세요.");
  process.exit(1);
}
if (ADMIN_USER_ID.startsWith("여기에")) {
  console.error("❌ 스크립트 상단의 ADMIN_USER_ID 를 실제 admin user id로 바꿔주세요.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };

const files = (await readdir(IMAGE_DIR)).filter((f) => MIME[extname(f).toLowerCase()]);
console.log(`📦 ${files.length}개 이미지를 업로드합니다...`);

let ok = 0, fail = 0;
for (const file of files) {
  try {
    const buf = await readFile(join(IMAGE_DIR, file));
    const ext = extname(file).toLowerCase();
    const path = `${ADMIN_USER_ID}/legacy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(path, buf, { contentType: MIME[ext] });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { error: insErr } = await supabase.from("patterns").insert({
      user_id: ADMIN_USER_ID,
      title: basename(file, ext),
      image_url: pub.publicUrl,
      pixel_data: null,    // 기존 도안은 픽셀 데이터 없음
      is_public: true,     // 갤러리에 공개
      is_legacy: true,
    });
    if (insErr) throw insErr;

    ok++;
    console.log(`  ✅ ${file}`);
  } catch (e) {
    fail++;
    console.log(`  ❌ ${file} — ${e.message}`);
  }
}
console.log(`\n완료: 성공 ${ok}개, 실패 ${fail}개`);
