"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import Header from "@/components/Header";

type Step = "loading" | "form" | "done" | "error";

export default function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStep("form");
      } else if (event === "SIGNED_IN" && step === "loading") {
        setStep("form");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStep("form");
      } else {
        setTimeout(() => {
          setStep((prev) => prev === "loading" ? "error" : prev);
        }, 3000);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!password) { setMsg("새 비밀번호를 입력해주세요."); return; }
    if (password.length < 6) { setMsg("비밀번호는 6자 이상이어야 해요."); return; }
    if (password !== confirm) { setMsg("비밀번호가 일치하지 않아요."); return; }

    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMsg(error.message.includes("same password")
        ? "이전과 다른 비밀번호를 사용해주세요."
        : "오류가 발생했어요. 다시 시도해주세요.");
      return;
    }

    setStep("done");
    setTimeout(() => router.push("/"), 2500);
  };

  return (
    <>
      <Header />
      <main style={{ maxWidth: 380, margin: "60px auto", padding: "0 24px" }}>

        {step === "loading" && (
          <div style={{ textAlign: "center", paddingTop: 40, color: "var(--muted)" }}>
            인증 확인 중…
          </div>
        )}

        {step === "error" && (
          <>
            <h1 style={S.title}>링크가 만료됐어요</h1>
            <p style={S.sub}>
              비밀번호 재설정 링크는 1시간 동안만 유효해요.
              아래 버튼을 눌러 새 링크를 요청해주세요.
            </p>
            <button style={S.btn} onClick={() => router.push("/login?forgot=1")}>
              비밀번호 재설정 다시 요청
            </button>
          </>
        )}

        {step === "form" && (
          <>
            <h1 style={S.title}>새 비밀번호 설정</h1>
            <p style={S.sub}>6자 이상의 새 비밀번호를 입력해주세요.</p>

            <label style={S.lbl}>새 비밀번호</label>
            <input
              style={S.inp}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
              autoFocus
            />

            <label style={{ ...S.lbl, marginTop: 14 }}>비밀번호 확인</label>
            <input
              style={{
                ...S.inp,
                borderColor: confirm && password !== confirm ? "#ef4444" : undefined,
              }}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="다시 입력"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            {confirm && password !== confirm && (
              <p style={{ fontSize: 13, color: "#ef4444", marginTop: 4 }}>
                비밀번호가 일치하지 않아요.
              </p>
            )}

            <button
              style={{ ...S.btn, opacity: loading ? 0.6 : 1 }}
              onClick={submit}
              disabled={loading}
            >
              {loading ? "변경 중…" : "비밀번호 변경"}
            </button>

            {msg && (
              <p style={{ fontSize: 14, color: "#b91c1c", marginTop: 14 }}>{msg}</p>
            )}
          </>
        )}

        {step === "done" && (
          <>
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 16 }}>✓</div>
            <h1 style={{ ...S.title, textAlign: "center" }}>비밀번호 변경 완료</h1>
            <p style={{ ...S.sub, textAlign: "center" }}>
              잠시 후 홈으로 이동해요.
            </p>
          </>
        )}

      </main>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  title: { fontSize: 24, fontWeight: 800, marginBottom: 6 },
  sub: { color: "var(--muted)", marginBottom: 24, fontSize: 15, lineHeight: 1.6 },
  lbl: {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "var(--muted)", marginBottom: 6,
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
};
