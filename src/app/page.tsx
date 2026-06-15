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
          <div style={S.heroArt} aria-hidden>
            <WoodenBlockArt />
          </div>
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

      <Footer />
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

// 목블럭 캐릭터 일러스트 (코딩으로 구현)
function WoodenBlockArt() {
  return (
    <svg width={320} height={220} viewBox="0 0 320 220" style={{ display: "block" }}>
      {/* 바닥 그림자 */}
      <ellipse cx={160} cy={210} rx={140} ry={8} fill="rgba(0,0,0,0.06)" />

      {/* === 왼쪽 그룹: 초록 큰 블록 + 노랑 작은 블록 === */}

      {/* 초록 큰 직육면체 */}
      <rect x={18} y={90} width={64} height={112} rx={6} fill="#3cb55a" />
      {/* 상단 면 */}
      <ellipse cx={50} cy={90} rx={32} ry={8} fill="#4fd470" />
      {/* 측면 음영 */}
      <rect x={18} y={90} width={8} height={112} rx={3} fill="rgba(0,0,0,0.10)" />
      {/* 눈 */}
      <circle cx={41} cy={138} r={4} fill="#1f2430" />
      <circle cx={59} cy={138} r={4} fill="#1f2430" />
      <circle cx={42} cy={137} r={1.5} fill="#fff" />
      <circle cx={60} cy={137} r={1.5} fill="#fff" />

      {/* 노랑 작은 정사각 블록 */}
      <rect x={84} y={136} width={46} height={66} rx={5} fill="#f6c81e" />
      <ellipse cx={107} cy={136} rx={23} ry={6} fill="#fde04a" />
      <rect x={84} y={136} width={7} height={66} rx={3} fill="rgba(0,0,0,0.09)" />
      {/* 눈 */}
      <circle cx={99} cy={162} r={3.5} fill="#1f2430" />
      <circle cx={115} cy={162} r={3.5} fill="#1f2430" />
      <circle cx={100} cy={161} r={1.2} fill="#fff" />
      <circle cx={116} cy={161} r={1.2} fill="#fff" />

      {/* === 오른쪽 그룹: 파랑 높은 기둥 + 빨강 원기둥 + 위 블록 탑 === */}

      {/* 파랑 직사각 기둥 */}
      <rect x={160} y={60} width={52} height={142} rx={5} fill="#3a8fd4" />
      <ellipse cx={186} cy={60} rx={26} ry={6.5} fill="#5aaee8" />
      <rect x={160} y={60} width={7} height={142} rx={3} fill="rgba(0,0,0,0.10)" />
      {/* 눈 */}
      <circle cx={178} cy={120} r={4} fill="#1f2430" />
      <circle cx={194} cy={120} r={4} fill="#1f2430" />
      <circle cx={179} cy={119} r={1.5} fill="#fff" />
      <circle cx={195} cy={119} r={1.5} fill="#fff" />

      {/* 빨강 원기둥 */}
      <rect x={218} y={86} width={54} height={116} rx={27} fill="#e11d2a" />
      <ellipse cx={245} cy={86} rx={27} ry={7} fill="#f54757" />
      {/* 원기둥 측면 광택 */}
      <rect x={218} y={86} width={10} height={116} rx={5} fill="rgba(255,255,255,0.12)" />
      {/* 눈 */}
      <circle cx={238} cy={136} r={4} fill="#1f2430" />
      <circle cx={254} cy={136} r={4} fill="#1f2430" />
      <circle cx={239} cy={135} r={1.5} fill="#fff" />
      <circle cx={255} cy={135} r={1.5} fill="#fff" />

      {/* 파랑 기둥 위 쌓인 블록들 */}
      {/* 회색 납작 블록 */}
      <rect x={152} y={36} width={68} height={26} rx={5} fill="#9daab8" />
      <ellipse cx={186} cy={36} rx={34} ry={7} fill="#b5c0cc" />

      {/* 노랑 납작 블록 */}
      <rect x={162} y={14} width={56} height={24} rx={5} fill="#f6c81e" />
      <ellipse cx={190} cy={14} rx={28} ry={6} fill="#fde04a" />

      {/* 파랑 반원 */}
      <path d="M168 14 Q190 -4 212 14 Z" fill="#3a8fd4" />
      <ellipse cx={190} cy={14} rx={22} ry={5} fill="#5aaee8" />

      {/* 빨강 납작 가로 블록 (파랑+빨강 사이에 걸친 것) */}
      <rect x={154} y={66} width={118} height={22} rx={5} fill="#e11d2a" />
      <ellipse cx={213} cy={66} rx={59} ry={6} fill="#f54757" />
    </svg>
  );
}

function Footer() {
  return (
    <footer style={S.footerOuter}>
      <div style={S.footerInner}>
        <div style={S.footerBrand}>
          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>리틀블럭</div>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "8px 0 14px" }}>
            상상을 현실로 만드는 블록 콘텐츠 브랜드
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <SnsIcon type="blog" />
            <SnsIcon type="instagram" />
          </div>
        </div>

        <div style={S.footerInfo}>
          <div style={S.footerSection}>
            <div style={S.footerLabel}>주소</div>
            <div style={S.footerValue}>대구광역시 동구 물하서로1길 18 1층</div>
          </div>
          <div style={S.footerSection}>
            <div style={S.footerLabel}>전화번호</div>
            <div style={S.footerValue}>053-965-7922</div>
          </div>
          <div style={S.footerSection}>
            <div style={S.footerLabel}>운영시간</div>
            <div style={S.footerValue}>10:00 ~ 16:00</div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>점심시간 12:00 ~ 13:30</div>
          </div>
        </div>
      </div>
      <div style={S.footerBottom}>
        © {new Date().getFullYear()} 공예배우미협동조합 · Powered by Sharelife
      </div>
    </footer>
  );
}

function SnsIcon({ type }: { type: "blog" | "instagram" }) {
  const style: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 8, border: "1px solid var(--line)",
    display: "grid", placeItems: "center", background: "#fff",
  };
  if (type === "blog") {
    return (
      <div style={style}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <rect x={3} y={3} width={18} height={18} rx={3} fill="#03C75A" />
          <text x={5} y={17} fontSize={11} fontWeight={700} fill="#fff" fontFamily="sans-serif">B</text>
        </svg>
      </div>
    );
  }
  return (
    <div style={style}>
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <rect x={2} y={2} width={20} height={20} rx={6} stroke="#1f2430" strokeWidth={1.8} />
        <circle cx={12} cy={12} r={4.5} stroke="#1f2430" strokeWidth={1.8} />
        <circle cx={17.5} cy={6.5} r={1.2} fill="#1f2430" />
      </svg>
    </div>
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
  heroArt: { flex: "0 0 auto", padding: 28, background: "#fff", borderRadius: 24, boxShadow: "0 10px 40px rgba(20,24,33,.07)" },

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

  footerOuter: { borderTop: "1px solid var(--line-soft)", marginTop: 0 },
  footerInner: {
    maxWidth: 1100, margin: "0 auto", padding: "44px 40px 32px",
    display: "flex", gap: 60, flexWrap: "wrap",
  },
  footerBrand: { flex: "0 0 220px" },
  footerInfo: { flex: 1, display: "flex", gap: 48, flexWrap: "wrap" },
  footerSection: { minWidth: 140 },
  footerLabel: { fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  footerValue: { fontSize: 14, fontWeight: 500, lineHeight: 1.5 },
  footerBottom: {
    maxWidth: 1100, margin: "0 auto", padding: "16px 40px 32px",
    fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--line-soft)",
  },
};
