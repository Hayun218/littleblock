// src/components/PixelEditor.tsx — 픽셀 에디터 (신규 작성 + 기존 도안 불러와 수정)
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { drawBeadOnCanvas } from "@/components/BeadPattern";

const PALETTE = [
  "#1b1b1b", "#ffffff", "#7d7d7d", "#e11d2a", "#f6c81e", "#e7e0b0",
  "#f47b20", "#8bc63f", "#1f7a3d", "#1c3faa", "#1ca0e3", "#5a2b91",
  "#a78bd6", "#f4b8cf", "#ef2b6b", "#9c5a23", "#d9a45b",
];
type Cell = string | null;
const BUCKET = "pattern-images";
const FIXED_CELL_SIZE = 24;

function storagePathFromUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : null;
}

export default function PixelEditor() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const supabase = createClient();

  const [cols, setCols] = useState(24);
  const [rows, setRows] = useState(24);
  const [cell, setCell] = useState(24);
  const [tool, setTool] = useState<"draw" | "erase" | "select">("draw");
  const [current, setCurrent] = useState(PALETTE[0]);
  const [data, setData] = useState<Cell[]>(() => Array(24 * 24).fill(null));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  const [title, setTitle] = useState("내 도안");
  const [isPublic, setIsPublic] = useState(false);
  const [oldImagePath, setOldImagePath] = useState<string | null>(null);
  const [notEditable, setNotEditable] = useState(false);
  const [clipboard, setClipboard] = useState<Cell[] | null>(null);
  const [expandDir, setExpandDir] = useState<"left" | "right" | "top" | "bottom">("right");
  const [selection, setSelection] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [clipboardRegion, setClipboardRegion] = useState<{ width: number; height: number; data: Cell[] } | null>(null);
  const painting = useRef(false);
  const pendingImageRef = useRef<{ src: Uint8ClampedArray; w: number; h: number } | null>(null);

  // ── 변경사항 추적 ────────────────────────────────────────
  const [isDirty, setIsDirty] = useState(false);
  const initialDataRef = useRef<Cell[] | null>(null);
  const initialTitleRef = useRef<string>("내 도안");
  const initialPublicRef = useRef<boolean>(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // ── Undo 히스토리 ──────────────────────────────────────
  const MAX_HISTORY = 50;
  const historyRef = useRef<Cell[][]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const pushHistory = useCallback((snapshot: Cell[]) => {
    historyRef.current.push([...snapshot]);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (!h.length) return;
    const prev = h.pop()!;
    setData(prev);
    setCanUndo(h.length > 0);
  }, []);

  // 이미지 불러오기 시 비드 패턴 감지 → 격자 변경 제안
  type PendingImport = {
    data: Cell[];          // 감지된 격자 크기로 샘플링한 결과
    detectedCols: number;
    detectedRows: number;
  };
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data: row, error } = await supabase
        .from("patterns")
        .select("id, title, image_url, pixel_data, is_public")
        .eq("id", editId)
        .single();
      if (error || !row) { alert("도안을 불러오지 못했어요."); router.push("/mine"); return; }

      const titleVal = row.title ?? "내 도안";
      const isPublicVal = !!row.is_public;

      setTitle(titleVal);
      setIsPublic(isPublicVal);
      initialTitleRef.current = titleVal;
      initialPublicRef.current = isPublicVal;

      const px = row.pixel_data as { cols: number; rows: number; data: Cell[] } | null;
      if (px && Array.isArray(px.data)) {
        setCols(px.cols); setRows(px.rows); setData(px.data);
        initialDataRef.current = [...px.data];
      } else {
        setNotEditable(true);
      }
      setOldImagePath(storagePathFromUrl(row.image_url));
      setLoading(false);
    })();
  }, [editId, supabase, router]);

  // Delete/Backspace 선택 영역 삭제
  const deleteSelection = useCallback(() => {
    if (notEditable || !selection) return;
    const { x1, y1, x2, y2 } = selection;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    pushHistory(data);
    const newData = [...data];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        newData[y * cols + x] = null;
      }
    }
    setData(newData);
    setSelection(null);
  }, [notEditable, selection, cols, data, pushHistory]);

  // 도구 변경 시 선택 표시 초기화
  useEffect(() => {
    if (tool !== "select") {
      setSelection(null);
    }
  }, [tool]);

  // 로딩 완료 후 초기값 설정 (새 도안인 경우)
  useEffect(() => {
    if (loading || editId) return;
    if (initialDataRef.current === null) {
      initialDataRef.current = [...data];
      initialTitleRef.current = title;
      initialPublicRef.current = isPublic;
    }
  }, [loading, editId, data, title, isPublic]);

  // 변경사항 감지
  useEffect(() => {
    if (loading || initialDataRef.current === null) return;

    const dataChanged = JSON.stringify(data) !== JSON.stringify(initialDataRef.current);
    const titleChanged = title !== initialTitleRef.current;
    const publicChanged = isPublic !== initialPublicRef.current;

    setIsDirty(dataChanged || titleChanged || publicChanged);
  }, [data, title, isPublic, loading]);

  // Ctrl+Z/C/V, Delete 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if (e.key === "c" && tool === "select" && selection) {
          e.preventDefault();
          copySelection();
        } else if (e.key === "v" && clipboardRegion) {
          e.preventDefault();
          // 선택 영역 시작점에 붙여넣기 또는 화면 중앙
          const pasteX = selection ? Math.min(selection.x1, selection.x2) : Math.floor(cols / 2);
          const pasteY = selection ? Math.min(selection.y1, selection.y2) : Math.floor(rows / 2);
          pasteSelection(pasteX, pasteY);
        }
      } else if ((e.key === "Delete" || e.key === "Backspace") && selection) {
        e.preventDefault();
        deleteSelection();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, tool, selection, clipboardRegion, cols, rows, notEditable, data, deleteSelection]);

  const paintAt = useCallback((i: number, saveHistory = false) => {
    if (notEditable) return;
    setData((prev) => {
      if (saveHistory) pushHistory(prev);
      const n = [...prev];
      n[i] = tool === "erase" ? null : current;
      return n;
    });
  }, [tool, current, notEditable, pushHistory]);

  const counts: Record<string, number> = {};
  PALETTE.forEach((h) => (counts[h] = 0));
  data.forEach((v) => { if (v && counts[v] !== undefined) counts[v]++; });

  // 일반 PNG 렌더 (저장 + 내보내기용)
  const renderCanvas = useCallback((scale: number) => {
    const cv = document.createElement("canvas");
    cv.width = cols * scale; cv.height = rows * scale;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
    data.forEach((v, i) => {
      if (!v) return;
      ctx.fillStyle = v;
      ctx.fillRect((i % cols) * scale, Math.floor(i / cols) * scale, scale, scale);
    });
    return cv;
  }, [cols, rows, data]);

  // 디폼블럭 비드 스타일 PNG (내보내기/인쇄)
  const renderBeadCanvas = useCallback(() => {
    const scale = 28; // 더 크게 렌더해서 디테일 살리기
    const cv = document.createElement("canvas");
    cv.width = cols * scale;
    cv.height = rows * scale;
    const ctx = cv.getContext("2d")!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);

    data.forEach((color, i) => {
      if (!color) return;
      drawBeadOnCanvas(ctx, (i % cols) * scale + scale / 2, Math.floor(i / cols) * scale + scale / 2, scale, color);
    });

    return cv;
  }, [cols, rows, data]);

  const resize = (nc: number, nr: number, direction: "top" | "bottom" | "left" | "right" = "right") => {
    if (notEditable) return;
    nc = Math.max(4, Math.min(60, nc || cols));
    nr = Math.max(4, Math.min(60, nr || rows));

    pushHistory(data);

    setData((prev) => {
      const n: Cell[] = Array(nc * nr).fill(null);

      let offsetX = 0, offsetY = 0;
      if (direction === "left") offsetX = nc - cols;
      if (direction === "top") offsetY = nr - rows;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const nx = x + offsetX;
          const ny = y + offsetY;
          if (nx >= 0 && nx < nc && ny >= 0 && ny < nr) {
            n[ny * nc + nx] = prev[y * cols + x];
          }
        }
      }
      return n;
    });
    setCols(nc); setRows(nr);
  };

  const copySelection = () => {
    if (notEditable || !selection) return;
    const { x1, y1, x2, y2 } = selection;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    const clipData: Cell[] = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        clipData.push(data[y * cols + x]);
      }
    }
    setClipboardRegion({ width: w, height: h, data: clipData });
    setSelection(null);
  };

  const pasteSelection = (pasteX: number, pasteY: number) => {
    if (notEditable || !clipboardRegion) return;
    pushHistory(data);
    const newData = [...data];
    const { width: w, height: h, data: clipData } = clipboardRegion;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = pasteX + x;
        const py = pasteY + y;
        if (px >= 0 && px < cols && py >= 0 && py < rows) {
          newData[py * cols + px] = clipData[y * w + x];
        }
      }
    }
    setData(newData);
    setTool("draw");
  };

  const clearAll = () => {
    if (notEditable) return;
    if (!confirm("전체를 지우시겠어요?")) return;
    pushHistory(data);
    setData(Array(cols * rows).fill(null));
  };

  /** 격자 크기(ec×er)로 이미지를 픽셀 데이터로 변환
   *  period/offsetX/offsetY 가 주어지면 위상-정렬 그리드 사용 */
  const sampleImage = (
    src: Uint8ClampedArray,
    imgW: number,
    imgH: number,
    ec: number,
    er: number,
    isBeadImage: boolean,
    period?: number,
    offsetX?: number,
    offsetY?: number,
  ): Cell[] => {
    const result: Cell[] = Array(ec * er).fill(null);

    for (let gy = 0; gy < er; gy++) {
      for (let gx = 0; gx < ec; gx++) {
        let x0: number, x1: number, y0: number, y1: number;

        if (period && offsetX !== undefined && offsetY !== undefined) {
          // 위상-정렬: 실제 비드 경계에 맞춘 셀
          x0 = Math.floor(offsetX + gx * period);
          x1 = Math.floor(offsetX + (gx + 1) * period);
          y0 = Math.floor(offsetY + gy * period);
          y1 = Math.floor(offsetY + (gy + 1) * period);
        } else {
          const cw = imgW / ec, ch = imgH / er;
          x0 = Math.floor(gx * cw); x1 = Math.floor((gx + 1) * cw);
          y0 = Math.floor(gy * ch); y1 = Math.floor((gy + 1) * ch);
        }

        x0 = Math.max(0, x0); x1 = Math.min(imgW, x1);
        y0 = Math.max(0, y0); y1 = Math.min(imgH, y1);
        if (x1 <= x0 || y1 <= y0) continue;

        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const halfW = Math.max((x1 - x0) / 2, 1);
        const halfH = Math.max((y1 - y0) / 2, 1);

        // 비드 이미지: 색상 히스토그램 기반 (가장 많은 픽셀의 색 선택)
        // 일반 이미지: 평균 색상
        if (isBeadImage) {
          const colorBins: Record<string, { r: number; g: number; b: number; count: number }> = {};
          let maxCount = 0, dominantColor = "#ffffff";

          for (let py = y0; py < y1; py++) {
            for (let px = x0; px < x1; px++) {
              const idx = (py * imgW + px) * 4;
              const pr = src[idx], pg = src[idx + 1], pb = src[idx + 2], pa = src[idx + 3];

              if (pa < 40) continue;

              const avg = (pr + pg + pb) / 3;
              const sat = Math.max(pr, pg, pb) - Math.min(pr, pg, pb);

              // 극도로 밝은 색(구멍) 제외
              if (avg > 220 && sat < 15) continue;

              const dist = Math.sqrt(((px - cx) / halfW) ** 2 + ((py - cy) / halfH) ** 2);
              // 외곽 기어 이빨만 제외 (내부 색상은 모두 포함)
              if (dist > 0.80) continue;

              // 색상을 양자화해서 비슷한 색끼리 그룹화
              const qr = Math.round(pr / 16) * 16;
              const qg = Math.round(pg / 16) * 16;
              const qb = Math.round(pb / 16) * 16;
              const key = `${qr},${qg},${qb}`;

              if (!colorBins[key]) colorBins[key] = { r: qr, g: qg, b: qb, count: 0 };
              colorBins[key].count++;
              if (colorBins[key].count > maxCount) {
                maxCount = colorBins[key].count;
                dominantColor = nearest(qr, qg, qb);
              }
            }
          }

          if (maxCount >= 2) {
            result[gy * ec + gx] = dominantColor;
          }
        } else {
          // 일반 이미지: 평균 색상
          let rSum = 0, gSum = 0, bSum = 0, coloredPx = 0, totalPx = 0;

          for (let py = y0; py < y1; py++) {
            for (let px = x0; px < x1; px++) {
              totalPx++;
              const idx = (py * imgW + px) * 4;
              const pr = src[idx], pg = src[idx + 1], pb = src[idx + 2], pa = src[idx + 3];

              if (pa < 40) continue;

              const avg = (pr + pg + pb) / 3;
              const sat = Math.max(pr, pg, pb) - Math.min(pr, pg, pb);

              if (avg > 210 && sat < 20) continue;

              rSum += pr; gSum += pg; bSum += pb; coloredPx++;
            }
          }

          if (totalPx > 0 && coloredPx >= totalPx * 0.02) {
            result[gy * ec + gx] = nearest(rSum / coloredPx, gSum / coloredPx, bSum / coloredPx);
          }
        }
      }
    }
    return result;
  };

  const onImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (notEditable) return;
    const file = e.target.files?.[0]; if (!file) return;
    const img = new Image();
    img.onload = () => {
      const big = document.createElement("canvas");
      big.width = img.width; big.height = img.height;
      const bctx = big.getContext("2d")!;
      bctx.imageSmoothingEnabled = false;
      bctx.drawImage(img, 0, 0);
      const src = bctx.getImageData(0, 0, img.width, img.height).data;

      // 비드 패턴 주기 + 위상 감지
      const period = detectBeadPeriod(src, img.width, img.height);
      let offsetX = 0, offsetY = 0;
      if (period) {
        const phase = detectBeadPhase(src, img.width, img.height, period);
        offsetX = phase.offsetX;
        offsetY = phase.offsetY;
      }
      // 격자 크기 = 전체 이미지 크기 / 비드 주기
      const dc = period ? Math.max(2, Math.round(img.width / period)) : 0;
      const dr = period ? Math.max(2, Math.round(img.height / period)) : 0;
      const beadDetected = period !== null && period >= 6 && period <= 120
        && dc >= 2 && dc <= 120 && dr >= 2 && dr <= 120
        && (dc !== cols || dr !== rows);

      if (beadDetected) {
        pendingImageRef.current = { src, w: img.width, h: img.height };
        const detectedData = sampleImage(src, img.width, img.height, dc, dr, true, period!, offsetX, offsetY);
        setPendingImport({ data: detectedData, detectedCols: dc, detectedRows: dr });
      } else {
        pushHistory(data);
        const isBeadImage = period !== null;
        const next = period
          ? sampleImage(src, img.width, img.height, cols, rows, isBeadImage, period, offsetX, offsetY)
          : sampleImage(src, img.width, img.height, cols, rows, isBeadImage);
        setData(next);
      }
    };
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  };

  const applyPendingImport = (useDetected: boolean) => {
    if (!pendingImport) return;
    pushHistory(data);
    if (useDetected) {
      setCols(pendingImport.detectedCols);
      setRows(pendingImport.detectedRows);
      setData(pendingImport.data);
    } else {
      // 원본 이미지의 비드 패턴을 먼저 감지 후, 각 비드의 순수 색상을 추출
      // 그것을 현재 격자 크기로 확대 (색상 혼탁 없음)
      const img = pendingImageRef.current;
      if (img) {
        const period = detectBeadPeriod(img.src, img.w, img.h);

        if (period && period >= 6 && period <= 120) {
          // 비드 패턴 감지 성공 → 비드 격자로 변환 후 확대
          const phase = detectBeadPhase(img.src, img.w, img.h, period);
          const detectedCols = Math.max(2, Math.round(img.w / period));
          const detectedRows = Math.max(2, Math.round(img.h / period));

          // 원본 비드 격자의 순수 색상 추출
          const detected = sampleImage(
            img.src, img.w, img.h,
            detectedCols, detectedRows,
            true, period, phase.offsetX, phase.offsetY
          );

          // 감지된 격자를 현재 격자 크기로 확대 (nearest-neighbor)
          const expanded: Cell[] = Array(cols * rows).fill(null);
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const srcX = Math.floor(x * detectedCols / cols);
              const srcY = Math.floor(y * detectedRows / rows);
              const srcIdx = Math.min(srcY * detectedCols + srcX, detected.length - 1);
              expanded[y * cols + x] = detected[srcIdx];
            }
          }
          setData(expanded);
        } else {
          // 비드 패턴 미감지 → 일반 이미지 축소
          const scaledCanvas = document.createElement("canvas");
          scaledCanvas.width = cols;
          scaledCanvas.height = rows;
          const scaledCtx = scaledCanvas.getContext("2d")!;
          scaledCtx.imageSmoothingEnabled = true;

          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = img.w;
          tempCanvas.height = img.h;
          const tempCtx = tempCanvas.getContext("2d")!;
          const imgData = tempCtx.createImageData(img.w, img.h);
          imgData.data.set(img.src);
          tempCtx.putImageData(imgData, 0, 0);

          scaledCtx.drawImage(tempCanvas, 0, 0, cols, rows);
          const scaledData = scaledCtx.getImageData(0, 0, cols, rows).data;

          const result: Cell[] = Array(cols * rows).fill(null);
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const idx = (y * cols + x) * 4;
              const r = scaledData[idx];
              const g = scaledData[idx + 1];
              const b = scaledData[idx + 2];
              const a = scaledData[idx + 3];

              if (a < 40) continue;
              result[y * cols + x] = nearest(r, g, b);
            }
          }
          setData(result);
        }
      }
      pendingImageRef.current = null;
    }
    setPendingImport(null);
  };

  const save = async (makePublic: boolean) => {
    const inputTitle = prompt("도안 제목을 입력하세요", title);
    if (inputTitle === null) return;
    setSaving(true);
    try {
      // 이미지 업로드 (클라이언트 storage — 서비스 키 불필요)
      let newImageUrl: string | null = null;
      let newImagePath: string | null = null;

      if (!notEditable) {
        const { data: { user: storageUser } } = await supabase.auth.getUser();
        if (!storageUser) { alert("로그인이 필요해요."); router.push("/login"); return; }

        const blob: Blob = await new Promise((res) =>
          renderCanvas(24).toBlob((b) => res(b!), "image/png")
        );
        const path = `${storageUser.id}/${Date.now()}.png`;
        const { error: upErr } = await supabase.storage.from(BUCKET)
          .upload(path, blob, { contentType: "image/png" });
        if (upErr) throw upErr;
        newImagePath = path;
        newImageUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }

      // DB 저장 — 서버 API 라우트 통해서 (서버에서 쿠키로 세션 읽음 → RLS 통과)
      if (editId) {
        const patch: Record<string, unknown> = {
          title: inputTitle || "내 도안",
          is_public: makePublic,
        };
        if (!notEditable) {
          patch.pixel_data = { cols, rows, data };
          patch.image_url = newImageUrl;
        }
        const res = await fetch(`/api/patterns/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }

        if (!notEditable && oldImagePath) {
          await supabase.storage.from(BUCKET).remove([oldImagePath]).catch(() => {});
        }
        initialDataRef.current = [...data];
        initialTitleRef.current = inputTitle || "내 도안";
        initialPublicRef.current = makePublic;
        setIsDirty(false);
        alert("수정했어요!");
      } else {
        const res = await fetch("/api/patterns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: inputTitle || "내 도안",
            image_url: newImageUrl,
            pixel_data: { cols, rows, data },
            is_public: makePublic,
          }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
        initialDataRef.current = [...data];
        initialTitleRef.current = inputTitle || "내 도안";
        initialPublicRef.current = makePublic;
        setIsDirty(false);
        alert(makePublic ? "공개로 게시했어요!" : "비공개로 저장했어요!");
      }
      router.push("/mine");
      router.refresh();
    } catch (e: unknown) {
      const err = e as { message?: string };
      alert("저장 실패: " + (err.message ?? "알 수 없는 오류"));
    } finally {
      setSaving(false);
    }
  };

  // 내보내기 (디폼블럭 비드 스타일 PNG)
  const exportPng = () => {
    const a = document.createElement("a");
    a.href = renderBeadCanvas().toDataURL("image/png");
    a.download = `${title || "littleblock"}.png`;
    a.click();
  };

  // 나가기 핸들러
  const handleExitContinue = () => {
    setShowExitModal(false);
  };

  const handleExitNow = () => {
    router.push("/mine");
  };

  const handleSaveAndExit = async () => {
    // 저장 함수와 동일하게 처리
    const inputTitle = prompt("도안 제목을 입력하세요", title);
    if (inputTitle === null) {
      setShowExitModal(false);
      return;
    }

    setSaving(true);
    try {
      let newImageUrl: string | null = null;
      let newImagePath: string | null = null;

      if (!notEditable) {
        const { data: { user: storageUser } } = await supabase.auth.getUser();
        if (!storageUser) { alert("로그인이 필요해요."); router.push("/login"); return; }

        const blob: Blob = await new Promise((res) =>
          renderCanvas(24).toBlob((b) => res(b!), "image/png")
        );
        const path = `${storageUser.id}/${Date.now()}.png`;
        const { error: upErr } = await supabase.storage.from(BUCKET)
          .upload(path, blob, { contentType: "image/png" });
        if (upErr) throw upErr;
        newImagePath = path;
        newImageUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }

      const finalTitle = inputTitle || "내 도안";
      if (editId) {
        const patch: Record<string, unknown> = {
          title: finalTitle,
          is_public: isPublic,
        };
        if (!notEditable) {
          patch.pixel_data = { cols, rows, data };
          patch.image_url = newImageUrl;
        }
        const res = await fetch(`/api/patterns/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }

        if (!notEditable && oldImagePath) {
          await supabase.storage.from(BUCKET).remove([oldImagePath]).catch(() => {});
        }
      } else {
        const res = await fetch("/api/patterns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: finalTitle,
            image_url: newImageUrl,
            pixel_data: { cols, rows, data },
            is_public: isPublic,
          }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      }

      setShowExitModal(false);
      router.push("/mine");
      router.refresh();
    } catch (e: unknown) {
      const err = e as { message?: string };
      alert("저장 실패: " + (err.message ?? "알 수 없는 오류"));
    } finally {
      setSaving(false);
    }
  };

  // 도안 영역만 인쇄
  const printPattern = () => {
    const cv = renderBeadCanvas();
    const dataUrl = cv.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${title} — 리틀블럭 도안</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #fff; gap: 12px; font-family: -apple-system, sans-serif; }
  h2 { font-size: 16px; font-weight: 700; color: #1f2430; }
  img { max-width: 100%; max-height: 90vh; image-rendering: pixelated; }
  @media print { body { min-height: auto; padding: 16px; justify-content: flex-start; } }
</style></head><body>
<h2>${title}</h2>
<img src="${dataUrl}" width="${cv.width}" height="${cv.height}" />
<script>window.onload = function() { window.print(); }<\/script>
</body></html>`);
    w.document.close();
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>도안을 불러오는 중…</div>;

  return (
    <div style={S.outer}>

      {/* ── 비드 격자 변경 제안 배너 ── */}
      {pendingImport && (
        <div style={S.importBanner}>
          <div style={S.importBannerInner}>
            <span style={{ fontSize: 18 }}>🔍</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14 }}>
                비드 패턴 이미지가 감지됐어요
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                실제 비드 수 <strong>{pendingImport.detectedCols} × {pendingImport.detectedRows}</strong>칸으로
                불러오면 더 정확해요. (현재 격자: {cols} × {rows})
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button style={S.importBtnPrimary} onClick={() => applyPendingImport(true)}>
                {pendingImport.detectedCols} × {pendingImport.detectedRows}로 변경
              </button>
              <button style={S.importBtnSecondary} onClick={() => applyPendingImport(false)}>
                현재 격자 유지
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={S.topbar}>
        <div style={S.topLeft}>
          <button
            onClick={() => {
              if (isDirty) {
                setShowExitModal(true);
              } else {
                router.push("/mine");
              }
            }}
            style={{ ...S.backLink, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "inherit" }}
          >
            ← 내 도안
          </button>
          <span style={S.divider}>|</span>
          <span>{editId ? "도안 수정" : "도안 만들기"}</span>
          {notEditable && <span style={S.badge}>이미지 도안 · 그림 편집 불가</span>}
          {!notEditable && (
            <button
              style={{ ...S.iconBtn, opacity: canUndo ? 1 : 0.35, fontSize: 13 }}
              onClick={undo}
              disabled={!canUndo}
              title="되돌리기 (Ctrl+Z)"
            >
              ↩ 되돌리기
            </button>
          )}
        </div>
        <div style={S.topRight}>
          {!notEditable && (
            <>
              <button style={S.iconBtn} onClick={exportPng} title="그리드 포함 PNG로 내보내기">🖼️ 내보내기</button>
              <button style={S.iconBtn} onClick={printPattern} title="도안 인쇄">🖨️ 인쇄</button>
            </>
          )}
          <button style={S.saveGhost} disabled={saving} onClick={() => save(false)}>
            {saving ? "저장 중…" : "비공개로 저장"}
          </button>
          <button style={S.savePrimary} disabled={saving} onClick={() => save(true)}>
            {saving ? "게시 중…" : "공개로 게시"}
          </button>
        </div>
      </div>

      <div style={S.body}>
        <aside style={S.side}>
          <button style={tool === "draw" ? S.toolOn : S.tool} onClick={() => setTool("draw")} disabled={notEditable}>✏️ 그리기</button>
          <button style={tool === "erase" ? S.toolOn : S.tool} onClick={() => setTool("erase")} disabled={notEditable}>🧽 지우기</button>
          <button style={tool === "select" ? S.toolOn : S.tool} onClick={() => setTool("select")} disabled={notEditable} title="드래그로 영역 선택 후 Ctrl+C 복사, Ctrl+V 붙여넣기">⬜ 선택</button>
          <label style={{ ...S.tool, opacity: notEditable ? 0.4 : 1 }}>🖼️ 이미지 불러오기
            <input type="file" accept="image/*" onChange={onImage} style={{ display: "none" }} disabled={notEditable} />
          </label>
          <button style={S.toolDanger} onClick={clearAll} disabled={notEditable}>🗑️ 전체 지우기</button>

          {notEditable ? (
            <p style={S.noteBox}>
              이 도안은 이미지로 등록되어 그림은 수정할 수 없어요.
              제목과 공개 여부만 위 버튼으로 변경할 수 있어요.
            </p>
          ) : (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
              <div style={S.sLbl}>캔버스 크기</div>

              {/* 스테퍼 UI */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {/* 행 */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 24 }}>행</span>
                  <button onClick={() => resize(cols, rows - 1, expandDir)} disabled={rows <= 4} style={S.stepperBtn}>−</button>
                  <div style={{ fontSize: 14, fontWeight: 600, minWidth: 40, textAlign: "center" }}>{rows}</div>
                  <button onClick={() => resize(cols, rows + 1, expandDir)} style={S.stepperBtn}>+</button>
                </div>

                {/* 열 */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 24 }}>열</span>
                  <button onClick={() => resize(cols - 1, rows, expandDir)} disabled={cols <= 4} style={S.stepperBtn}>−</button>
                  <div style={{ fontSize: 14, fontWeight: 600, minWidth: 40, textAlign: "center" }}>{cols}</div>
                  <button onClick={() => resize(cols + 1, rows, expandDir)} style={S.stepperBtn}>+</button>
                </div>
              </div>

              {/* 방향 선택 */}
              <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--line-soft)" }}>
                <div style={S.sLbl}>적용 방향</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <button onClick={() => setExpandDir("left")} style={{...S.directionBtn, background: expandDir === "left" ? "var(--accent)" : "#fff", color: expandDir === "left" ? "#fff" : "var(--ink)"}} title="좌측에서 확장">← 좌측</button>
                  <button onClick={() => setExpandDir("right")} style={{...S.directionBtn, background: expandDir === "right" ? "var(--accent)" : "#fff", color: expandDir === "right" ? "#fff" : "var(--ink)"}} title="우측에서 확장">우측 →</button>
                  <button onClick={() => setExpandDir("top")} style={{...S.directionBtn, background: expandDir === "top" ? "var(--accent)" : "#fff", color: expandDir === "top" ? "#fff" : "var(--ink)"}} title="위에서 확장">↑ 위</button>
                  <button onClick={() => setExpandDir("bottom")} style={{...S.directionBtn, background: expandDir === "bottom" ? "var(--accent)" : "#fff", color: expandDir === "bottom" ? "#fff" : "var(--ink)"}} title="아래에서 확장">아래 ↓</button>
                </div>
              </div>

              <div style={S.sLbl}>캔버스 크기</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="range" min={8} max={60} value={cols}
                  onChange={(e) => {
                    const newGridSize = +e.target.value;
                    resize(newGridSize, newGridSize, expandDir);
                  }} style={{ flex: 1 }} />
                <input type="number" min={8} max={60} value={cols}
                  onChange={(e) => {
                    let val = +e.target.value;
                    val = Math.max(8, Math.min(60, val));
                    resize(val, val, expandDir);
                  }} style={{...S.num, width: 50}} />
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0 0 0" }}>
                한 셀은 10mm 고정, 격자 개수만 조절됩니다.
              </p>

              {/* 선택 도구 단축키 안내 */}
              {(selection || clipboardRegion) && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line-soft)", fontSize: 12, color: "var(--muted)" }}>
                  <div style={S.sLbl}>단축키</div>
                  <div style={{ lineHeight: 1.6 }}>
                    {selection && <>Ctrl+C: 복사<br /></>}
                    {clipboardRegion && <>Ctrl+V: 붙여넣기<br /></>}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        <main style={S.stage}>
          {notEditable && oldImagePath ? (
            <div style={{ color: "var(--muted)" }}>이미지 도안은 미리보기를 지원하지 않아요.</div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, ${FIXED_CELL_SIZE}px)`,
              borderTop: "1px solid #d0d4dc",
              borderLeft: "1px solid #d0d4dc",
              background: "#fff",
              touchAction: "none",
              userSelect: "none",
            }}
              onPointerDown={(e) => {
                const t = e.target as HTMLElement;
                if (!t.dataset.i) return;
                painting.current = true;
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                const idx = +t.dataset.i;
                const x = idx % cols;
                const y = Math.floor(idx / cols);

                if (tool === "select") {
                  setSelection({ x1: x, y1: y, x2: x, y2: y });
                } else {
                  paintAt(idx, true);
                }
              }}
              onPointerMove={(e) => {
                if (!painting.current) return;
                const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
                if (!el?.dataset.i) return;
                const idx = +el.dataset.i;
                const x = idx % cols;
                const y = Math.floor(idx / cols);

                if (tool === "select") {
                  setSelection((prev) => prev ? { ...prev, x2: x, y2: y } : null);
                } else {
                  paintAt(idx);
                }
              }}
              onPointerUp={() => {
                painting.current = false;
              }}
            >
              {data.map((v, i) => {
                const x = i % cols;
                const y = Math.floor(i / cols);
                const isSelected = selection &&
                  x >= Math.min(selection.x1, selection.x2) &&
                  x <= Math.max(selection.x1, selection.x2) &&
                  y >= Math.min(selection.y1, selection.y2) &&
                  y <= Math.max(selection.y1, selection.y2);

                return (
                  <div key={i} data-i={i} style={{
                    width: FIXED_CELL_SIZE,
                    height: FIXED_CELL_SIZE,
                    borderRight: "1px solid #d0d4dc",
                    borderBottom: "1px solid #d0d4dc",
                    background: v ?? "#fff",
                    boxShadow: isSelected ? "inset 0 0 0 2px var(--accent)" : "none",
                    transition: "box-shadow 0.1s",
                  }} />
                );
              })}
            </div>
          )}
        </main>

        <section style={S.panel}>
          <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>색깔</h3>
          <div style={{ ...S.curSwatch, background: current }} />
          <div style={S.swatches}>
            {PALETTE.map((hex) => (
              <button key={hex} onClick={() => { setCurrent(hex); setTool("draw"); }} disabled={notEditable}
                style={{ ...S.sw, background: hex, borderColor: current === hex ? "var(--ink)" : (hex === "#ffffff" ? "var(--line)" : "transparent") }} />
            ))}
          </div>
          <h3 style={{ margin: "20px 0 10px", fontSize: 16 }}>컬러 카운팅</h3>
          <div style={S.counts}>
            {PALETTE.map((hex) => (
              <div key={hex} style={S.count}>
                <span style={{ ...S.dot, background: hex, borderColor: hex === "#ffffff" ? "var(--line)" : "transparent" }} />
                {counts[hex]}
              </div>
            ))}
          </div>
        </section>
      </div>

      <ExitModal
        show={showExitModal}
        onContinue={handleExitContinue}
        onExit={handleExitNow}
        onSaveAndExit={handleSaveAndExit}
        isSaving={saving}
      />
    </div>
  );
}


/**
 * 1D 신호의 자기상관으로 반복 주기를 찾는다.
 *
 * 하모닉 보정:
 *   자기상관은 실제 주기 P의 배수(P/2, P/3...)에서도 피크를 가짐.
 *   bestLag가 실제 주기의 1/2일 경우 2배로 보정.
 *
 * @returns 감지된 주기(px) 또는 null
 */
function findPeriodByAutocorr(signal: number[], minLag = 6, maxLag = 200): number | null {
  const N = signal.length;
  if (N < minLag * 3) return null;

  const mean = signal.reduce((a, b) => a + b, 0) / N;
  const c = signal.map(v => v - mean);
  const selfCorr = c.reduce((a, b) => a + b * b, 0) / N;
  if (selfCorr < 0.5) return null;

  // 자기상관 함수 계산 (전체 범위)
  const cap = Math.min(maxLag, Math.floor(N / 3));
  const corrs: number[] = new Array(cap + 1).fill(0);
  for (let lag = minLag; lag <= cap; lag++) {
    let corr = 0;
    const n = N - lag;
    for (let x = 0; x < n; x++) corr += c[x] * c[x + lag];
    corrs[lag] = corr / n;
  }

  // 최대 자기상관 lag 찾기
  let bestLag = minLag, bestCorr = -Infinity;
  for (let lag = minLag; lag <= cap; lag++) {
    if (corrs[lag] > bestCorr) { bestCorr = corrs[lag]; bestLag = lag; }
  }

  if (bestCorr / selfCorr <= 0.05) return null;

  // ── 하모닉 보정: bestLag가 실제 주기 P의 1/2일 가능성 체크 ──
  // 기어/링 비드의 내부 대칭 구조로 P/2에서 자기상관이 더 높게 나올 수 있음.
  // 하지만 2배 보정은 신중하게: 이미지가 실제로 2배 주기를 가져야만 적용.
  const doubleLag = bestLag * 2;
  if (doubleLag <= cap) {
    const doubleCorr = corrs[doubleLag];
    // 2배 주기의 상관이 양수이고 현재 best의 35% 이상일 때만 선택
    if (doubleCorr > 0 && doubleCorr / bestCorr >= 0.35) {
      return doubleLag;
    }
  }

  return bestLag;
}

/**
 * 비드 패턴 이미지에서 격자 주기(px)를 자동 감지.
 *
 * 전략:
 *  1. 수평 × 여러 행: 밝기 신호 + 채도(색상 변화) 신호
 *  2. 수직 × 여러 열: 밝기 신호
 *  → 총 ~24개 vote → 중앙값 기반 합의
 *
 * 다색 이미지(기어/링 비드)에서도 색상 경계선이 주기적으로
 * 나타나므로 채도 신호가 강한 주기를 감지함.
 */
function detectBeadPeriod(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): number | null {
  const votes: number[] = [];

  // ── 수평 스캔 (여러 행) ──────────────────────────────
  const rowFracs = [0.2, 0.28, 0.36, 0.44, 0.5, 0.56, 0.64, 0.72, 0.8];
  for (const frac of rowFracs) {
    const row = Math.floor(height * frac);
    if (row >= height) continue;

    const bright: number[] = [];
    const chroma: number[] = []; // 색상 변화량 (bead 경계에서 큰 값)

    for (let x = 0; x < width; x++) {
      const i = (row * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      bright.push((r + g + b) / 3);
      // 채도 proxy: max - min (회색에선 0, 유채색에선 크다)
      chroma.push(Math.max(r, g, b) - Math.min(r, g, b));
    }

    // 인접 열 간 색상 차이(delta) 신호 → bead 경계에서 급변
    const delta: number[] = [0];
    for (let x = 1; x < width; x++) {
      const i0 = (row * width + x - 1) * 4;
      const i1 = (row * width + x) * 4;
      const dr = data[i1] - data[i0];
      const dg = data[i1 + 1] - data[i0 + 1];
      const db = data[i1 + 2] - data[i0 + 2];
      delta.push(Math.sqrt(dr * dr + dg * dg + db * db));
    }

    for (const sig of [bright, chroma, delta]) {
      const p = findPeriodByAutocorr(sig);
      if (p) votes.push(p);
    }
  }

  // ── 수직 스캔 (여러 열) ──────────────────────────────
  const colFracs = [0.2, 0.35, 0.5, 0.65, 0.8];
  for (const frac of colFracs) {
    const col = Math.floor(width * frac);
    if (col >= width) continue;

    const bright: number[] = [];
    for (let y = 0; y < height; y++) {
      const i = (y * width + col) * 4;
      bright.push((data[i] + data[i + 1] + data[i + 2]) / 3);
    }
    const p = findPeriodByAutocorr(bright);
    if (p) votes.push(p);
  }

  if (votes.length < 2) return null;

  // 중앙값 기반 합의 (±3px 허용)
  votes.sort((a, b) => a - b);
  const median = votes[Math.floor(votes.length / 2)];
  const cluster = votes.filter(p => Math.abs(p - median) <= 3);
  if (cluster.length < 2) return null;

  return Math.round(cluster.reduce((a, b) => a + b, 0) / cluster.length);
}

/**
 * 비드 그리드의 위상(offset) 감지.
 * 수평/수직 방향으로 brightness 신호를 집계한 뒤,
 * 비드 경계(어두운 테두리)와 비드 중심(밝은/유채색) 간 대비가
 * 최대가 되는 위상을 찾아 반환.
 */
/**
 * 비드 패턴의 위상을 감지.
 * 비드 이미지는 검정 테두리가 반복되는 패턴이므로,
 * 엣지 신호(색상 변화)가 최대인 지점이 실제 비드 경계.
 */
function detectBeadPhase(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  period: number,
): { offsetX: number; offsetY: number } {
  const p = Math.max(1, Math.round(period));

  // 엣지 신호: 인접 픽셀 간의 색상 변화 (비드 테두리는 급격함)
  const edgeX = new Float32Array(width);
  const rowMid = Math.floor(height / 2);
  for (let x = 1; x < width; x++) {
    const i0 = (rowMid * width + x - 1) * 4;
    const i1 = (rowMid * width + x) * 4;
    const dr = data[i1] - data[i0];
    const dg = data[i1 + 1] - data[i0 + 1];
    const db = data[i1 + 2] - data[i0 + 2];
    edgeX[x] = Math.sqrt(dr * dr + dg * dg + db * db);
  }

  const edgeY = new Float32Array(height);
  const colMid = Math.floor(width / 2);
  for (let y = 1; y < height; y++) {
    const i0 = ((y - 1) * width + colMid) * 4;
    const i1 = (y * width + colMid) * 4;
    const dr = data[i1] - data[i0];
    const dg = data[i1 + 1] - data[i0 + 1];
    const db = data[i1 + 2] - data[i0 + 2];
    edgeY[y] = Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function bestPhase(edge: Float32Array, len: number): number {
    // 각 offset에서 엣지 신호의 합을 계산.
    // 엣지가 최대인 offset이 비드 경계 위치.
    let bestOff = 0, bestScore = -Infinity;
    for (let off = 0; off < p; off++) {
      let sum = 0, n = 0;
      for (let pos = off; pos < len; pos += p) {
        sum += edge[Math.min(Math.round(pos), len - 1)];
        n++;
      }
      const avg = n > 0 ? sum / n : 0;
      if (avg > bestScore) { bestScore = avg; bestOff = off; }
    }
    return bestOff;
  }

  const offsetX = bestPhase(edgeX, width);
  const offsetY = bestPhase(edgeY, height);
  return { offsetX, offsetY };
}

function nearest(r: number, g: number, b: number) {
  let best = PALETTE[0], bd = Infinity;
  for (const hex of PALETTE) {
    const pr = parseInt(hex.slice(1, 3), 16), pg = parseInt(hex.slice(3, 5), 16), pb = parseInt(hex.slice(5, 7), 16);
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bd) { bd = d; best = hex; }
  }
  return best;
}

const S: Record<string, React.CSSProperties> = {
  outer: { display: "flex", flexDirection: "column", height: "100vh" },

  // 비드 감지 배너
  importBanner: {
    background: "#fffbeb",
    borderBottom: "1px solid #fde68a",
    flexShrink: 0,
    zIndex: 10,
  },
  importBannerInner: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 24px", maxWidth: "100%",
  },
  importBtnPrimary: {
    padding: "8px 14px", background: "var(--accent)", color: "#fff",
    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
    cursor: "pointer", whiteSpace: "nowrap" as const, fontFamily: "inherit",
  },
  importBtnSecondary: {
    padding: "8px 14px", background: "#fff", color: "var(--ink)",
    border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap" as const, fontFamily: "inherit",
  },
  topbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 24px", borderBottom: "1px solid var(--line-soft)", background: "#fff",
    flexShrink: 0,
  },
  topLeft: { fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 10 },
  backLink: { color: "var(--muted)", fontWeight: 600, fontSize: 14 },
  divider: { color: "var(--line)", fontWeight: 300 },
  badge: { fontSize: 12, fontWeight: 600, color: "#888", background: "#f1f0ec", padding: "4px 10px", borderRadius: 999 },
  topRight: { display: "flex", alignItems: "center", gap: 8 },
  iconBtn: { background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 14px", fontSize: 14, fontWeight: 600 },
  saveGhost: { background: "#fff", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 16px", fontSize: 14, fontWeight: 700 },
  savePrimary: { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 14, fontWeight: 700 },
  body: { display: "grid", gridTemplateColumns: "220px 1fr 280px", flex: 1, overflow: "hidden" },
  side: { padding: 18, borderRight: "1px solid var(--line-soft)", display: "flex", flexDirection: "column", gap: 4, overflow: "auto" },
  tool: { display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", border: "none", background: "transparent", borderRadius: 10, fontSize: 15, textAlign: "left", width: "100%" },
  toolOn: { display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", border: "none", background: "#eef0f4", borderRadius: 10, fontSize: 15, fontWeight: 600, textAlign: "left", width: "100%" },
  toolDanger: { display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", border: "none", background: "transparent", borderRadius: 10, fontSize: 15, textAlign: "left", width: "100%", color: "var(--accent-ink)" },
  noteBox: { marginTop: 14, padding: 14, background: "var(--bg-soft)", borderRadius: 10, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 },
  sLbl: { fontSize: 13, color: "var(--muted)", margin: "10px 0 6px", fontWeight: 600 },
  num: { width: 56, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 8 },
  stage: { overflow: "auto", display: "grid", placeItems: "center", background: "var(--bg-soft)", padding: 20 },
  panel: { overflow: "auto", padding: 18, borderLeft: "1px solid var(--line-soft)" },
  curSwatch: { width: 44, height: 44, borderRadius: 10, border: "1px solid var(--line)" },
  swatches: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginTop: 12 },
  sw: { width: "100%", aspectRatio: "1", borderRadius: 999, border: "2px solid transparent" },
  counts: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 8px" },
  count: { display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 600 },
  dot: { width: 28, height: 28, borderRadius: 999, border: "1px solid var(--line)" },
  stepperBtn: {
    width: 32, height: 32, border: "1px solid var(--line)",
    background: "#fff", borderRadius: 6, fontSize: 16, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s", fontFamily: "inherit", fontWeight: 600,
  },
  directionBtn: {
    padding: "8px 12px", border: "1px solid var(--line)",
    background: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 600,
    cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
  },
  actionBtn: {
    flex: 1, padding: "8px 12px", border: "1px solid var(--line)",
    background: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
  },
};

// ── 나가기 확인 모달 ────────────────────────────────────────
function ExitModal({
  show,
  onContinue,
  onExit,
  onSaveAndExit,
  isSaving,
}: {
  show: boolean;
  onContinue: () => void;
  onExit: () => void;
  onSaveAndExit: () => void;
  isSaving: boolean;
}) {
  if (!show) return null;

  return (
    <div style={SM.overlay} onClick={onContinue}>
      <div style={SM.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={SM.title}>저장하지 않은 변경사항이 있어요</h3>
        <p style={SM.desc}>작업 중인 도안을 저장하시겠어요?</p>
        <div style={SM.buttons}>
          <button onClick={onContinue} style={SM.btnSecondary}>
            계속 작업하기
          </button>
          <button onClick={onExit} style={SM.btnGhost}>
            나가기
          </button>
          <button onClick={onSaveAndExit} disabled={isSaving} style={SM.btnPrimary}>
            {isSaving ? "저장 중…" : "저장 후 이동"}
          </button>
        </div>
      </div>
    </div>
  );
}

const SM: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    background: "#fff",
    borderRadius: 16,
    padding: "24px 28px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
    maxWidth: 400,
    width: "90%",
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    margin: "0 0 8px",
    color: "var(--ink)",
  },
  desc: {
    fontSize: 14,
    color: "var(--muted)",
    margin: "0 0 24px",
    lineHeight: 1.5,
  },
  buttons: {
    display: "flex",
    gap: 10,
    flexDirection: "column",
  },
  btnPrimary: {
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "11px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  btnSecondary: {
    background: "#fff",
    color: "var(--ink)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    padding: "11px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  btnGhost: {
    background: "transparent",
    color: "var(--muted)",
    border: "none",
    borderRadius: 8,
    padding: "11px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
};
