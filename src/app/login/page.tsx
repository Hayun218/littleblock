// src/app/login/page.tsx — 로그인 / 가입 / 비밀번호 찾기
import { Suspense } from "react";
import Header from "@/components/Header";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<div style={{ padding: 40 }}>불러오는 중...</div>}>
        <LoginForm />
      </Suspense>
    </>
  );
}
