// src/app/gallery/page.tsx — 작품 갤러리 (공개 도안, 디폼블럭 스타일)
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase-server";
import GalleryContent from "./gallery-content";

export const dynamic = "force-dynamic";

type Pattern = {
  id: string;
  title: string;
  image_url: string | null;
  created_at: string;
  view_count: number;
  pixel_data: PixelData | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any;
};

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patterns")
    .select("id, title, image_url, created_at, view_count, pixel_data, profiles(nickname)")
    .eq("is_public", true)
    .limit(120);
  const list = (data ?? []) as Pattern[];

  return (
    <>
      <Header />
      <GalleryContent patterns={list} />
    </>
  );
}

function BeadPreview({ pixelData, maxPx }: { pixelData: PixelData; maxPx: number }) {
  const { cols, rows, data } = pixelData;
  const s = Math.max(4, Math.floor(maxPx / Math.max(cols, rows)));
  const w = cols * s;
  const h = rows * s;

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <rect x={0} y={0} width={w} height={h} fill="#fff" />
      {data.map((color, i) => {
        if (!color) return null;
        const cx = (i % cols) * s + s / 2;
        const cy = Math.floor(i / cols) * s + s / 2;
        return <BeadUnit key={i} cx={cx} cy={cy} s={s} color={color} />;
      })}
    </svg>
  );
}

