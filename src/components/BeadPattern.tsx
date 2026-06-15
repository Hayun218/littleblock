/**
 * BeadPattern.tsx — 디폼블럭 픽셀 렌더링
 *
 * 표시: 단순 사각형 픽셀 (flat pixel art 스타일)
 * 이미지 불러오기: 비드 이미지도 정확히 색상 인식
 */

import React from "react";

export function darkenColor(hex: string, amt: number): string {
  const raw = hex.startsWith("#") ? hex.slice(1) : hex;
  if (raw.length !== 6) return hex;
  const n = parseInt(raw, 16);
  const c = (ch: number) => Math.max(0, ch - Math.round(ch * amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 0xff)},${c(n & 0xff)})`;
}

/** 비드 1개 — 단순 사각형 픽셀 */
export function BeadUnit({ cx, cy, s, color }: {
  cx: number; cy: number; s: number; color: string;
}) {
  const gap = 1; // 픽셀 간 1px 간격
  return (
    <rect
      x={cx - s / 2 + gap / 2}
      y={cy - s / 2 + gap / 2}
      width={s - gap}
      height={s - gap}
      fill={color}
    />
  );
}

/** 전체 픽셀 그리드 SVG */
export function BeadGrid({ cols, rows, data, cellSize }: {
  cols: number; rows: number; data: (string | null)[]; cellSize: number;
}) {
  const s = cellSize;
  return (
    <svg width={cols * s} height={rows * s} style={{ display: "block" }} xmlns="http://www.w3.org/2000/svg">
      <rect width={cols * s} height={rows * s} fill="#e8e8e8" />
      {data.map((color, i) => {
        if (!color) return null;
        const cx = (i % cols) * s + s / 2;
        const cy = Math.floor(i / cols) * s + s / 2;
        return <BeadUnit key={i} cx={cx} cy={cy} s={s} color={color} />;
      })}
    </svg>
  );
}

/** Canvas 드로잉 (내보내기 / 인쇄) */
export function drawBeadOnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, s: number, color: string,
) {
  const gap = 1;
  ctx.fillStyle = color;
  ctx.fillRect(cx - s / 2 + gap / 2, cy - s / 2 + gap / 2, s - gap, s - gap);
}

/** 사용하지 않지만 타입 호환용 */
export function beadPath(_cx: number, _cy: number, _s: number): string {
  return "";
}
