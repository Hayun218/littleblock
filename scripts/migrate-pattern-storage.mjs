import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Supabase 환경 변수 누락");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migratePatterns() {
  try {
    console.log("🚀 패턴 Storage 마이그레이션 시작\n");

    // 모든 패턴 조회
    const { data: patterns, error: queryError } = await supabase
      .from("patterns")
      .select("id, user_id, image_url")
      .not("image_url", "is", null);

    if (queryError) throw queryError;

    if (!patterns || patterns.length === 0) {
      console.log("마이그레이션할 패턴이 없습니다");
      return;
    }

    console.log(`총 ${patterns.length}개 패턴 발견\n`);

    let successCount = 0;
    let skipCount = 0;

    for (const pattern of patterns) {
      const { id, user_id, image_url } = pattern;

      // image_url에서 파일 경로 추출
      const urlMatch = image_url.match(/pattern-images\/(.+)/);
      if (!urlMatch) {
        console.log(`⚠️  패턴 ${id}: URL 파싱 실패`);
        continue;
      }

      const oldPath = urlMatch[1];

      // 이미 user_id 폴더에 있으면 스킵
      if (oldPath.startsWith(user_id)) {
        console.log(`✓ 패턴 ${id}: 이미 마이그레이션됨`);
        skipCount++;
        continue;
      }

      const newPath = `${user_id}/${path.basename(oldPath)}`;

      try {
        // 1. 이전 파일 다운로드
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("pattern-images")
          .download(oldPath);

        if (downloadError) throw downloadError;

        // 2. 새 위치에 업로드
        const { error: uploadError } = await supabase.storage
          .from("pattern-images")
          .upload(newPath, fileData, { contentType: "image/png", upsert: false });

        if (uploadError) throw uploadError;

        // 3. DB의 image_url 업데이트
        const newImageUrl = supabase.storage
          .from("pattern-images")
          .getPublicUrl(newPath).data.publicUrl;

        const { error: updateError } = await supabase
          .from("patterns")
          .update({ image_url: newImageUrl })
          .eq("id", id);

        if (updateError) throw updateError;

        // 4. 이전 파일 삭제
        await supabase.storage
          .from("pattern-images")
          .remove([oldPath])
          .catch(() => {});

        console.log(`✅ 패턴 ${id}: ${oldPath} → ${newPath}`);
        successCount++;
      } catch (error) {
        console.error(`❌ 패턴 ${id} 마이그레이션 실패:`, error.message);
      }
    }

    console.log(`\n✨ 완료!`);
    console.log(`  성공: ${successCount}개`);
    console.log(`  스킵: ${skipCount}개`);
  } catch (error) {
    console.error("마이그레이션 오류:", error);
    process.exit(1);
  }
}

migratePatterns();
