// src/app/login/page.tsx — 로그인 / 가입 / 비밀번호 찾기
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import Header from "@/components/Header";

type Mode = "login" | "signup" | "forgot";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const go = (m: Mode) => { setMode(m); setMsg(null); };

  const submit = async () => {
    setMsg(null);
    if (!email.trim()) { setMsg({ type: "err", text: "이메일을 입력해주세요." }); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        if (!password) { setMsg({ type: "err", text: "비밀번호를 입력해주세요." }); return; }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();

      } else if (mode === "signup") {
        if (!password) { setMsg({ type: "err", text: "비밀번호를 입력해주세요." }); return; }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg({ type: "ok", text: "가입 완료! 이메일 인증이 필요한 경우 메일을 확인해주세요." });
        router.push(next);
        router.refresh();

      } else {
        // forgot password — 이메일로 재설정 링크 발송
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMsg({
          type: "ok",
          text: `${email} 으로 비밀번호 재설정 링크를 보냈어요. 메일함(스팸 포함)을 확인해주세요.`,
        });
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setMsg({ type: "err", text: translateError(err.message ?? "오류가 발생했어요.") });
    } finally {
      setLoading(false);
    }
  };

  /* ── forgot 모드: 이메일만 입력하는 심플 화면 ── */
  if (mode === "forgot") {
    return (
      <main style={S.wrap}>
        <button onClick={() => go("login")} style={S.backBtn}>← 로그인으로</button>

        <h1 style={S.title}>비밀번호 재설정</h1>
        <p style={S.sub}>
          가입한 이메일을 입력하면 재설정 링크를 보내드려요.
        </p>

        <label style={S.lbl}>이메일</label>
        <input
          style={S.inp}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
        />

        <button style={S.btn} onClick={submit} disabled={loading || !!msg?.type.includes("ok")}>
          {loading ? "전송 중…" : "재설정 링크 보내기"}
        </button>

        {msg && (
          <p style={{ ...S.msgBase, color: msg.type === "ok" ? "#1f7a3d" : "#b91c1c" }}>
            {msg.type === "ok" ? "✓ " : "✕ "}{msg.text}
          </p>
        )}

        {/* 이메일 자체를 모르는 경우 안내 */}
        <div style={S.helpBox}>
          <p style={S.helpTitle}>이메일도 기억나지 않으시나요?</p>
          <p style={S.helpText}>
            리틀블럭은 이메일로만 가입할 수 있어요. 가입 당시 사용한 이메일을 찾아보거나,
            새 이메일로 <button onClick={() => go("signup")} style={S.inlineLink}>다시 가입</button>
            할 수 있어요.
          </p>
        </div>
      </main>
    );
  }

  /* ── login / signup 공통 화면 ── */
  return (
    <main style={S.wrap}>
      <h1 style={S.title}>
        {mode === "login" ? "로그인" : "회원가입"}
      </h1>
      <p style={S.sub}>도안을 만들고 저장하려면 로그인하세요.</p>

      <label style={S.lbl}>이메일</label>
      <input
        style={S.inp}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoFocus
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 0 6px" }}>
        <label style={{ ...S.lbl, margin: 0 }}>비밀번호</label>
        {mode === "login" && (
          <button onClick={() => go("forgot")} style={S.forgotBtn}>
            비밀번호를 잊으셨나요?
          </button>
        )}
      </div>
      <input
        style={S.inp}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === "signup" ? "6자 이상" : "비밀번호"}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />

      <button style={S.btn} onClick={submit} disabled={loading}>
        {loading ? "처리 중…" : mode === "login" ? "로그인" : "가입하기"}
      </button>

      {msg && (
        <p style={{ ...S.msgBase, color: msg.type === "ok" ? "#1f7a3d" : "#b91c1c" }}>
          {msg.type === "ok" ? "✓ " : "✕ "}{msg.text}
        </p>
      )}

      <p style={{ marginTop: 20, fontSize: 14, color: "var(--muted)", textAlign: "center" }}>
        {mode === "login" ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
        <button
          onClick={() => go(mode === "login" ? "signup" : "login")}
          style={S.inlineLink}
        >
          {mode === "login" ? "가입하기" : "로그인"}
        </button>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<div style={{ padding: 40 }}>불러오는 중...</div>}>
        <LoginForm />
      </Suspense>
    </>
  );
}

function translateError(m: string): string {
  if (m.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (m.includes("already registered") || m.includes("User already registered")) return "이미 가입된 이메일이에요. 로그인해주세요.";
  if (m.includes("at least 6")) return "비밀번호는 6자 이상이어야 해요.";
  if (m.includes("valid email")) return "올바른 이메일 형식이 아니에요.";
  if (m.includes("rate limit") || m.includes("too many")) return "요청이 너무 많아요. 잠시 후 다시 시도해주세요.";
  return m;
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: 380,
    margin: "60px auto",
    padding: "0 24px",
  },
  backBtn: {
    background: "none", border: "none", padding: 0,
    fontSize: 14, color: "var(--muted)", cursor: "pointer",
    fontFamily: "inherit", marginBottom: 20, display: "block",
  },
  title: { fontSize: 24, fontWeight: 800, marginBottom: 4 },
  sub: { color: "var(--muted)", marginBottom: 24, fontSize: 15 },
  lbl: {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "var(--muted)",
  },
  inp: {
    width: "100%", padding: "12px 14px",
    border: "1px solid var(--line)", borderRadius: 10,
    fontSize: 15, fontFamily: "inherit",
    boxSizing: "border-box",
  },
  btn: {
    width: "100%", marginTop: 24, padding: "13px",
    background: "var(--accent)", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
  },
  forgotBtn: {
    background: "none", border: "none", padding: 0,
    fontSize: 13, color: "var(--accent)", cursor: "pointer",
    fontFamily: "inherit", fontWeight: 500,
  },
  inlineLink: {
    background: "none", border: "none",
    color: "var(--accent)", fontWeight: 700, padding: 0,
    cursor: "pointer", fontFamily: "inherit", fontSize: "inherit",
  },
  msgBase: {
    fontSize: 14, marginTop: 14, lineHeight: 1.5,
  },
  // 이메일 모를 때 안내 박스
  helpBox: {
    marginTop: 28, padding: "16px 18px",
    background: "var(--bg-soft)", borderRadius: 12,
    border: "1px solid var(--line-soft)",
  },
  helpTitle: {
    fontSize: 13, fontWeight: 700, margin: "0 0 6px",
    color: "var(--ink)",
  },
  helpText: {
    fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.6,
  },
};
