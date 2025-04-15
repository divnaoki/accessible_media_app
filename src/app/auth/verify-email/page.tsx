"use client";

import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
            メールを確認してください
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            登録したメールアドレスに確認メールを送信しました。
            メール内のリンクをクリックしてアカウントを有効化してください。
          </p>
        </div>
        <div className="text-center">
          <Link
            href="/auth/login"
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            ログインページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
} 