"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

interface EditCategoryProps {
  category: {
    id: string;
    name: string;
    description: string | null;
  };
}

export function EditCategory({ category }: EditCategoryProps) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // バリデーション
      if (!name.trim()) {
        setError("カテゴリー名は必須です");
        return;
      }

      if (name.length > 50) {
        setError("カテゴリー名は50文字以内で入力してください");
        return;
      }

      if (description && description.length > 500) {
        setError("説明は500文字以内で入力してください");
        return;
      }

      const { error: updateError } = await supabase
        .from("categories")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", category.id);

      if (updateError) throw updateError;

      toast.success("カテゴリーを更新しました", {
        description: `${name}の情報を更新しました`,
        duration: 3000,
      });
      
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error updating category:", error);
      setError("カテゴリーの更新に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">カテゴリー名</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={category.name}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={category.description || "説明を入力してください"}
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "更新中..." : "更新"}
      </Button>
    </form>
  );
} 