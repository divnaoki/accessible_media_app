"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FolderPlus, Plus, ImageIcon, VideoIcon } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CreateCategoryProps {
  onCategoryCreated?: () => void;
}

export function CreateCategory({ onCategoryCreated }: CreateCategoryProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const router = useRouter();
  const supabase = createClientComponentClient();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      // 現在のユーザーIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ユーザーが認証されていません");

      // カテゴリーを作成
      const { error: insertError } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          name,
          description,
          media_type: mediaType,
          display_order: 0,
        });

      if (insertError) throw insertError;

      setOpen(false);
      router.refresh();

      // 親コンポーネントに通知
      if (onCategoryCreated) {
        onCategoryCreated();
      }
    } catch (error) {
      console.error("Error creating category:", error);
      setError(
        error instanceof Error
          ? error.message
          : "カテゴリーの作成に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          カテゴリーを作成
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新規カテゴリーの作成</DialogTitle>
          <DialogDescription>
            メディアを整理するための新しいカテゴリーを作成します。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">カテゴリー名</Label>
              <Input
                id="name"
                name="name"
                placeholder="カテゴリー名を入力"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">説明（任意）</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="カテゴリーの説明を入力"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>メディアタイプ</Label>
              <RadioGroup
                value={mediaType}
                onValueChange={(value) => setMediaType(value as 'image' | 'video')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="image" id="image" />
                  <Label htmlFor="image" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    画像
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="video" id="video" />
                  <Label htmlFor="video" className="flex items-center gap-2">
                    <VideoIcon className="h-4 w-4" />
                    動画
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "作成中..." : "作成"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 