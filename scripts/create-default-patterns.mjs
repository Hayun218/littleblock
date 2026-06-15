import sharp from "sharp";
import axios from "axios";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("❌ Supabase 환경 변수 누락");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 팔레트
const PALETTE = [
  "#1b1b1b", "#ffffff", "#7d7d7d", "#e11d2a", "#f6c81e", "#e7e0b0",
  "#f47b20", "#8bc63f", "#1f7a3d", "#1c3faa", "#1ca0e3", "#5a2b91",
  "#a78bd6", "#f4b8cf", "#ef2b6b", "#9c5a23", "#d9a45b",
];

// 색상 매핑
function nearest(r, g, b) {
  let best = PALETTE[0], bd = Infinity;
  for (const hex of PALETTE) {
    const pr = parseInt(hex.slice(1, 3), 16);
    const pg = parseInt(hex.slice(3, 5), 16);
    const pb = parseInt(hex.slice(5, 7), 16);
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bd) { bd = d; best = hex; }
  }
  return best;
}

// 이미지 → 45×45 도안 변환
async function imageToPattern(imageBuffer) {
  const cols = 45, rows = 45;
  const metadata = await sharp(imageBuffer).metadata();

  // 45×45로 리샘플링
  const resized = await sharp(imageBuffer)
    .resize(cols, rows, { fit: "cover" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = resized.data;
  const channels = resized.info.channels;
  const data = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = (y * cols + x) * channels;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = channels > 3 ? pixels[idx + 3] : 255;

      if (a < 128) {
        data.push(null);
      } else {
        data.push(nearest(r, g, b));
      }
    }
  }

  return { cols, rows, data };
}

// 도안 데이터셋
const patterns = [
  { title: "고양이", url: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&h=200&fit=crop", category: "animal" },
  { title: "강아지", url: "https://images.unsplash.com/photo-1633722715463-d30628519b29?w=200&h=200&fit=crop", category: "animal" },
  { title: "다람쥐", url: "https://images.unsplash.com/photo-1608848461950-0fed8937a62a?w=200&h=200&fit=crop", category: "animal" },
  { title: "해바라기 (Van Gogh)", url: "https://images.unsplash.com/photo-1578926314433-3e84c55bda59?w=200&h=200&fit=crop", category: "art" },
  { title: "목장의 별 (Starry Night)", url: "https://images.unsplash.com/photo-1578926308295-f4f3c877c1f8?w=200&h=200&fit=crop", category: "art" },
  { title: "모나리자", url: "https://images.unsplash.com/photo-1578926307174-556fbe8e6b1b?w=200&h=200&fit=crop", category: "art" },
  { title: "대파도 (호쿠사이)", url: "https://images.unsplash.com/photo-1578926362038-d60e00e5d33f?w=200&h=200&fit=crop", category: "art" },
  { title: "진주 귀걸이 소녀", url: "https://images.unsplash.com/photo-1578926314433-3e84c55bda59?w=200&h=200&fit=crop", category: "art" },
  { title: "나비", url: "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=200&h=200&fit=crop", category: "insect" },
  { title: "벌", url: "https://images.unsplash.com/photo-1563514227147-6d2ff665a7a2?w=200&h=200&fit=crop", category: "insect" },
  { title: "사자", url: "https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?w=200&h=200&fit=crop", category: "animal" },
  { title: "펭귄", url: "https://images.unsplash.com/photo-1551107696-a0f75d4cacc8?w=200&h=200&fit=crop", category: "animal" },
  { title: "플라밍고", url: "https://images.unsplash.com/photo-1552491881-721db3be7b23?w=200&h=200&fit=crop", category: "animal" },
  { title: "원숭이", url: "https://images.unsplash.com/photo-1540573133985-87b6da1b3e4b?w=200&h=200&fit=crop", category: "animal" },
  { title: "토끼", url: "https://images.unsplash.com/photo-1585110396000-c9ffd4d4b3f4?w=200&h=200&fit=crop", category: "animal" },
  { title: "거북이", url: "https://images.unsplash.com/photo-1544923408-75c6c78c84d8?w=200&h=200&fit=crop", category: "animal" },
  { title: "올빼미", url: "https://images.unsplash.com/photo-1587922894991-e332fda58f22?w=200&h=200&fit=crop", category: "bird" },
  { title: "앵무새", url: "https://images.unsplash.com/photo-1551770360-330c64d6eb69?w=200&h=200&fit=crop", category: "bird" },
  { title: "장미", url: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=200&h=200&fit=crop", category: "flower" },
  { title: "튤립", url: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=200&h=200&fit=crop", category: "flower" },
  { title: "해바라기", url: "https://images.unsplash.com/photo-1524314625910-7e185e8ce632?w=200&h=200&fit=crop", category: "flower" },
  { title: "버섯", url: "https://images.unsplash.com/photo-1540001332925-86a41d134f71?w=200&h=200&fit=crop", category: "nature" },
  { title: "귀여운 로봇", url: "https://images.unsplash.com/photo-1531746790731-6c087fecd65b?w=200&h=200&fit=crop", category: "tech" },
  { title: "별", url: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop", category: "nature" },
  { title: "무지개", url: "https://images.unsplash.com/photo-1597595247322-dfe8e2f04e03?w=200&h=200&fit=crop", category: "nature" },
  { title: "달", url: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop", category: "nature" },
  { title: "번개", url: "https://images.unsplash.com/photo-1534274988757-a28bf1a4c817?w=200&h=200&fit=crop", category: "nature" },
  { title: "눈송이", url: "https://images.unsplash.com/photo-1494199502926-a4c8e4d1f7e9?w=200&h=200&fit=crop", category: "winter" },
  { title: "불꽃", url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=200&h=200&fit=crop", category: "fire" },
  { title: "파도", url: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=200&h=200&fit=crop", category: "nature" },
];

async function downloadAndConvert(pattern) {
  try {
    console.log(`⏳ ${pattern.title} 다운로드 중...`);
    const response = await axios.get(pattern.url, { responseType: "arraybuffer", timeout: 10000 });
    const imageBuffer = Buffer.from(response.data);

    console.log(`🎨 ${pattern.title} 도안 변환 중...`);
    const pixelData = await imageToPattern(imageBuffer);

    return { ...pattern, pixelData };
  } catch (error) {
    console.error(`❌ ${pattern.title} 실패: ${error.message}`);
    return null;
  }
}

async function uploadToSupabase(pattern) {
  try {
    // PNG 생성 (Sharp로 이미지 렌더)
    const cellSize = 8;
    const size = 45 * cellSize;

    // SVG로 도안 렌더
    const svgImage = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="white"/>
        ${pattern.pixelData.data.map((color, idx) => {
          if (!color) return '';
          const x = (idx % 45) * cellSize;
          const y = Math.floor(idx / 45) * cellSize;
          return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}" stroke="#ddd" stroke-width="0.5"/>`;
        }).join('')}
      </svg>
    `;

    const filename = `${Date.now()}-${pattern.title.replace(/\s/g, "-")}.png`;
    const pngBuffer = await sharp(Buffer.from(svgImage)).png().toBuffer();

    console.log(`☁️ ${pattern.title} Supabase 업로드 중...`);
    const { error: uploadError } = await supabase.storage
      .from("pattern-images")
      .upload(`default/${filename}`, pngBuffer, { contentType: "image/png" });

    if (uploadError) throw uploadError;

    const imageUrl = supabase.storage.from("pattern-images").getPublicUrl(`default/${filename}`).data.publicUrl;

    // DB 저장
    const { error: dbError } = await supabase.from("patterns").insert({
      title: pattern.title,
      description: `${pattern.category} 카테고리 도안`,
      image_url: imageUrl,
      pixel_data: pattern.pixelData,
      is_public: true,
      is_default: true,
    });

    if (dbError) throw dbError;

    console.log(`✅ ${pattern.title} 저장 완료!`);
    return true;
  } catch (error) {
    console.error(`❌ ${pattern.title} 저장 실패: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🚀 기본 도안 생성 시작...\n");

  let successCount = 0;
  for (const pattern of patterns) {
    const converted = await downloadAndConvert(pattern);
    if (converted) {
      const uploaded = await uploadToSupabase(converted);
      if (uploaded) successCount++;
    }
    await new Promise(r => setTimeout(r, 500)); // Rate limiting
  }

  console.log(`\n✨ 완료! ${successCount}/${patterns.length} 도안 생성됨`);
}

main().catch(console.error);
