// src/app/api/patterns/[id]/route.ts — 도안 수정 (서버에서 세션 읽기)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const body = await req.json();
  const patch: Record<string, unknown> = {
    title: body.title,
    is_public: body.is_public,
  };
  if (body.pixel_data !== undefined) patch.pixel_data = body.pixel_data;
  if (body.image_url !== undefined) patch.image_url = body.image_url;

  const { error } = await supabase.from("patterns").update(patch)
    .eq("id", id)
    .eq("user_id", user.id); // 본인 것만

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const { error } = await supabase.from("patterns").delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
