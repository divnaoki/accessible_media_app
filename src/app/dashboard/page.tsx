"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FolderPlus, ImageIcon, Plus, Pencil, VideoIcon } from "lucide-react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateCategory } from "@/components/categories/create-category";

// カテゴリーの型定義
type Category = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  media_type: 'image' | 'video';
  display_order: number;
  created_at: string;
  updated_at: string;
};

export default function DashboardPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError("カテゴリーの取得に失敗しました");
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
      } else {
        setLoading(false);
        fetchCategories();
      }
    };

    checkSession();
  }, [router, supabase.auth]);

  const handleCategoryCreated = () => {
    fetchCategories();
  };

  if (loading) {
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
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">カテゴリー一覧</h1>
            <p className="text-muted-foreground">
              写真や動画を整理するためのカテゴリーを管理します
            </p>
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="relative group bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/dashboard/categories/${category.id}/edit`)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <Link href={`/dashboard/categories/${category.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category.media_type === 'image' ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : (
                      <VideoIcon className="h-5 w-5" />
                    )}
                    {category.name}
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    作成日: {new Date(category.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Link>
            </div>
          ))}

          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5" />
                新規カテゴリー
              </CardTitle>
              <CardDescription>
                新しいカテゴリーを作成して、メディアを整理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateCategory onCategoryCreated={handleCategoryCreated} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 