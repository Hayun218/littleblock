// src/app/about/page.tsx — 리틀블럭 소개
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 40px" }}>
        <span style={{ color: "var(--accent)", fontWeight: 700 }}>About</span>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: "10px 0 24px", letterSpacing: -0.5 }}>
          상상을 현실로 만드는<br />블록 콘텐츠 브랜드
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.9, color: "#444b57" }}>
          리틀블럭은 누구나 픽셀 한 칸으로 자신만의 도안을 만들 수 있는 공간이에요.
          색을 고르고, 칸을 채우고, 작품으로 남기는 과정을 가장 쉽고 즐겁게 만드는 것이 목표예요.
        </p>
        <p style={{ fontSize: 17, lineHeight: 1.9, color: "#444b57", marginTop: 20 }}>
          만든 도안은 갤러리에 공개해 다른 사람들과 나누거나, 비공개로 나만 간직할 수 있어요.
          블록으로 표현하는 모든 상상을 응원합니다.
        </p>
        <a href="/editor" style={{ display: "inline-block", marginTop: 32, background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 16, padding: "13px 26px", borderRadius: 999 }}>
          지금 만들어보기
        </a>
      </main>
    </>
  );
}
