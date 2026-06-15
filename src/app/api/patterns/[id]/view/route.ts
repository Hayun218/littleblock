// src/app/api/patterns/[id]/view/route.ts — 조회수 증가
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pattern } = await supabase
    .from("patterns")
    .select("view_count")
    .eq("id", id)
    .single();

  if (!pattern) {
    return NextResponse.json({ error: "작품을 찾을 수 없어요" }, { status: 404 });
  }

  const newCount = (pattern.view_count || 0) + 1;
  const { error } = await supabase
    .from("patterns")
    .update({ view_count: newCount })
    .eq("id", id);

  if (error) {
    console.error("View count update error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, view_count: newCount });
}
