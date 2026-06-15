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

export default Footer;
