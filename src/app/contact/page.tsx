// src/app/contact/page.tsx — 문의하기
"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase-browser";

export default function ContactPage() {
  const supabase = createClient();
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
      const { error } = await supabase.from("inquiries").insert({ name, email, message });
      if (error) throw error;
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
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "56px 40px" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 6px" }}>문의하기</h1>
        <p style={{ color: "var(--muted)", margin: "0 0 32px" }}>
          궁금한 점이나 제안을 남겨주세요. 확인 후 답변드릴게요.
        </p>

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
      </main>
    </>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--muted)", margin: "16px 0 6px" };
const inp: React.CSSProperties = { width: "100%", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 15 };
const btn: React.CSSProperties = { width: "100%", marginTop: 26, padding: "14px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 999, fontSize: 16, fontWeight: 700 };
