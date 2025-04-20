'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, ArrowLeft, Upload } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Progress } from '@/components/ui/progress';

type Image = {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
};

type UploadProgressEvent = {
  loaded: number;
  total: number;
};

export default function ImageEditPage() {
  const [image, setImage] = useState<Image | null>(null);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  // 画像データの取得
  useEffect(() => {
    const fetchImage = async () => {
      try {
        if (!params?.imageId) {
          throw new Error('画像IDが指定されていません');
        }

        const { data, error } = await supabase
          .from('images')
          .select('*')
          .eq('id', params.imageId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('画像が見つかりません');
        
        setImage(data);
        setTitle(data.title);
      } catch (error) {
        console.error('Error fetching image:', error);
        setError('画像の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [params?.imageId, supabase]);

  // タイトルの更新
  const handleUpdateTitle = async () => {
    if (!image || !title.trim()) return;

    try {
      const { error } = await supabase
        .from('images')
        .update({ title: title.trim() })
        .eq('id', image.id);

      if (error) throw error;

      toast({
        title: "更新完了",
        description: "タイトルを更新しました。",
      });

      setImage({ ...image, title: title.trim() });
    } catch (error) {
      console.error('Error updating title:', error);
      toast({
        title: "エラー",
        description: "タイトルの更新に失敗しました。",
        variant: "destructive",
      });
    }
  };

  // 画像の更新
  const handleUpdateImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!image || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // ファイルサイズのチェック（10MBまで）
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('ファイルサイズは10MB以下にしてください');
      }

      // ファイルタイプのチェック
      if (!file.type.startsWith('image/')) {
        throw new Error('画像ファイルを選択してください');
      }

      // 現在のユーザーIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      // 新しいファイル名を生成
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const newFileName = `${user.id}_${timestamp}.${fileExt}`;

      // 古い画像を削除
      await supabase.storage.from('images').remove([image.file_name]);

      // 新しい画像をアップロード
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('images')
        .upload(newFileName, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress: UploadProgressEvent) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadProgress(Math.round(percent));
          },
        } as any);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      if (!uploadData) {
        throw new Error('アップロードに失敗しました');
      }

      // 画像URLの取得
      const { data: { publicUrl } } = supabase
        .storage
        .from('images')
        .getPublicUrl(newFileName);

      // データベースの更新
      const { error: updateError } = await supabase
        .from('images')
        .update({
          url: publicUrl,
          file_name: newFileName,
          file_size: file.size,
          mime_type: file.type,
          updated_at: new Date().toISOString()
        })
        .eq('id', image.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(updateError.message);
      }

      toast({
        title: "更新完了",
        description: "画像を更新しました。",
      });

      // 画像情報の更新
      setImage({
        ...image,
        url: publicUrl,
        file_name: newFileName,
        file_size: file.size,
        mime_type: file.type,
        updated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error updating image:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "画像の更新に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 画像の削除処理
  const handleDelete = async () => {
    if (!image) return;
    
    setIsDeleting(true);
    try {
      // Storageから画像を削除
      const { error: storageError } = await supabase
        .storage
        .from('images')
        .remove([image.file_name]);

      if (storageError) throw storageError;

      // データベースから画像情報を削除
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', image.id);

      if (dbError) throw dbError;

      toast({
        title: "削除完了",
        description: "画像を削除しました。",
      });

      // カテゴリー詳細ページに戻る
      router.push(`/dashboard/categories/${image.category_id}`);
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "エラー",
        description: "画像の削除に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return <div>エラー: {error}</div>;
  }

  if (!image) {
    return <div>画像が見つかりません</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/categories/${image.category_id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>画像の編集</CardTitle>
          <CardDescription>画像の情報を編集または削除します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* タイトル編集 */}
            <div className="space-y-2">
              <Label htmlFor="title">タイトル</Label>
              <div className="flex gap-2">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="画像のタイトルを入力"
                />
                <Button
                  onClick={handleUpdateTitle}
                  disabled={!title.trim() || title.trim() === image.title}
                >
                  更新
                </Button>
              </div>
            </div>

            {/* 画像プレビューと更新 */}
            <div className="space-y-2">
              <Label>プレビュー</Label>
              <div className="relative aspect-video w-full max-w-2xl mx-auto">
                <img
                  src={image.url}
                  alt={image.title}
                  className="rounded-lg object-contain w-full h-full"
                />
              </div>
            </div>

            {/* 画像ファイル更新 */}
            <div className="space-y-2">
              <Label htmlFor="image">画像を変更</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleUpdateImage}
                disabled={isUploading}
              />
              {isUploading && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">
                    アップロード中... {uploadProgress}%
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}
            </div>

            {/* 削除ボタン */}
            <div className="pt-4">
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                画像を削除
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>画像の削除</DialogTitle>
            <DialogDescription>
              本当にこの画像を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '削除中...' : '削除する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 