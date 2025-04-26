'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { uploadVideo, deleteVideo } from '@/lib/cloudinary';
import { Video } from '@/types/video';

export default function EditVideoPage() {
  const [video, setVideo] = useState<Video | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('ユーザーが認証されていません');
        }

        const { data: videoData, error } = await supabase
          .from('videos')
          .select('*')
          .eq('id', params.videoId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        if (!videoData) {
          throw new Error('動画が見つかりません');
        }

        setVideo(videoData);
        setTitle(videoData.title);
        setDescription(videoData.description || '');
      } catch (error) {
        console.error('動画取得エラー:', error);
        toast.error('動画の取得に失敗しました');
      }
    };

    fetchVideo();
  }, [params.videoId, supabase]);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // ファイルサイズのチェック（100MBまで）
      if (file.size > 100 * 1024 * 1024) {
        throw new Error('ファイルサイズは100MB以下にしてください');
      }

      // ファイルタイプのチェック
      const allowedTypes = ["video/mp4", "video/quicktime", "video/x-msvideo"];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('対応していないファイル形式です。MP4、MOV、AVI形式の動画をアップロードしてください。');
      }

      // Cloudinaryにアップロード
      const { url, publicId } = await uploadVideo(file);

      // 現在のユーザーIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      // Supabaseにメタデータを保存
      const { error: insertError } = await supabase
        .from("videos")
        .insert({
          user_id: user.id,
          category_id: params.id,
          url,
          public_id: publicId,
          title: file.name,
          description: '',
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
        });

      if (insertError) throw insertError;

      toast.success(`${file.name}をアップロードしました`);

      // 動画一覧を更新
      const { data: videosData, error: videosError } = await supabase
        .from("videos")
        .select("*")
        .eq("category_id", params.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (videosError) throw videosError;
      setVideo(videosData[0]);

    } catch (error) {
      console.error('アップロードエラー:', error);
      let errorMessage = '動画のアップロードに失敗しました。';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

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

      toast.success('動画を更新しました');
      router.push(`/dashboard/categories/${params.id}`);
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

      // 現在のユーザーIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      // Cloudinaryから動画を削除
      await deleteVideo(video.public_id);

      // Supabaseから動画を削除
      const { error: deleteError } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Supabase削除エラー:', deleteError);
        throw new Error(`Supabaseからの動画削除に失敗しました: ${deleteError.message}`);
      }

      toast.success('動画を削除しました');
      
      // カテゴリ詳細ページに戻る
      router.push(`/dashboard/categories/${params.id}`);
      // ページを再読み込み
      router.refresh();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('動画の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!video) {
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
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">動画の編集</h1>

        <div className="mb-8">
          <video
            src={video.url}
            controls
            className="w-full rounded-lg"
          >
            お使いのブラウザは動画の再生をサポートしていません。
          </video>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="space-y-2">
            <Label>新しい動画をアップロード</Label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="video-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg
                    className="w-8 h-8 mb-4 text-gray-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 16"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                    />
                  </svg>
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">クリックして動画をアップロード</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    MP4, MOV, AVI (最大100MB)
                  </p>
                </div>
                <input
                  id="video-upload"
                  type="file"
                  className="hidden"
                  accept="video/mp4,video/quicktime,video/avi"
                  onChange={handleVideoUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
            {isUploading && (
              <div className="space-y-2">
                <div className="text-sm text-gray-500">
                  アップロード中... {uploadProgress}%
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
            >
              {isDeleting ? "削除中..." : "削除"}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting ? "更新中..." : "更新"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 