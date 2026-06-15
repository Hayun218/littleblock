// src/app/editor/page.tsx — 에디터 (헤더 없이 전체화면 느낌)
import { Suspense } from "react";
import PixelEditor from "@/components/PixelEditor";

export default function EditorPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center", color: "#8a909c" }}>불러오는 중…</div>}>
      <PixelEditor />
    </Suspense>
  );
}
