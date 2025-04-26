"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video } from "@/types/video";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EditVideoProps {
  video: Video;
  onClose: () => void;
}

export function EditVideo({ video, onClose }: EditVideoProps) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error("動画の更新に失敗しました");
      }

      toast({
        title: "動画を更新しました",
        description: `${title}を更新しました`,
        duration: 3000,
      });

      // ページを更新
      router.refresh();
      
      // 3秒後にダッシュボードにリダイレクト
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);

    } catch (error) {
      console.error("動画更新エラー:", error);
      toast({
        title: "エラー",
        description: "動画の更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">タイトル</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="動画のタイトルを入力"
          required
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="動画の説明を入力"
          disabled={isSubmitting}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "更新中..." : "更新"}
        </Button>
      </div>
    </form>
  );
} 