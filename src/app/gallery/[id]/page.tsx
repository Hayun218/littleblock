// src/app/gallery/[id]/page.tsx — 작품 상세보기
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BeadUnit } from "@/components/BeadPattern";

export const dynamic = "force-dynamic";

type PixelData = { cols: number; rows: number; data: (string | null)[] };

export default async function GalleryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("patterns")
    .select("id, title, image_url, created_at, pixel_data, is_public, profiles(nickname)")
    .eq("id", id)
    .single();

  if (!p || !p.is_public) notFound();

  const pixelData = p.pixel_data as PixelData | null;
  const profilesRaw = p.profiles as unknown;
  const nickname = (Array.isArray(profilesRaw) ? profilesRaw[0] : profilesRaw as { nickname: string | null } | null)?.nickname ?? null;

  return (
    <>
      <Header />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 40px" }}>
        <Link href="/gallery" style={{ color: "var(--muted)", fontSize: 14, fontWeight: 600 }}>← 작품 목록</Link>

        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "16px 0 6px" }}>{p.title}</h1>
        <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 28 }}>
          by {nickname ?? "Unknown"}
        </div>

        <div style={{ display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* 디폼블럭 도안 미리보기 */}
          <div style={{ background: "#d4d4d4", borderRadius: 16, padding: 16, flexShrink: 0 }}>
            {pixelData?.data ? (
              <DeformPreviewLarge pixelData={pixelData} />
            ) : p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt={p.title} style={{ display: "block", maxWidth: 480, maxHeight: 480, imageRendering: "pixelated" }} />
            ) : (
              <div style={{ width: 240, height: 240, display: "grid", placeItems: "center", color: "var(--muted)" }}>이미지 없음</div>
            )}
          </div>

          {/* 정보 패널 */}
          <div style={{ flex: "1 1 220px" }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>등록일</div>
              <div style={{ fontWeight: 600 }}>{new Date(p.created_at).toLocaleDateString("ko-KR")}</div>
            </div>
            {pixelData && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>도안 크기</div>
                <div style={{ fontWeight: 600 }}>{pixelData.cols} × {pixelData.rows} 블록</div>
              </div>
            )}
            {pixelData && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>사용 색상</div>
                <ColorPalette data={pixelData.data} />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}


function DeformPreviewLarge({ pixelData }: { pixelData: PixelData }) {
  const { cols, rows, data } = pixelData;
  const maxPx = 440;
  const s = Math.max(8, Math.floor(maxPx / Math.max(cols, rows)));
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

function ColorPalette({ data }: { data: (string | null)[] }) {
  const colors = [...new Set(data.filter(Boolean) as string[])];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {colors.map((c) => (
        <div key={c} title={c} style={{
          width: 28, height: 28, borderRadius: 6,
          background: c,
          border: c === "#ffffff" ? "1px solid var(--line)" : "none",
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        }} />
      ))}
    </div>
  );
}
