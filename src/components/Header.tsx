// src/components/Header.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/gallery", label: "작품" },
  { href: "/about", label: "리틀블럭 소개" },
  { href: "/contact", label: "문의하기" },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  // undefined = 로딩 중 (아직 모름), null = 비로그인, User = 로그인
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header style={S.header}>
      <a href="/" style={S.brand}>리틀블럭</a>

      <nav style={S.centerNav}>
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <a key={n.href} href={n.href} style={{ ...S.navLink, ...(active ? S.navActive : {}) }}>
              {n.label}
            </a>
          );
        })}
      </nav>

      {/* 우측 영역 — 고정 너비로 레이아웃 점프 방지 */}
      <div style={S.right}>
        {user === undefined ? (
          // 로딩 중: 같은 크기의 투명 플레이스홀더
          <div style={S.placeholder} aria-hidden />
        ) : user ? (
          <>
            <a href="/editor" style={S.primary}>도안 만들기</a>
            <span style={S.sep} />
            <a href="/mypage" style={{
              ...S.navLink,
              ...(pathname.startsWith("/mypage") ? S.navActive : {}),
            }}>마이페이지</a>
            <button onClick={logout} style={S.logout}>로그아웃</button>
          </>
        ) : (
          <>
            <a href="/editor" style={S.primary}>도안 만들기</a>
            <span style={S.sep} />
            <a href="/login" style={S.navLink}>로그인</a>
          </>
        )}
      </div>
    </header>
  );
}

const S: Record<string, React.CSSProperties> = {
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 40px", height: 60,
    borderBottom: "1px solid var(--line-soft)",
    position: "sticky", top: 0,
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(10px)",
    zIndex: 20, gap: 24,
  },
  brand: { fontSize: 21, fontWeight: 800, letterSpacing: -0.5, flexShrink: 0, color: "var(--ink)" },
  centerNav: { display: "flex", gap: 28, flex: 1, justifyContent: "center" },
  navLink: { fontSize: 15, color: "var(--ink)", fontWeight: 500 },
  navActive: { color: "var(--accent)", fontWeight: 700 },
  right: {
    display: "flex", alignItems: "center", gap: 12,
    flexShrink: 0,
    // 로그인/비로그인 모두 비슷한 너비가 되도록 minWidth 확보
    minWidth: 260,
    justifyContent: "flex-end",
  },
  placeholder: { width: 240, height: 36 },
  primary: {
    fontSize: 14, fontWeight: 700, color: "#fff",
    background: "var(--accent)",
    padding: "8px 16px", borderRadius: 999,
    whiteSpace: "nowrap",
  },
  sep: {
    display: "block", width: 1, height: 18,
    background: "var(--line)", flexShrink: 0,
  },
  logout: {
    fontSize: 13, color: "var(--muted)",
    background: "transparent", border: "none",
    cursor: "pointer", padding: "4px 2px",
    fontFamily: "inherit",
  },
};
