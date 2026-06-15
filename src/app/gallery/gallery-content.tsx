"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { BeadUnit } from "@/components/BeadPattern";

type PixelData = { cols: number; rows: number; data: (string | null)[] };
type Pattern = {
  id: string;
  title: string;
  image_url: string | null;
  created_at: string;
  view_count: number;
  pixel_data: PixelData | null;
  profiles: any;
};

type SortType = "latest" | "popular";

export default function GalleryContent({ patterns }: { patterns: Pattern[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortType, setSortType] = useState<SortType>("latest");

  const filtered = useMemo(() => {
    let result = patterns.filter((p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortType === "latest") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    }

    return result;
  }, [patterns, searchTerm, sortType]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 6px" }}>작품</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 36px" }}>
        리틀블럭 사용자들이 만든 픽셀 도안 작품들이에요.
      </p>

      {/* 검색 및 정렬 */}
      <div style={{ display: "flex", gap: 16, marginBottom: 36, flexWrap: "wrap", alignItems: "center" }}>
        {/* 검색창 */}
        <input
          type="text"
          placeholder="작품명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: "1 1 200px",
            minWidth: 200,
            padding: "10px 16px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
        />

        {/* 정렬 토글 */}
        <div style={{ display: "flex", gap: 8, background: "#f5f5f5", borderRadius: 8, padding: 4 }}>
          {[
            { type: "latest" as const, label: "최신순" },
            { type: "popular" as const, label: "인기순" },
          ].map((option) => (
            <button
              key={option.type}
              onClick={() => setSortType(option.type)}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 6,
                background: sortType === option.type ? "#fff" : "transparent",
                color: sortType === option.type ? "var(--accent)" : "var(--muted)",
                fontWeight: sortType === option.type ? 600 : 500,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 */}
      {filtered.length === 0 ? (
        <div style={{ padding: "100px 20px", textAlign: "center", color: "var(--muted)", border: "1px dashed var(--line)", borderRadius: 16 }}>
          {searchTerm ? "검색 결과가 없어요." : "아직 공개된 작품이 없어요."}
        </div>
      ) : (
        <>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
            총 {filtered.length}개의 작품
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
            {filtered.map((p) => {
              const profilesRaw = p.profiles;
              const nickname: string | null = (Array.isArray(profilesRaw) ? profilesRaw[0] : profilesRaw)?.nickname ?? null;
              return (
                <Link key={p.id} href={`/gallery/${p.id}`} style={{ border: "1px solid var(--line-soft)", borderRadius: 16, overflow: "hidden", background: "#fff", display: "block", transition: "box-shadow 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
                  <div style={{ width: "100%", aspectRatio: "1", background: "#f5f5f5", display: "grid", placeItems: "center", overflow: "hidden", padding: 8 }}>
                    {p.pixel_data?.data ? (
                      <BeadPreview pixelData={p.pixel_data} maxPx={180} />
                    ) : p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 13 }}>이미지 없음</span>
                    )}
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      by {nickname ?? "Unknown"} · 조회수 {p.view_count || 0}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

function BeadPreview({ pixelData, maxPx }: { pixelData: PixelData; maxPx: number }) {
  const { cols, rows, data } = pixelData;
  const s = Math.max(4, Math.floor(maxPx / Math.max(cols, rows)));
  const w = cols * s;
  const h = rows * s;

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <rect x={0} y={0} width={w} height={h} fill="#fff" />
      {data.map((color, i) => {
        if (!color) return null;
        const cx = (i % cols) * s + s / 2;
        const cy = Math.floor(i / cols) * s + s / 2;
        return <BeadUnit key={i} cx={cx} cy={cy} s={s} color={color} />;
      })}
    </svg>
  );
}
