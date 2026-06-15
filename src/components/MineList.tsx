// src/components/MineList.tsx — 내 도안 카드 목록 (공개토글/수정/삭제/이름수정)
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((it) => it.id)));
    }
  };

  const bulkTogglePublic = async (toPublic: boolean) => {
    if (selected.size === 0) { alert("선택된 도안이 없습니다"); return; }
    setBusy("bulk");
    const selectedItems = items.filter((it) => selected.has(it.id));
    for (const it of selectedItems) {
      await supabase.from("patterns").update({ is_public: toPublic }).eq("id", it.id);
    }
    setBusy(null);
    setItems((prev) =>
      prev.map((p) => (selected.has(p.id) ? { ...p, is_public: toPublic } : p))
    );
    setSelected(new Set());
    alert(`${selectedItems.length}개 도안이 ${toPublic ? "공개" : "비공개"}로 변경되었습니다`);
  };

  const bulkDelete = async () => {
    if (selected.size === 0) { alert("선택된 도안이 없습니다"); return; }
    if (!confirm(`${selected.size}개 도안을 삭제할까요? 되돌릴 수 없어요.`)) return;
    setBusy("bulk");
    const selectedItems = items.filter((it) => selected.has(it.id));
    for (const it of selectedItems) {
      await supabase.from("patterns").delete().eq("id", it.id);
      const path = storagePathFromUrl(it.image_url);
      if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    }
    setBusy(null);
    setItems((prev) => prev.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
    setEditMode(false);
    alert(`${selectedItems.length}개 도안이 삭제되었습니다`);
  };

  if (items.length === 0) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center", color: "var(--muted)" }}>
        아직 만든 도안이 없어요. <a href="/editor" style={{ color: "var(--accent)", fontWeight: 700 }}>첫 도안 만들기</a>
      </div>
    );
  }

  return (
    <div>
      {/* 편집 모드 헤더 */}
      {editMode ? (
        <div style={S.editHeader}>
          <div style={S.editInfo}>
            <input
              type="checkbox"
              checked={selected.size === items.length && items.length > 0}
              onChange={selectAll}
              style={{ cursor: "pointer", width: 18, height: 18 }}
            />
            <span style={{ fontWeight: 600 }}>
              {selected.size > 0 ? `${selected.size}개 선택` : "도안을 선택하세요"}
            </span>
          </div>

          {selected.size > 0 && (
            <div style={S.editActions}>
              <button style={S.btnEdit} onClick={() => bulkTogglePublic(true)} disabled={busy === "bulk"}>
                공개로
              </button>
              <button style={S.btnEdit} onClick={() => bulkTogglePublic(false)} disabled={busy === "bulk"}>
                비공개로
              </button>
              <button style={S.btnDelete} onClick={bulkDelete} disabled={busy === "bulk"}>
                {busy === "bulk" ? "삭제 중..." : "삭제"}
              </button>
            </div>
          )}

          <button style={S.btnClose} onClick={() => { setEditMode(false); setSelected(new Set()); }}>
            완료
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button style={S.btnText} onClick={() => setEditMode(true)}>
            편집
          </button>
          <Link href="/editor" style={S.newBtn}>
            + 새로 만들기
          </Link>
        </div>
      )}

      {/* 도안 목록 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20, marginTop: 20 }}>
        {items.map((it) => (
        <div key={it.id} style={{ ...card, position: "relative", opacity: editMode && !selected.has(it.id) ? 0.6 : 1, transition: "opacity 0.2s" }}>
          {editMode && (
            <div style={S.checkbox}>
              <input
                type="checkbox"
                checked={selected.has(it.id)}
                onChange={() => toggleSelect(it.id)}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
            </div>
          )}

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
                  title={editMode ? undefined : "더블클릭해서 이름 수정"}
                  onDoubleClick={() => !editMode && startTitleEdit(it)}
                >
                  {it.title}
                </span>
              )}
              {!editMode && (
                <span style={{ fontSize: 12, padding: "3px 9px", borderRadius: 999, background: it.is_public ? "#e8f5ee" : "#f1f0ec", color: it.is_public ? "#1f7a3d" : "#888", flexShrink: 0 }}>
                  {it.is_public ? "공개" : "비공개"}
                </span>
              )}
            </div>

            {!editMode && (
              <div style={{ display: "flex", gap: 6 }}>
                <button style={btnSm} disabled={busy === it.id} onClick={() => togglePublic(it)}>
                  {it.is_public ? "비공개로" : "공개로"}
                </button>
                <button style={btnSm} onClick={() => router.push(`/editor?id=${it.id}`)}>
                  {it.editable ? "수정" : "정보수정"}
                </button>
                <button style={btnDanger} disabled={busy === it.id} onClick={() => remove(it)}>삭제</button>
              </div>
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { border: "1px solid var(--line-soft)", borderRadius: 16, overflow: "hidden", background: "#fff" };
const thumb: React.CSSProperties = { width: "100%", aspectRatio: "1", background: "var(--bg-soft)", display: "grid", placeItems: "center" };
const thumbImg: React.CSSProperties = { width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" };
const btnSm: React.CSSProperties = { flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 600, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "8px 12px", fontSize: 13, fontWeight: 600, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, color: "var(--accent-ink)", cursor: "pointer" };
const titleInput: React.CSSProperties = { flex: 1, fontWeight: 700, fontSize: 15, border: "1.5px solid var(--accent)", borderRadius: 6, padding: "2px 7px", outline: "none", fontFamily: "inherit", minWidth: 0 };

const S = {
  btnText: {
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid var(--line)",
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.2s",
  } as React.CSSProperties,
  newBtn: {
    background: "var(--accent)",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 15,
    textDecoration: "none",
    display: "inline-block",
  } as React.CSSProperties,
  editHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "16px 0",
    borderBottom: "1px solid var(--line-soft)",
    marginBottom: 20,
  } as React.CSSProperties,
  editInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flex: 1,
  } as React.CSSProperties,
  editActions: {
    display: "flex",
    gap: 8,
  } as React.CSSProperties,
  btnEdit: {
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  } as React.CSSProperties,
  btnDelete: {
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    background: "#fff",
    color: "var(--accent)",
    border: "1px solid var(--accent)",
    borderRadius: 8,
    cursor: "pointer",
  } as React.CSSProperties,
  btnClose: {
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    background: "#f1f0ec",
    color: "var(--ink)",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  } as React.CSSProperties,
  checkbox: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 10,
    background: "#fff",
    padding: "4px",
    borderRadius: 6,
    border: "1px solid var(--line)",
  } as React.CSSProperties,
};
