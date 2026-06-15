// src/app/mine/page.tsx — 내 도안 (수정/공개토글/삭제)
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase-server";
import MineList from "@/components/MineList";

export const dynamic = "force-dynamic";

export default async function MinePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patterns")
    .select("id, title, image_url, is_public, pixel_data, created_at")
    .order("created_at", { ascending: false });

  const list = (data ?? []).map((p) => ({
    id: p.id, title: p.title, image_url: p.image_url,
    is_public: p.is_public,
    editable: !!p.pixel_data,   // 픽셀 데이터 있으면 그림 수정 가능
  }));

  return (
    <>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>내 도안</h1>
          <a href="/editor" style={{ background: "var(--accent)", color: "#fff", padding: "10px 18px", borderRadius: 999, fontWeight: 700, fontSize: 15 }}>새로 만들기</a>
        </div>
        <MineList initial={list} />
      </main>
    </>
  );
}
