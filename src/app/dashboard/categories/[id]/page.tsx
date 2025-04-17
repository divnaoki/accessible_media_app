'use client';

import { useState, useEffect } from 'react';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageIcon, Upload, Volume2 } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';

// グローバルな型定義を追加
declare global {
  interface Window {
    closeTimer: NodeJS.Timeout | null;
  }
}

// カテゴリーの型定義
type Category = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

// 画像の型定義
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

export default function CategoryDetailPage() {
  const [category, setCategory] = useState<Category | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        if (!params?.id) {
          throw new Error('カテゴリーIDが指定されていません');
        }

        // カテゴリー情報の取得
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('id', params.id)
          .single();

        if (categoryError) throw categoryError;
        setCategory(categoryData);

        // 画像データの取得
        const { data: imagesData, error: imagesError } = await supabase
          .from('images')
          .select('*')
          .eq('category_id', params.id)
          .order('created_at', { ascending: false });

        if (imagesError) throw imagesError;
        setImages(imagesData || []);

      } catch (error) {
        console.error('Error fetching category data:', error);
        setError('カテゴリー情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [params, supabase]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);

    const form = e.currentTarget;

    try {
      if (!params?.id) {
        throw new Error('カテゴリーIDが指定されていません');
      }

      const formData = new FormData(form);
      const file = formData.get('image') as File;
      const title = formData.get('title') as string;

      if (!file) {
        throw new Error('ファイルが選択されていません');
      }

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

      // ファイル名を生成（ユーザーID_タイムスタンプ_元のファイル名）
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${timestamp}.${fileExt}`;

      // Supabase Storageにアップロード
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('ストレージアップロードエラー:', uploadError);
        throw new Error(`ストレージへのアップロードに失敗しました: ${uploadError.message}`);
      }

      // アップロードした画像のURLを取得
      const { data: { publicUrl } } = supabase
        .storage
        .from('images')
        .getPublicUrl(fileName);

      // 画像情報をデータベースに保存
      const { error: insertError } = await supabase
        .from('images')
        .insert({
          user_id: user.id,
          category_id: params.id,
          title: title,
          url: publicUrl,
          file_name: fileName,
          file_size: file.size,
          mime_type: file.type
        });

      if (insertError) {
        console.error('データベース挿入エラー:', insertError);
        throw new Error(`データベースへの保存に失敗しました: ${insertError.message}`);
      }

      // フォームをリセット
      if (form) {
        form.reset();
      }

      // 画像一覧を更新
      const { data: imagesData, error: imagesError } = await supabase
        .from('images')
        .select('*')
        .eq('category_id', params.id)
        .order('created_at', { ascending: false });

      if (imagesError) {
        console.error('画像一覧取得エラー:', imagesError);
        throw new Error(`画像一覧の更新に失敗しました: ${imagesError.message}`);
      }

      setImages(imagesData || []);

    } catch (error) {
      console.error('アップロードエラー:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('画像のアップロードに失敗しました。詳細なエラー情報を確認してください。');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageClick = (image: Image) => {
    setSelectedImage(image);
    
    // 音声読み上げ
    const utterance = new SpeechSynthesisUtterance(image.title);
    utterance.lang = 'ja-JP';
    
    // 読み上げ開始時の処理
    utterance.onstart = () => {
      // 読み上げ開始時にタイマーをクリア
      if (window.closeTimer) {
        clearTimeout(window.closeTimer);
        window.closeTimer = null;
      }
    };
    
    // 読み上げ終了時の処理
    utterance.onend = () => {
      // 読み上げ終了後、1秒後に閉じる
      window.closeTimer = setTimeout(() => {
        setSelectedImage(null);
        window.closeTimer = null;
      }, 1000);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const handleCloseDialog = () => {
    // タイマーをクリア
    if (window.closeTimer) {
      clearTimeout(window.closeTimer);
      window.closeTimer = null;
    }
    
    // 音声を停止
    window.speechSynthesis.cancel();
    
    // ポップアップを閉じる
    setSelectedImage(null);
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

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500">エラーが発生しました</h2>
          <p className="mt-2 text-gray-600">{error}</p>
          <Button
            className="mt-4"
            onClick={() => router.push('/dashboard')}
          >
            ダッシュボードに戻る
          </Button>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">カテゴリーが見つかりません</h2>
          <p className="mt-2 text-gray-600">指定されたカテゴリーは存在しません</p>
          <Button
            className="mt-4"
            onClick={() => router.push('/dashboard')}
          >
            ダッシュボードに戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 左サイドメニュー */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                {category.name}
              </CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>画像のアップロード</CardTitle>
              <CardDescription>
                このカテゴリーに新しい画像を追加します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">タイトル</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="画像のタイトルを入力"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">画像ファイル</Label>
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      アップロード中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      アップロード
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* メインコンテンツ */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>画像一覧</CardTitle>
              <CardDescription>
                このカテゴリーに含まれる画像を表示しています
              </CardDescription>
            </CardHeader>
            <CardContent>
              {images.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">このカテゴリーにはまだ画像がありません</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted cursor-pointer"
                      onClick={() => handleImageClick(image)}
                    >
                      <Image
                        src={image.url}
                        alt={image.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <p className="text-sm font-medium text-white">
                          {image.title}
                        </p>
                        <p className="text-xs text-white/80">
                          {new Date(image.created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 画像ポップアップダイアログ */}
      <Dialog open={!!selectedImage} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              {selectedImage?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative aspect-video w-full">
              <Image
                src={selectedImage.url}
                alt={selectedImage.title}
                fill
                className="object-contain"
                priority
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 