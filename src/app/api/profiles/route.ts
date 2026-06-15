// src/app/api/profiles/route.ts — 내 프로필 조회 / 닉네임 수정
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("profiles")
    .select("id, nickname")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    nickname: data?.nickname ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nickname } = await req.json();
  const trimmed = (nickname ?? "").trim();
  if (!trimmed) return NextResponse.json({ error: "닉네임을 입력해주세요" }, { status: 400 });
  if (trimmed.length > 20) return NextResponse.json({ error: "닉네임은 20자 이하로 입력해주세요" }, { status: 400 });

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, nickname: trimmed }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, nickname: trimmed });
}
