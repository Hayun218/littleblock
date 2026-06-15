"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type PixelData = { cols: number; rows: number; data: (string | null)[] };
type Mode = "image" | "generate";

const PALETTE = [
  "#1b1b1b", "#ffffff", "#7d7d7d", "#e11d2a", "#f6c81e", "#e7e0b0",
  "#f47b20", "#8bc63f", "#1f7a3d", "#1c3faa", "#1ca0e3", "#5a2b91",
  "#a78bd6", "#f4b8cf", "#ef2b6b", "#9c5a23", "#d9a45b",
];

const CONCEPTS = ["개", "고양이", "나비", "장미", "해바라기", "올빼미", "펭귄", "토끼", "별", "달", "무지개", "눈송이", "불꽃", "파도", "나무", "꽃"];

function nearest(r: number, g: number, b: number) {
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

async function imageToPattern(file: File): Promise<{ title: string; pixelData: PixelData }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 45;
          canvas.height = 45;
          const ctx = canvas.getContext("2d")!;

          // 비율 유지하면서 중앙 영역 사용
          const imgW = img.width;
          const imgH = img.height;
          const ratio = Math.max(45 / imgW, 45 / imgH);
          const scaledW = imgW * ratio;
          const scaledH = imgH * ratio;
          const offsetX = (45 - scaledW) / 2;
          const offsetY = (45 - scaledH) / 2;

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 45, 45);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);

          const imageData = ctx.getImageData(0, 0, 45, 45);
          const pixels = imageData.data;

          const data: (string | null)[] = [];
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];

            if (a < 128) {
              data.push(null);
            } else {
              data.push(nearest(r, g, b));
            }
          }

          const title = file.name.replace(/\.[^/.]+$/, "");
          resolve({ title, pixelData: { cols: 45, rows: 45, data } });
        };
        img.onerror = () => reject(new Error("이미지를 읽을 수 없습니다"));
        img.src = reader.result as string;
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다"));
    reader.readAsDataURL(file);
  });
}

function PatternPreview({ pixelData }: { pixelData: PixelData }) {
  const { cols, rows, data } = pixelData;
  const s = 6;
  return (
    <svg width={cols * s} height={rows * s} style={{ border: "1px solid var(--line)", borderRadius: 8 }}>
      <rect width={cols * s} height={rows * s} fill="#fff" />
      {data.map((color, i) => {
        if (!color) return null;
        const x = (i % cols) * s;
        const y = Math.floor(i / cols) * s;
        return <rect key={i} x={x} y={y} width={s} height={s} fill={color} stroke="none" />;
      })}
    </svg>
  );
}

function pixelDataToBlob(pixelData: PixelData): Promise<Blob> {
  return new Promise((resolve) => {
    const { cols, rows, data } = pixelData;
    const cellSize = 8;
    const size = cols * cellSize;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    data.forEach((color, i) => {
      if (!color) return;
      const x = (i % cols) * cellSize;
      const y = Math.floor(i / cols) * cellSize;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, cellSize, cellSize);
    });

    canvas.toBlob(resolve, "image/png");
  });
}

export default function AdminSection({ userId }: { userId: string }) {
  const [mode, setMode] = useState<Mode>("image");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [dragActive, setDragActive] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState("");
  const [generateCount, setGenerateCount] = useState("3");
  const [previews, setPreviews] = useState<Array<{ title: string; data: PixelData }>>([]);
  const supabase = createClient();

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length === 0) {
      alert("이미지 파일을 선택해주세요");
      return;
    }
    await uploadImagePatterns(files);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await uploadImagePatterns(files);
  };

  const uploadImagePatterns = async (files: File[]) => {
    setUploading(true);
    setProgress({ current: 0, total: files.length });
    const newPreviews: Array<{ title: string; data: PixelData }> = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { title, pixelData } = await imageToPattern(file);
        newPreviews.push({ title, data: pixelData });

        // PNG로 변환해서 Storage에 업로드
        const pngBlob = await pixelDataToBlob(pixelData);
        const filename = `${Date.now()}_${i}.png`;
        const storagePath = `${userId}/${filename}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("pattern-images")
          .upload(storagePath, pngBlob, { contentType: "image/png" });

        if (uploadError) throw uploadError;

        const imageUrl = supabase.storage
          .from("pattern-images")
          .getPublicUrl(storagePath).data.publicUrl;

        await supabase
          .from("patterns")
          .insert({
            user_id: userId,
            title: title || "새 도안",
            pixel_data: pixelData,
            image_url: imageUrl,
            is_public: false,
            is_legacy: false,
          });

        setProgress({ current: i + 1, total: files.length });
      }

      setPreviews(newPreviews);
      alert(`✅ ${files.length}개 도안을 저장했습니다!`);
      setTimeout(() => {
        setPreviews([]);
        window.location.href = "/mypage?tab=patterns";
      }, 2000);
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장 실패: " + (error as any).message);
      setPreviews([]);
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const generatePatterns = async () => {
    if (!selectedConcept.trim()) {
      alert("컨셉을 입력해주세요");
      return;
    }
    const count = parseInt(generateCount) || 3;
    if (count < 1 || count > 10) {
      alert("1~10개 사이로 입력해주세요");
      return;
    }

    setUploading(true);
    setProgress({ current: 0, total: count });

    try {
      const res = await fetch("/api/admin/generate-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: selectedConcept, count }),
      });

      if (!res.ok) throw new Error("생성 실패");
      const { patterns } = await res.json();

      const newPreviews: Array<{ title: string; data: PixelData }> = [];

      for (let i = 0; i < patterns.length; i++) {
        const pixelData = patterns[i];
        newPreviews.push({ title: `${selectedConcept} ${i + 1}`, data: pixelData });

        // PNG로 변환해서 Storage에 업로드
        const pngBlob = await pixelDataToBlob(pixelData);
        const filename = `${Date.now()}_${i}.png`;
        const storagePath = `${userId}/${filename}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("pattern-images")
          .upload(storagePath, pngBlob, { contentType: "image/png" });

        if (uploadError) throw uploadError;

        const imageUrl = supabase.storage
          .from("pattern-images")
          .getPublicUrl(storagePath).data.publicUrl;

        await supabase
          .from("patterns")
          .insert({
            user_id: userId,
            title: `${selectedConcept} ${i + 1}`,
            pixel_data: pixelData,
            image_url: imageUrl,
            is_public: false,
            is_legacy: false,
          });

        setProgress({ current: i + 1, total: patterns.length });
      }

      setPreviews(newPreviews);
      alert(`✅ ${patterns.length}개 도안을 생성했습니다!`);
      setTimeout(() => {
        setPreviews([]);
        window.location.href = "/mypage?tab=patterns";
      }, 2000);
    } catch (error) {
      console.error("생성 실패:", error);
      alert("생성 실패: " + (error as any).message);
      setPreviews([]);
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div style={S.container}>
      <h2 style={S.title}>👑 도안 관리</h2>

      {/* 모드 선택 */}
      <div style={S.modeToggle}>
        <button
          onClick={() => setMode("image")}
          style={{
            ...S.modeBtn,
            ...(mode === "image" ? S.modeBtnActive : {}),
          }}
          disabled={uploading}
        >
          🖼️ 이미지 업로드
        </button>
        <button
          onClick={() => setMode("generate")}
          style={{
            ...S.modeBtn,
            ...(mode === "generate" ? S.modeBtnActive : {}),
          }}
          disabled={uploading}
        >
          ✨ 자동 생성
        </button>
      </div>

      {mode === "image" ? (
        <>
          <p style={S.subtitle}>여러 이미지를 한 번에 45×45로 변환합니다</p>

          {/* 드래그 & 드롭 */}
          <div
            style={{
              ...S.dropZone,
              ...(dragActive ? S.dropZoneActive : {}),
              opacity: uploading ? 0.5 : 1,
              pointerEvents: uploading ? "none" : "auto",
            }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <div style={S.dropText}>🖼️ 이미지를 여기로 드래그하거나</div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              style={{ display: "none" }}
              id="imageInput"
              disabled={uploading}
            />
            <label htmlFor="imageInput" style={S.fileBtn}>
              {uploading ? "업로드 중..." : "파일 선택"}
            </label>
          </div>

          <div style={S.info}>
            <p>✓ 여러 이미지 동시 처리 가능</p>
            <p>✓ 지원 형식: PNG, JPG, GIF, WebP</p>
            <p>✓ 자동으로 45×45로 축소됩니다</p>
          </div>
        </>
      ) : (
        <>
          <p style={S.subtitle}>컨셉에 맞는 도안을 자동 생성합니다</p>

          <div style={S.generateBox}>
            <div style={S.generateLabel}>생성할 컨셉</div>
            <input
              type="text"
              value={selectedConcept}
              onChange={(e) => setSelectedConcept(e.target.value)}
              placeholder="예: 강아지, 고양이, 나비, 장미 등"
              style={S.generateInput}
              disabled={uploading}
            />

            <div style={{ ...S.generateLabel, marginTop: 16 }}>생성할 도안 개수</div>
            <div style={S.generateInputGroup}>
              <input
                type="number"
                min="1"
                max="10"
                value={generateCount}
                onChange={(e) => setGenerateCount(e.target.value)}
                style={S.generateInput}
                disabled={uploading}
              />
              <span style={S.generateUnit}>개</span>
            </div>
            <button
              onClick={generatePatterns}
              style={S.generateBtn}
              disabled={uploading}
            >
              {uploading ? "생성 중..." : "생성하기"}
            </button>
          </div>

          <div style={S.info}>
            <p>✓ 컨셉을 자유롭게 입력 가능</p>
            <p>✓ 1~10개 사이로 생성 가능</p>
            <p>✓ 자신의 계정에 도안이 저장됩니다</p>
          </div>
        </>
      )}

      {/* 진행 상황 */}
      {uploading && progress.total > 0 && (
        <div style={S.progressContainer}>
          <div style={S.progressText}>
            {progress.current} / {progress.total}
          </div>
          <div style={S.progressBar}>
            <div
              style={{
                ...S.progressFill,
                width: `${(progress.current / progress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* 프리뷰 */}
      {previews.length > 0 && (
        <div style={S.previewContainer}>
          <div style={S.previewTitle}>생성된 도안 ({previews.length}개)</div>
          <div style={S.previewGrid}>
            {previews.map((p, i) => (
              <div key={i} style={S.previewItem}>
                <PatternPreview pixelData={p.data} />
                <div style={S.previewLabel}>{p.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    background: "#fff",
    border: "1px solid var(--line-soft)",
    borderRadius: 16,
    padding: 32,
    maxWidth: 600,
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 24,
  },
  modeToggle: {
    display: "flex",
    gap: 8,
    marginBottom: 24,
    background: "var(--bg-soft)",
    padding: 4,
    borderRadius: 8,
  },
  modeBtn: {
    flex: 1,
    padding: "12px 16px",
    border: "none",
    background: "transparent",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    color: "var(--muted)",
    borderRadius: 6,
    transition: "all 0.2s",
  },
  modeBtnActive: {
    background: "#fff",
    color: "var(--accent)",
  },
  subtitle: {
    fontSize: 14,
    color: "var(--muted)",
    marginBottom: 24,
  },
  dropZone: {
    border: "2px dashed var(--line)",
    borderRadius: 12,
    padding: 48,
    textAlign: "center",
    transition: "all 0.2s",
    cursor: "pointer",
    marginBottom: 24,
  },
  dropZoneActive: {
    borderColor: "var(--accent)",
    backgroundColor: "var(--bg-soft)",
  },
  dropText: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--ink)",
    marginBottom: 12,
  },
  fileBtn: {
    background: "var(--accent)",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    display: "inline-block",
    border: "none",
  },
  generateBox: {
    background: "var(--bg-soft)",
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  generateLabel: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 12,
  },
  generateInputGroup: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  generateInput: {
    flex: 1,
    padding: "12px 16px",
    border: "1px solid var(--line)",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: "#fff",
    cursor: "pointer",
  } as React.CSSProperties,
  generateUnit: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--muted)",
  },
  generateBtn: {
    width: "100%",
    padding: "12px 16px",
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 12,
    color: "var(--muted)",
    marginBottom: 8,
    fontWeight: 600,
  },
  progressBar: {
    width: "100%",
    height: 8,
    background: "var(--bg-soft)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "var(--accent)",
    transition: "width 0.3s ease",
  },
  info: {
    fontSize: 13,
    color: "var(--muted)",
    lineHeight: 1.8,
  },
  previewContainer: {
    marginTop: 32,
    padding: 24,
    background: "var(--bg-soft)",
    borderRadius: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 16,
  },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
    gap: 12,
  },
  previewItem: {
    textAlign: "center",
  },
  previewLabel: {
    fontSize: 12,
    color: "var(--muted)",
    marginTop: 8,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
