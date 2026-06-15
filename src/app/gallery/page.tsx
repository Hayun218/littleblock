// src/app/gallery/page.tsx — 작품 갤러리 (공개 도안, 디폼블럭 스타일)
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { BeadUnit } from "@/components/BeadPattern";

export const dynamic = "force-dynamic";

type PixelData = { cols: number; rows: number; data: (string | null)[] };
type Pattern = {
  id: string;
  title: string;
  image_url: string | null;
  created_at: string;
  pixel_data: PixelData | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any;
};

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patterns")
    .select("id, title, image_url, created_at, pixel_data, profiles(nickname)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(120);
  const list = (data ?? []) as Pattern[];

  return (
    <>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 6px" }}>작품</h1>
        <p style={{ color: "var(--muted)", margin: "0 0 36px" }}>
          리틀블럭 사용자들이 만든 픽셀 도안 작품들이에요.
        </p>

        {list.length === 0 ? (
          <div style={{ padding: "100px 20px", textAlign: "center", color: "var(--muted)", border: "1px dashed var(--line)", borderRadius: 16 }}>
            아직 공개된 작품이 없어요.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
            {list.map((p) => {
              const profilesRaw = p.profiles;
              const nickname: string | null = (Array.isArray(profilesRaw) ? profilesRaw[0] : profilesRaw)?.nickname ?? null;
              return (
                <Link key={p.id} href={`/gallery/${p.id}`} style={{ border: "1px solid var(--line-soft)", borderRadius: 16, overflow: "hidden", background: "#fff", display: "block" }}>
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
                    by {nickname ?? "Unknown"}
                  </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
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

