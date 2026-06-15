// src/components/Header.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

type NavItem = {
  href: string;
  label: string;
  external?: boolean;
  primary?: boolean;
};

const NAV: NavItem[] = [
  { href: "/about", label: "리틀블럭 소개" },
  { href: "/gallery", label: "작품" },
  { href: "https://sharelifeship.netlify.app/", label: "레이스 게임", external: true },
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
      <a href="/" style={S.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/lego-icon.png" alt="리틀블럭" style={S.brandLogo} />
        <span>리틀블럭</span>
      </a>

      <nav style={S.centerNav}>
        {NAV.map((n) => {
          const active = !n.external && pathname.startsWith(n.href);
          return (
            <a
              key={n.href}
              href={n.href}
              target={n.external ? "_blank" : undefined}
              rel={n.external ? "noopener noreferrer" : undefined}
              style={{
                ...S.navLink,
                ...(active ? S.navActive : {}),
              }}
            >
              {n.label}
            </a>
          );
        })}
      </nav>

      {/* 우측 영역 — 고정 너비로 레이아웃 점프 방지 */}
      <div style={S.right}>
        <a href="/editor" style={S.primary}>도안 만들기</a>
        {user === undefined ? (
          // 로딩 중: 같은 크기의 투명 플레이스홀더
          <div style={S.placeholder} aria-hidden />
        ) : user ? (
          <>
            <span style={S.sep} />
            <a href="/mypage" style={{
              ...S.navLink,
              ...(pathname.startsWith("/mypage") ? S.navActive : {}),
            }}>마이페이지</a>
            <button onClick={logout} style={S.logout}>로그아웃</button>
          </>
        ) : (
          <>
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
  brand: {
    display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
    fontSize: 21, fontWeight: 800, letterSpacing: -0.5, color: "var(--ink)",
    marginRight: 48,
  },
  brandLogo: { width: 28, height: 28, display: "block" },
  centerNav: { display: "flex", gap: 28, flexShrink: 0 },
  navLink: { fontSize: 15, color: "var(--ink)", fontWeight: 500 },
  navActive: { color: "var(--accent)", fontWeight: 700 },
  right: {
    display: "flex", alignItems: "center", gap: 12,
    flexShrink: 0,
    marginLeft: "auto",
    minWidth: 240,
    justifyContent: "flex-end",
  },
  placeholder: { width: 200, height: 36 },
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
