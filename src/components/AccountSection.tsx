// src/components/AccountSection.tsx — 계정 정보 (닉네임 수정 + 탈퇴)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function AccountSection({
  email,
  initialNickname,
}: {
  email: string;
  initialNickname: string;
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [saved, setSaved] = useState(initialNickname);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const save = async () => {
    if (!nickname.trim()) { setMsg({ type: "err", text: "닉네임을 입력해주세요." }); return; }
    setLoading(true); setMsg(null);
    const res = await fetch("/api/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setMsg({ type: "err", text: json.error }); return; }
    setSaved(json.nickname);
    setMsg({ type: "ok", text: "저장되었어요!" });
  };

  return (
    <div style={S.wrap}>
      {/* ── 기본 정보 ── */}
      <section style={S.section}>
        <h2 style={S.heading}>기본 정보</h2>

        <div style={S.field}>
          <label style={S.label}>이메일</label>
          <div style={S.readOnly}>{email}</div>
          <p style={S.hint}>이메일은 변경할 수 없어요.</p>
        </div>

        <div style={S.field}>
          <label style={S.label}>닉네임</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={S.input}
              value={nickname}
              maxLength={20}
              placeholder="작품에 표시될 이름"
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <button style={S.saveBtn} onClick={save} disabled={loading || nickname === saved}>
              {loading ? "저장 중…" : "저장"}
            </button>
          </div>
          <p style={S.hint}>갤러리에 게시자 이름으로 표시돼요. (최대 20자)</p>
          {msg && (
            <p style={{ ...S.hint, color: msg.type === "ok" ? "#1f7a3d" : "var(--accent-ink)", fontWeight: 600, marginTop: 6 }}>
              {msg.type === "ok" ? "✓ " : "✕ "}{msg.text}
            </p>
          )}
        </div>
      </section>

      {/* ── 보안 ── */}
      <section style={S.section}>
        <h2 style={S.heading}>보안</h2>
        <div style={S.field}>
          <label style={S.label}>비밀번호</label>
          <PasswordReset email={email} />
        </div>
      </section>

      {/* ── 계정 탈퇴 (하단 조용하게) ── */}
      <div style={S.withdrawRow}>
        <DeleteAccount email={email} />
      </div>
    </div>
  );
}

/* ── 비밀번호 재설정 ── */
function PasswordReset({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <p style={{ fontSize: 14, color: "#1f7a3d", fontWeight: 600, margin: 0 }}>
        ✓ {email}으로 재설정 링크를 보냈어요.
      </p>
    );
  }

  return (
    <div>
      <button style={S.outlineBtn} onClick={send} disabled={loading}>
        {loading ? "전송 중…" : "비밀번호 재설정 이메일 보내기"}
      </button>
      <p style={S.hint}>{email}으로 링크가 발송돼요.</p>
    </div>
  );
}

/* ── 계정 탈퇴 (2단계 확인) ── */
function DeleteAccount({ email }: { email: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);

  const doDelete = async () => {
    setStep("deleting");
    const res = await fetch("/api/account/delete", { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "오류가 발생했어요.");
      setStep("confirm"); return;
    }
    await createClient().auth.signOut();
    router.push("/");
  };

  if (step === "idle") {
    return (
      <button style={S.withdrawLink} onClick={() => setStep("confirm")}>
        계정 탈퇴
      </button>
    );
  }

  return (
    <div style={S.confirmBox}>
      <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>
        탈퇴 전에 확인해주세요
      </p>
      <p style={{ ...S.hint, margin: "0 0 4px" }}>
        • 계정 정보(이메일, 닉네임)가 삭제돼요.
      </p>
      <p style={{ ...S.hint, margin: "0 0 14px" }}>
        • 지금까지 만든 <strong>도안은 갤러리에 그대로 남아요.</strong> 탈퇴 전에 삭제하고 싶은 도안이 있다면 먼저 삭제해주세요.
      </p>
      {error && <p style={{ fontSize: 13, color: "#b91c1c", margin: "0 0 8px" }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={{ ...S.dangerBtn, opacity: step === "deleting" ? 0.6 : 1 }}
          onClick={doDelete}
          disabled={step === "deleting"}
        >
          {step === "deleting" ? "탈퇴 중…" : "탈퇴하기"}
        </button>
        <button style={S.cancelBtn} onClick={() => { setStep("idle"); setError(null); }}>
          취소
        </button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 560, display: "flex", flexDirection: "column", gap: 0 },

  section: { paddingBottom: 32, marginBottom: 32, borderBottom: "1px solid var(--line-soft)" },
  heading: { fontSize: 17, fontWeight: 800, margin: "0 0 18px", letterSpacing: -0.2 },

  field: { marginBottom: 22 },
  label: {
    display: "block", fontSize: 12, fontWeight: 700,
    color: "var(--muted)", marginBottom: 7,
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  readOnly: {
    fontSize: 15, padding: "11px 14px",
    background: "var(--bg-soft)", border: "1px solid var(--line-soft)",
    borderRadius: 10, color: "var(--ink)",
  },
  input: {
    flex: 1, width: "100%", fontSize: 15, padding: "11px 14px",
    border: "1px solid var(--line)", borderRadius: 10,
    outline: "none", fontFamily: "inherit",
  },
  saveBtn: {
    flexShrink: 0, padding: "11px 20px",
    background: "var(--accent)", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
  outlineBtn: {
    padding: "10px 16px", background: "#fff",
    border: "1px solid var(--line)", borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--ink)",
  },
  hint: { fontSize: 13, color: "var(--muted)", margin: "5px 0 0", lineHeight: 1.5 },

  // 탈퇴 하단 영역
  withdrawRow: {
    paddingTop: 32,
    marginTop: 4,
    borderTop: "1px solid var(--line-soft)",
  },
  withdrawLink: {
    background: "none", border: "none", padding: 0,
    fontSize: 13, color: "#aaa",
    cursor: "pointer", fontFamily: "inherit",
    textDecoration: "underline", textDecorationColor: "#ddd",
    textUnderlineOffset: 3,
  },

  // 탈퇴 확인 박스
  confirmBox: {
    marginTop: 12,
    padding: "16px 18px",
    background: "var(--bg-soft)",
    borderRadius: 12,
    border: "1px solid var(--line-soft)",
  },
  dangerBtn: {
    padding: "9px 16px", background: "#dc2626", color: "#fff",
    border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
  },
  cancelBtn: {
    padding: "9px 14px", background: "#fff",
    border: "1px solid var(--line)", borderRadius: 9,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
};
