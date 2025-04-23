"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { EditCategory } from "@/components/categories/edit-category";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

export default function EditCategoryPage() {
  const params = useParams<{ id: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth/login");
          return;
        }

        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .eq("id", params.id)
          .single();

        if (error) throw error;
        setCategory(data);
      } catch (error) {
        console.error("Error fetching category:", error);
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategory();
  }, [params.id, router, supabase]);

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (!category) {
    return <div>カテゴリーが見つかりません</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        <h1 className="text-2xl font-bold">カテゴリーの編集</h1>
      </div>
      <EditCategory category={category} />
    </div>
  );
} 