"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight, ImageIcon, VideoIcon } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        router.push("/dashboard");
      } else {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router, supabase.auth]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">読み込み中...</h2>
          <p className="mt-2 text-gray-600">しばらくお待ちください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl flex flex-col items-center space-y-12">
      <div className="space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
          MediaVaultへようこそ
        </h1>
        <p className="mx-auto max-w-[700px] text-lg text-muted-foreground">
          あなたの個人メディア管理プラットフォーム。画像や動画を簡単に整理、表示、共有できます。
        </p>
      </div>
      <div className="grid w-full gap-6 sm:grid-cols-2 md:grid-cols-3">
        <Card className="transform transition-all duration-200 hover:scale-105">
          <CardContent className="flex flex-col items-center space-y-4 p-6">
            <ImageIcon className="h-12 w-12 text-primary" />
            <h2 className="text-xl font-semibold">画像管理</h2>
            <p className="text-center text-sm text-muted-foreground">
              カスタマイズ可能なカテゴリーで画像を整理・表示
            </p>
          </CardContent>
        </Card>
        <Card className="transform transition-all duration-200 hover:scale-105">
          <CardContent className="flex flex-col items-center space-y-4 p-6">
            <VideoIcon className="h-12 w-12 text-primary" />
            <h2 className="text-xl font-semibold">動画ライブラリ</h2>
            <p className="text-center text-sm text-muted-foreground">
              動画コレクションをシームレスに管理・再生
            </p>
          </CardContent>
        </Card>
        <Card className="transform transition-all duration-200 hover:scale-105 sm:col-span-2 md:col-span-1">
          <CardContent className="flex flex-col items-center space-y-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <ArrowRight className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold">はじめる</h2>
            <p className="text-center text-sm text-muted-foreground">
              今すぐサインアップしてメディア管理を始めましょう
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="flex space-x-4">
        <Button asChild size="lg" className="px-8">
          <Link href="/auth/signup">新規登録</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="px-8">
          <Link href="/auth/login">ログイン</Link>
        </Button>
      </div>
    </div>
  );
}