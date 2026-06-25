import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import axios from "axios";

const PALETTE = [
  "#1b1b1b", "#ffffff", "#7d7d7d", "#e11d2a", "#f6c81e", "#e7e0b0",
  "#f47b20", "#8bc63f", "#1f7a3d", "#1c3faa", "#1ca0e3", "#5a2b91",
  "#a78bd6", "#f4b8cf", "#ef2b6b", "#9c5a23", "#d9a45b",
];

function nearest(r: number, g: number, b: number, palette?: string[]) {
  const targetPalette = palette || PALETTE;
  let best = targetPalette[0], bd = Infinity;
  for (const hex of targetPalette) {
    const pr = parseInt(hex.slice(1, 3), 16);
    const pg = parseInt(hex.slice(3, 5), 16);
    const pb = parseInt(hex.slice(5, 7), 16);
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bd) { bd = d; best = hex; }
  }
  return best;
}

function extractTopColors(pixels: Uint8ClampedArray, channels: number, maxColors: number = 5): string[] {
  const colorMap = new Map<string, number>();

  // 불투명 픽셀의 색상 빈도 계산
  for (let i = 0; i < pixels.length; i += channels) {
    const a = pixels[i + 3];
    if (a > 128) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
      colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
    }
  }

  if (colorMap.size === 0) return ["#ffffff"];

  // 빈도순 정렬 후 상위 색상만 선택
  const topColors = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(entry => entry[0]);

  return topColors;
}

const CONCEPTS: Record<string, string[]> = {
  개: [
    "https://images.unsplash.com/photo-1633722715463-d30628cfa4a9?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1587300411515-7873a202f59b?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1587922894991-e332fda58f22?w=200&h=200&fit=crop",
  ],
  고양이: [
    "https://images.unsplash.com/photo-1574158622682-e40ad07d3575?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1548681528-6a846cf17f0f?w=200&h=200&fit=crop",
  ],
  나비: [
    "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=200&h=200&fit=crop",
  ],
  장미: [
    "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=200&h=200&fit=crop",
  ],
  해바라기: [
    "https://images.unsplash.com/photo-1524314625910-7e185e8ce632?w=200&h=200&fit=crop",
  ],
  올빼미: [
    "https://images.unsplash.com/photo-1587922894991-e332fda58f22?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1540001332925-86a41d134f71?w=200&h=200&fit=crop",
  ],
  펭귄: [
    "https://images.unsplash.com/photo-1551770360-330c64d6eb69?w=200&h=200&fit=crop",
  ],
  토끼: [
    "https://images.unsplash.com/photo-1585110396000-c9ffd4d4b3f4?w=200&h=200&fit=crop",
  ],
  별: [
    "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop",
  ],
  달: [
    "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=200&h=200&fit=crop",
  ],
  무지개: [
    "https://images.unsplash.com/photo-1597595247322-dfe8e2f04e03?w=200&h=200&fit=crop",
  ],
  눈송이: [
    "https://images.unsplash.com/photo-1494199502926-a4c8e4d1f7e9?w=200&h=200&fit=crop",
  ],
  불꽃: [
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=200&h=200&fit=crop",
  ],
  파도: [
    "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=200&h=200&fit=crop",
  ],
  나무: [
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=200&fit=crop",
  ],
  꽃: [
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&h=200&fit=crop",
  ],
};

function generateRandomPattern(palette?: string[]): (string | null)[] {
  const targetPalette = palette || PALETTE;
  // 무작위 팔레트에서 5개 색상만 선택
  const selectedColors = [];
  const colorCount = Math.floor(Math.random() * 3) + 3; // 3~5개
  const shuffled = [...targetPalette].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(colorCount, shuffled.length); i++) {
    selectedColors.push(shuffled[i]);
  }

  const data: (string | null)[] = [];
  for (let j = 0; j < 45 * 45; j++) {
    data.push(Math.random() > 0.35 ? null : selectedColors[Math.floor(Math.random() * selectedColors.length)]);
  }
  return data;
}

async function getImageUrlsFromConcept(concept: string): Promise<string[]> {
  try {
    // Unsplash API로 검색 (심플 일러스트 버전)
    const apiKey = process.env.UNSPLASH_API_KEY;
    if (!apiKey) {
      console.warn("UNSPLASH_API_KEY not set");
      return [];
    }

    // "고양이" → "고양이 심플 일러스트" 형식으로 검색
    const searchQuery = `${concept} simple illustration flat design`;
    const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=10&order_by=random&client_id=${apiKey}`;
    const response = await axios.get(searchUrl, { timeout: 5000 });

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results.map((img: any) => img.urls.small);
    }

    // 일러스트 검색 실패시 일반 검색으로 폴백
    const fallbackUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(concept)}&per_page=10&order_by=random&client_id=${apiKey}`;
    const fallbackResponse = await axios.get(fallbackUrl, { timeout: 5000 });

    if (fallbackResponse.data.results && fallbackResponse.data.results.length > 0) {
      return fallbackResponse.data.results.map((img: any) => img.urls.small);
    }
    return [];
  } catch (error) {
    console.error(`Failed to get images for concept "${concept}":`, error);
    return [];
  }
}

function detectAndRemoveBackground(pixels: Uint8ClampedArray, channels: number): void {
  const width = 45;
  const height = 45;

  // 모서리에서 배경색 샘플링
  const cornerPixels: { r: number; g: number; b: number; brightness: number }[] = [];
  const borderSize = 2;

  for (let y = 0; y < borderSize; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
      cornerPixels.push({ r, g, b, brightness: (r + g + b) / 3 });
    }
  }
  for (let y = height - borderSize; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
      cornerPixels.push({ r, g, b, brightness: (r + g + b) / 3 });
    }
  }

  // 배경 밝기 기반 판별 (모서리가 배경)
  const brightnesses = cornerPixels.map(p => p.brightness).sort((a, b) => a - b);
  const medianBrightness = brightnesses[Math.floor(brightnesses.length / 2)];

  // 덜 공격적인 배경 제거 (밝기 범위만 사용)
  const bgBrightnessRange = 40;
  const bgBrightnessMin = Math.max(0, medianBrightness - bgBrightnessRange);
  const bgBrightnessMax = Math.min(255, medianBrightness + bgBrightnessRange);

  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const brightness = (r + g + b) / 3;

    if (brightness >= bgBrightnessMin && brightness <= bgBrightnessMax) {
      pixels[i + 3] = 0; // 배경 투명화
    }
  }
}

function keepLargestComponent(pixels: Uint8ClampedArray, channels: number): void {
  // 가장 큰 연결 컴포넌트만 유지 (흩어진 픽셀 제거)
  const width = 45;
  const height = 45;
  const visited = new Uint8Array(width * height);
  let maxComponent: number[] = [];

  function floodFill(startY: number, startX: number): number[] {
    const component: number[] = [];
    const queue: Array<{ y: number; x: number }> = [{ y: startY, x: startX }];
    visited[startY * width + startX] = 1;

    while (queue.length > 0) {
      const { y, x } = queue.shift()!;
      const idx = (y * width + x) * channels;
      component.push(idx);

      // 4-연결 이웃 확인
      for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const ny = y + dy, nx = x + dx;
        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
          const nIdx = (ny * width + nx) * channels;
          if (!visited[ny * width + nx] && pixels[nIdx + 3] > 128) {
            visited[ny * width + nx] = 1;
            queue.push({ y: ny, x: nx });
          }
        }
      }
    }

    return component;
  }

  // 모든 컴포넌트 찾기
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      if (!visited[y * width + x] && pixels[idx + 3] > 128) {
        const component = floodFill(y, x);
        if (component.length > maxComponent.length) {
          maxComponent = component;
        }
      }
    }
  }

  // 가장 큰 컴포넌트만 유지
  const kept = new Set(maxComponent);
  for (let i = 3; i < pixels.length; i += channels) {
    if (pixels[i] > 128 && !kept.has(i - 3)) {
      pixels[i] = 0;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { concept, count, palette } = await req.json();

    if (!concept || typeof concept !== "string" || concept.trim().length === 0) {
      return NextResponse.json(
        { error: "컨셉을 입력해주세요" },
        { status: 400 }
      );
    }

    const cnt = Math.min(Math.max(parseInt(count) || 1, 1), 10);
    const imageUrls = await getImageUrlsFromConcept(concept);
    const usePalette = Array.isArray(palette) && palette.length > 0 ? palette : undefined;
    const patterns: Array<{ cols: number; rows: number; data: (string | null)[] }> = [];

    for (let i = 0; i < cnt; i++) {
      // 각 패턴마다 다른 이미지 사용
      const imageUrl = imageUrls[i % (imageUrls.length || 1)];

      if (imageUrl && imageUrls.length > 0) {
        try {
          const imageBuffer = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            timeout: 10000,
          });

          // 45x45로 리사이즈 + 이미지 강화
          let resized = await sharp(imageBuffer.data)
            .resize(45, 45, { fit: "cover" })
            .modulate({ lightness: 10, saturation: 1.3 })
            .normalize()
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

          const pixels = Buffer.from(resized.data);
          const channels = resized.info.channels;

          // 배경 제거
          detectAndRemoveBackground(pixels as unknown as Uint8ClampedArray, channels);
          // 가장 큰 형태만 유지 (흩어진 픽셀 제거)
          keepLargestComponent(pixels as unknown as Uint8ClampedArray, channels);

          // 상위 5개 색상만 추출
          const topColors = extractTopColors(pixels as unknown as Uint8ClampedArray, channels, 5);
          // 추출된 색상들을 현재 팔렛트로 매핑
          const mappedPalette = topColors.map(color => {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return nearest(r, g, b, usePalette || PALETTE);
          });

          const data: (string | null)[] = [];

          for (let y = 0; y < 45; y++) {
            for (let x = 0; x < 45; x++) {
              const idx = (y * 45 + x) * channels;
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];
              const a = channels > 3 ? pixels[idx + 3] : 255;

              if (a < 128) {
                data.push(null);
              } else {
                // 현재 팔렛트로만 매핑된 색상 사용
                data.push(nearest(r, g, b, mappedPalette));
              }
            }
          }

          patterns.push({ cols: 45, rows: 45, data });
        } catch (e) {
          console.error(`Failed to process image ${i} for "${concept}":`, e);
          patterns.push({ cols: 45, rows: 45, data: generateRandomPattern(usePalette) });
        }
      } else {
        // 이미지 검색 실패 시 무작위 패턴 생성
        patterns.push({ cols: 45, rows: 45, data: generateRandomPattern(usePalette) });
      }
    }

    return NextResponse.json({ patterns, concept });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
