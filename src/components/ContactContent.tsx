"use client";

import { useState } from "react";
import Header from "@/components/Header";

export default function ContactContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!name || !email || !message) { setErr("모든 항목을 입력해주세요."); return; }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      if (!res.ok) throw new Error("전송 실패");
      setDone(true);
    } catch (e: unknown) {
      const x = e as { message?: string };
      setErr("전송에 실패했어요: " + (x.message ?? "알 수 없는 오류"));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 40px" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 6px" }}>문의하기</h1>
        <p style={{ color: "var(--muted)", margin: "0 0 48px" }}>
          궁금한 점이나 제안을 남겨주세요. 확인 후 답변드릴게요.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>
          {/* 연락처 정보 */}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 32px", color: "var(--ink)" }}>연락처</h2>

            <div style={{ display: "flex", gap: 16, marginBottom: 40, alignItems: "flex-start" }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx={12} cy={10} r={3} />
              </svg>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>위치</h3>
                <p style={{ fontSize: 15, color: "var(--ink)", margin: 0, lineHeight: 1.6 }}>
                  대한민국 대구광역시
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 40, alignItems: "flex-start" }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }}>
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>연락처</h3>
                <p style={{ fontSize: 15, color: "var(--ink)", margin: 0 }}>
                  010-7686-7922
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }}>
                <rect x={2} y={4} width={20} height={16} rx={2} />
                <path d="M22 7l-10 5L2 7" />
              </svg>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>이메일</h3>
                <p style={{ fontSize: 15, color: "var(--ink)", margin: 0 }}>
                  lej0235@daum.net
                </p>
              </div>
            </div>
          </div>

          {/* 문의 폼 */}
          <div>
            {done ? (
              <div style={{ padding: "40px 24px", textAlign: "center", background: "#f3faf6", borderRadius: 16, color: "#1f7a3d", fontWeight: 600 }}>
                문의가 접수되었어요. 감사합니다!
              </div>
            ) : (
              <>
                <label style={lbl}>이름</label>
                <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
                <label style={lbl}>이메일</label>
                <input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                <label style={lbl}>문의 내용</label>
                <textarea style={{ ...inp, height: 140, resize: "vertical" }} value={message}
                  onChange={(e) => setMessage(e.target.value)} placeholder="문의하실 내용을 적어주세요." />
                <button style={btn} onClick={submit} disabled={sending}>
                  {sending ? "보내는 중..." : "문의 보내기"}
                </button>
                {err && <p style={{ color: "var(--accent-ink)", fontSize: 14, marginTop: 14 }}>{err}</p>}
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--muted)", margin: "16px 0 6px" };
const inp: React.CSSProperties = { width: "100%", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 15 };
const btn: React.CSSProperties = { width: "100%", marginTop: 26, padding: "14px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 999, fontSize: 16, fontWeight: 700 };
