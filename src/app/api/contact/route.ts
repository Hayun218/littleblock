import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "모든 항목을 입력해주세요" },
        { status: 400 }
      );
    }

    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwFNeXqkH9hIPmXY1uJAFrWI7QQA6Vq8uqKES7NH9ujLRvL88ukmIxFbwWvLLoc3FKG/exec";
    const url = `${SCRIPT_URL}?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&message=${encodeURIComponent(message)}`;

    await fetch(url, { method: 'GET' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { error: "전송 실패" },
      { status: 500 }
    );
  }
}
