"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video } from "@/types/video";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface EditVideoProps {
  video: Video;
  onClose: () => void;
}

export function EditVideo({ video, onClose }: EditVideoProps) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!video) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      const { error } = await supabase
        .from('videos')
        .update({
          title: video.title,
          description: video.description,
        })
        .eq('id', video.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(`${video.title}を更新しました`);
      router.push(`/dashboard/categories/${video.category_id}`);
      router.refresh();
    } catch (error) {
      console.error('更新エラー:', error);
      toast.error('動画の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!video) return;

    try {
      setIsDeleting(true);
      await deleteVideo(video.public_id);
      toast.success('動画を削除しました');
      
      // カテゴリ詳細ページに戻る
      router.push(`/dashboard/categories/${video.category_id}`);
      // ページを再読み込み
      router.refresh();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('動画の削除に失敗しました');
    } finally {
      setIsDeleting(false);
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