// src/app/page.tsx — 홈 (히어로 + 인기 작품 미리보기 + CTA)
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase-server";
import { BeadUnit } from "@/components/BeadPattern";

export const dynamic = "force-dynamic";

type PixelData = { cols: number; rows: number; data: (string | null)[] };
type Pattern = { id: string; title: string; image_url: string | null; pixel_data: PixelData | null };

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patterns")
    .select("id, title, image_url, pixel_data")
    .eq("is_public", true)
    .order("view_count", { ascending: false })
    .limit(8);
  const popular = (data ?? []) as Pattern[];

  return (
    <>
      <Header />

      {/* 히어로 */}
      <section style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroText}>
            <span style={S.eyebrow}>상상을 현실로 만드는</span>
            <h1 style={S.heroTitle}>리틀 블럭입니다.</h1>
            <p style={S.heroSub}>
              픽셀 한 칸으로 나만의 도안을 그리고, 공유하고, 작품으로 만들어요.
              누구나 쉽게 시작할 수 있어요.
            </p>
            <div style={S.heroBtns}>
              <a href="/editor" style={S.btnPrimary}>도안 만들기</a>
              <a href="/gallery" style={S.btnGhost}>작품 구경하기</a>
            </div>
          </div>
          <div style={S.heroArt} aria-hidden />

        </div>
      </section>

      {/* 인기 작품 */}
      <section style={S.section}>
        <div style={S.sectionHead}>
          <h2 style={S.sectionTitle}>인기 있는 작품</h2>
          <a href="/gallery" style={S.moreLink}>전체 보기 →</a>
        </div>

        {popular.length === 0 ? (
          <div style={S.empty}>
            아직 공개된 작품이 없어요. <a href="/editor" style={{ color: "var(--accent)", fontWeight: 700 }}>첫 도안 만들기</a>
          </div>
        ) : (
          <div style={S.grid}>
            {popular.map((p) => (
              <a key={p.id} href={`/gallery/${p.id}`} style={S.card}>
                <div style={S.thumb}>
                  {p.pixel_data?.data ? (
                    <DeformThumb pixelData={p.pixel_data} />
                  ) : p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.title} style={S.thumbImg} />
                  ) : null}
                </div>
                <div style={S.cardTitle}>{p.title}</div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* CTA 띠 */}
      <section style={S.cta}>
        <h2 style={S.ctaTitle}>지금 나만의 블록 도안을 만들어보세요</h2>
        <p style={S.ctaSub}>로그인하면 바로 그리기를 시작할 수 있어요.</p>
        <a href="/editor" style={S.btnPrimaryLg}>도안 만들기 시작</a>
      </section>

    </>
  );
}

// 인기 작품 썸네일 - 디폼블럭 비드 SVG
function DeformThumb({ pixelData }: { pixelData: PixelData }) {
  const { cols, rows, data } = pixelData;
  const s = Math.max(4, Math.floor(160 / Math.max(cols, rows)));
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


const S: Record<string, React.CSSProperties> = {
  hero: { background: "linear-gradient(180deg, #fff 0%, #fff7f5 100%)", padding: "10px 0 0" },
  heroInner: {
    maxWidth: 1100, margin: "0 auto", padding: "56px 40px 72px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40, flexWrap: "wrap",
  },
  heroText: { flex: "1 1 360px", minWidth: 280 },
  eyebrow: { color: "var(--accent)", fontWeight: 700, fontSize: 15 },
  heroTitle: { fontSize: 46, fontWeight: 800, margin: "10px 0 18px", letterSpacing: -1, lineHeight: 1.1 },
  heroSub: { fontSize: 17, color: "#5b6270", lineHeight: 1.7, maxWidth: 440 },
  heroBtns: { display: "flex", gap: 12, marginTop: 28 },
  btnPrimary: { background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 16, padding: "13px 24px", borderRadius: 999 },
  btnGhost: { background: "#fff", color: "var(--ink)", fontWeight: 600, fontSize: 16, padding: "13px 24px", borderRadius: 999, border: "1px solid var(--line)" },
  heroArt: { flex: "0 0 auto", width: 340, height: 260, borderRadius: 24, backgroundImage: "url(/banner.jpg)", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.75, boxShadow: "0 10px 40px rgba(20,24,33,.07)" },

  section: { maxWidth: 1100, margin: "0 auto", padding: "64px 40px" },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 28 },
  sectionTitle: { fontSize: 26, fontWeight: 800, margin: 0 },
  moreLink: { color: "var(--muted)", fontSize: 15, fontWeight: 600 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 },
  card: { border: "1px solid var(--line-soft)", borderRadius: 16, overflow: "hidden", background: "#fff", display: "block" },
  thumb: { width: "100%", aspectRatio: "1", background: "#e8e8e8", display: "grid", placeItems: "center", overflow: "hidden", padding: 8 },
  thumbImg: { width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" },
  cardTitle: { padding: "12px 16px", fontWeight: 700, fontSize: 15 },
  empty: { padding: "80px 20px", textAlign: "center", color: "var(--muted)", border: "1px dashed var(--line)", borderRadius: 16 },

  cta: { background: "#fff7f5", textAlign: "center", padding: "72px 24px", marginTop: 20 },
  ctaTitle: { fontSize: 28, fontWeight: 800, margin: "0 0 10px" },
  ctaSub: { color: "#5b6270", fontSize: 16, margin: "0 0 26px" },
  btnPrimaryLg: { background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 17, padding: "15px 32px", borderRadius: 999 },
};
