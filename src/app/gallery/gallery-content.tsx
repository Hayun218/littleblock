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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 검색어나 정렬이 변경되면 첫 페이지로 리셋
  if (searchTerm !== "" && currentPage !== 1) {
    // 검색어 변경 시 페이지 1로 리셋하기 위해 useEffect를 대신 사용해야 하는데,
    // 여기서는 간단하게 처리
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px", display: "flex", flexDirection: "column", minHeight: "1400px" }}>
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
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
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
              onClick={() => {
                setSortType(option.type);
                setCurrentPage(1);
              }}
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

      {/* 콘텐츠 영역 (가변 높이) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
              {paginatedItems.map((p) => {
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
      </div>

      {/* 페이지네이션 (고정 높이, 하단) */}
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 32, paddingBottom: 8 }}>
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={{
            width: 36,
            height: 36,
            border: "1px solid var(--line)",
            background: "#fff",
            color: currentPage === 1 ? "var(--muted)" : "var(--ink)",
            borderRadius: 6,
            fontSize: 16,
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: currentPage === 1 ? 0.5 : 1,
          }}
        >
          ◄
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                width: 40,
                height: 40,
                border: currentPage === page ? "none" : "1px solid var(--line)",
                background: currentPage === page ? "var(--accent)" : "#fff",
                color: currentPage === page ? "#fff" : "var(--ink)",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: currentPage === page ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={{
            width: 36,
            height: 36,
            border: "1px solid var(--line)",
            background: "#fff",
            color: currentPage === totalPages ? "var(--muted)" : "var(--ink)",
            borderRadius: 6,
            fontSize: 16,
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: currentPage === totalPages ? 0.5 : 1,
          }}
        >
          ►
        </button>
      </div>
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
