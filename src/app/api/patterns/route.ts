// src/app/api/patterns/route.ts — 도안 생성 (서버에서 세션 읽기)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const body = await req.json();
  const { error } = await supabase.from("patterns").insert({
    user_id: user.id,
    title: body.title,
    image_url: body.image_url,
    pixel_data: body.pixel_data,
    is_public: body.is_public,
    is_legacy: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
