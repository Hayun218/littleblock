// src/app/mypage/page.tsx — 마이페이지 (계정정보 + 내 도안)
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase-server";
import MineList from "@/components/MineList";
import AccountSection from "@/components/AccountSection";

export const dynamic = "force-dynamic";

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "account" } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage");

  // 프로필
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  // 내 도안
  const { data: patterns } = await supabase
    .from("patterns")
    .select("id, title, image_url, is_public, pixel_data, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const list = (patterns ?? []).map((p) => ({
    id: p.id, title: p.title, image_url: p.image_url,
    is_public: p.is_public,
    editable: !!p.pixel_data,
  }));

  return (
    <>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px" }}>

        {/* 페이지 헤더 */}
        <div style={S.pageHead}>
          <div style={S.avatar}>
            {(profile?.nickname ?? user.email ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={S.displayName}>{profile?.nickname ?? "(닉네임 없음)"}</div>
            <div style={S.email}>{user.email}</div>
          </div>
        </div>

        {/* 탭 */}
        <div style={S.tabs}>
          <a href="/mypage?tab=account" style={{ ...S.tab, ...(tab === "account" ? S.tabActive : {}) }}>
            계정 정보
          </a>
          <a href="/mypage?tab=patterns" style={{ ...S.tab, ...(tab === "patterns" ? S.tabActive : {}) }}>
            내 도안
            <span style={S.badge}>{list.length}</span>
          </a>
        </div>

        {/* 탭 내용 */}
        {tab === "account" ? (
          <AccountSection
            email={user.email ?? ""}
            initialNickname={profile?.nickname ?? ""}
          />
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <a href="/editor" style={S.newBtn}>+ 새로 만들기</a>
            </div>
            <MineList initial={list} />
          </div>
        )}
      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  pageHead: {
    display: "flex", alignItems: "center", gap: 18, marginBottom: 36,
    padding: "28px 32px", background: "#fff",
    border: "1px solid var(--line-soft)", borderRadius: 16,
  },
  avatar: {
    width: 56, height: 56, borderRadius: "50%",
    background: "var(--accent)", color: "#fff",
    display: "grid", placeItems: "center",
    fontSize: 22, fontWeight: 800, flexShrink: 0,
  },
  displayName: { fontSize: 20, fontWeight: 800, marginBottom: 4 },
  email: { fontSize: 14, color: "var(--muted)" },

  tabs: {
    display: "flex", gap: 4, marginBottom: 28,
    borderBottom: "2px solid var(--line-soft)",
  },
  tab: {
    padding: "10px 20px", fontSize: 15, fontWeight: 600,
    color: "var(--muted)", borderBottom: "2px solid transparent",
    marginBottom: -2, display: "flex", alignItems: "center", gap: 8,
  },
  tabActive: { color: "var(--ink)", borderBottomColor: "var(--accent)" },
  badge: {
    fontSize: 12, fontWeight: 700,
    background: "var(--bg-soft)", color: "var(--muted)",
    padding: "2px 8px", borderRadius: 999,
  },
  newBtn: {
    background: "var(--accent)", color: "#fff",
    padding: "10px 18px", borderRadius: 999, fontWeight: 700, fontSize: 15,
  },
};
