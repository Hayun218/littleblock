// src/components/MineList.tsx — 내 도안 카드 목록 (공개토글/수정/삭제/이름수정)
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const BUCKET = "pattern-images";

function storagePathFromUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : null;
}

type Item = {
  id: string;
  title: string;
  image_url: string | null;
  is_public: boolean;
  editable: boolean;
};

export default function MineList({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<Item[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startTitleEdit = (it: Item) => {
    setEditingId(it.id);
    setEditingTitle(it.title);
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const commitTitleEdit = async (id: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) { setEditingId(null); return; }
    const prev = items.find((p) => p.id === id);
    if (prev?.title === trimmed) { setEditingId(null); return; }
    setBusy(id);
    const { error } = await supabase.from("patterns").update({ title: trimmed }).eq("id", id);
    setBusy(null);
    setEditingId(null);
    if (error) { alert("이름 변경 실패: " + error.message); return; }
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, title: trimmed } : p)));
  };

  const togglePublic = async (it: Item) => {
    setBusy(it.id);
    const next = !it.is_public;
    const { error } = await supabase.from("patterns").update({ is_public: next }).eq("id", it.id);
    setBusy(null);
    if (error) { alert("변경 실패: " + error.message); return; }
    setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, is_public: next } : p)));
  };

  const remove = async (it: Item) => {
    if (!confirm(`'${it.title}' 도안을 삭제할까요? 되돌릴 수 없어요.`)) return;
    setBusy(it.id);
    const { error } = await supabase.from("patterns").delete().eq("id", it.id);
    setBusy(null);
    if (error) { alert("삭제 실패: " + error.message); return; }
    // storage 파일도 함께 삭제
    const path = storagePathFromUrl(it.image_url);
    if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    setItems((prev) => prev.filter((p) => p.id !== it.id));
  };

  if (items.length === 0) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center", color: "var(--muted)" }}>
        아직 만든 도안이 없어요. <a href="/editor" style={{ color: "var(--accent)", fontWeight: 700 }}>첫 도안 만들기</a>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
      {items.map((it) => (
        <div key={it.id} style={card}>
          <div style={thumb}>
            {it.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.image_url} alt={it.title} style={thumbImg} />
            )}
          </div>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
              {editingId === it.id ? (
                <input
                  ref={inputRef}
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => commitTitleEdit(it.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTitleEdit(it.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  style={titleInput}
                  disabled={busy === it.id}
                />
              ) : (
                <span
                  style={{ fontWeight: 700, fontSize: 15, cursor: "text", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title="더블클릭해서 이름 수정"
                  onDoubleClick={() => startTitleEdit(it)}
                >
                  {it.title}
                </span>
              )}
              <span style={{ fontSize: 12, padding: "3px 9px", borderRadius: 999, background: it.is_public ? "#e8f5ee" : "#f1f0ec", color: it.is_public ? "#1f7a3d" : "#888", flexShrink: 0 }}>
                {it.is_public ? "공개" : "비공개"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button style={btnSm} disabled={busy === it.id} onClick={() => togglePublic(it)}>
                {it.is_public ? "비공개로" : "공개로"}
              </button>
              <button style={btnSm} onClick={() => router.push(`/editor?id=${it.id}`)}>
                {it.editable ? "수정" : "정보수정"}
              </button>
              <button style={btnDanger} disabled={busy === it.id} onClick={() => remove(it)}>삭제</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const card: React.CSSProperties = { border: "1px solid var(--line-soft)", borderRadius: 16, overflow: "hidden", background: "#fff" };
const thumb: React.CSSProperties = { width: "100%", aspectRatio: "1", background: "var(--bg-soft)", display: "grid", placeItems: "center" };
const thumbImg: React.CSSProperties = { width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" };
const btnSm: React.CSSProperties = { flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 600, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "8px 12px", fontSize: 13, fontWeight: 600, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, color: "var(--accent-ink)", cursor: "pointer" };
const titleInput: React.CSSProperties = { flex: 1, fontWeight: 700, fontSize: 15, border: "1.5px solid var(--accent)", borderRadius: 6, padding: "2px 7px", outline: "none", fontFamily: "inherit", minWidth: 0 };
