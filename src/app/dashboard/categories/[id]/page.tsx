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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageIcon, Upload, Volume2, Trash2, Menu, X, Edit, Pencil, ArrowLeft, VideoIcon } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadVideo } from '@/lib/cloudinary';
import { EditVideo } from "@/components/videos/edit-video";
import Link from 'next/link';

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

// 動画の型定義
type Video = {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  description: string | null;
  url: string;
  public_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  created_at: string;
  updated_at: string;
};

// アップロード進捗の型定義
type UploadProgressEvent = {
  loaded: number;
  total: number;
};

export default function CategoryDetailPage() {
  const [category, setCategory] = useState<Category | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoToEdit, setVideoToEdit] = useState<Video | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        if (!params?.id) {
          throw new Error('カテゴリーIDが指定されていません');
        }

        // カテゴリー情報の取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('ユーザーが認証されていません');
        }

        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single();

        if (categoryError) throw categoryError;
        if (!categoryData) {
          throw new Error('カテゴリーが見つかりません');
        }
        setCategory(categoryData);

        // 画像データの取得
        const { data: imagesData, error: imagesError } = await supabase
          .from('images')
          .select('*')
          .eq('category_id', params.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (imagesError) throw imagesError;
        setImages(imagesData || []);

        // 動画データの取得
        const { data: videosData, error: videosError } = await supabase
          .from('videos')
          .select('*')
          .eq('category_id', params.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (videosError) throw videosError;
        setVideos(videosData || []);

      } catch (error) {
        console.error('Error fetching category data:', error);
        setError('カテゴリー情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [params, supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      if (!params?.id) {
        throw new Error('カテゴリーIDが指定されていません');
      }

      if (!selectedFile) {
        throw new Error('ファイルが選択されていません');
      }

      const formData = new FormData(e.currentTarget);
      const title = formData.get('title') as string;

      // ファイルサイズのチェック（10MBまで）
      if (selectedFile.size > 10 * 1024 * 1024) {
        throw new Error('ファイルサイズは10MB以下にしてください');
      }

      // ファイルタイプのチェック
      if (!selectedFile.type.startsWith('image/')) {
        throw new Error('画像ファイルを選択してください');
      }

      // 現在のユーザーIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      // ファイル名を生成（ユーザーID/タイムスタンプ_元のファイル名）
      const timestamp = new Date().getTime();
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${timestamp}_${selectedFile.name}`;

      // Supabase Storageにアップロード（進捗表示付き）
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('images')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress: UploadProgressEvent) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadProgress(Math.round(percent));
          },
        } as any);

      if (uploadError) {
        console.error('ストレージアップロードエラー:', uploadError);
        throw new Error(`ストレージへのアップロードに失敗しました: ${uploadError.message}`);
      }

      // アップロードした画像のURLを取得
      const { data: { publicUrl } } = supabase
        .storage
        .from('images')
        .getPublicUrl(fileName, {
          transform: {
            width: 800,
            height: 600,
            resize: 'cover'
          }
        });

      // 画像情報をデータベースに保存
      const { error: insertError } = await supabase
        .from('images')
        .insert({
          user_id: user.id,
          category_id: params.id,
          title: title,
          url: publicUrl,
          file_name: fileName,
          file_size: selectedFile.size,
          mime_type: selectedFile.type
        });

      if (insertError) {
        console.error('データベース挿入エラー:', insertError);
        throw new Error(`データベースへの保存に失敗しました: ${insertError.message}`);
      }

      // フォームをリセット
      setSelectedFile(null);
      setPreviewUrl(null);
      const form = e.currentTarget as HTMLFormElement;
      if (form) {
        form.reset();
      }

      // 画像一覧を更新
      const { data: imagesData, error: imagesError } = await supabase
        .from('images')
        .select('*')
        .eq('category_id', params.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (imagesError) {
        console.error('画像一覧取得エラー:', imagesError);
        throw new Error(`画像一覧の更新に失敗しました: ${imagesError.message}`);
      }

      setImages(imagesData || []);

      // 成功時の処理
      toast({
        description: '画像のアップロードが完了しました',
      });

    } catch (error) {
      console.error('アップロードエラー:', error);
      let errorMessage = '画像のアップロードに失敗しました。';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast({
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVideoUpload = async (e: React.FormEvent<HTMLFormElement> | React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    const fileInput = e.currentTarget as HTMLInputElement;
    const file = fileInput.files?.[0];
    
    if (!file) {
      toast({
        description: '動画ファイルを選択してください',
      });
      return;
    }

    setIsVideoUploading(true);
    setError(null);
    setVideoUploadProgress(0);

    try {
      if (!params?.id) {
        throw new Error('カテゴリーIDが指定されていません');
      }

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

      toast({
        description: `${file.name}をアップロードしました`,
      });

      // 動画一覧を更新
      const { data: videosData, error: videosError } = await supabase
        .from("videos")
        .select("*")
        .eq("category_id", params.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (videosError) throw videosError;
      setVideos(videosData || []);

    } catch (error) {
      console.error('アップロードエラー:', error);
      let errorMessage = '動画のアップロードに失敗しました。';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast({
        description: errorMessage,
      });
    } finally {
      setIsVideoUploading(false);
      setVideoUploadProgress(0);
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

  const handleDeleteCategory = async () => {
    setIsDeleting(true);
    try {
      if (!category) return;

      // まず、カテゴリーに紐づく画像のファイルを削除
      for (const image of images) {
        const { error: storageError } = await supabase
          .storage
          .from('images')
          .remove([image.file_name]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
          throw new Error('画像ファイルの削除中にエラーが発生しました');
        }
      }

      // 画像レコードの削除（カスケード削除が設定されているため自動的に削除される）
      // カテゴリーの削除
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (deleteError) throw deleteError;

      toast({
        description: 'カテゴリーを削除しました',
      });

      // ダッシュボードにリダイレクト
      router.push('/dashboard');
      router.refresh();

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        description: 'カテゴリーの削除に失敗しました',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleCloseVideoDialog = () => {
    setSelectedVideo(null);
  };

  const handleVideoEnded = () => {
    // 動画再生終了後、3秒後に閉じる
    setTimeout(() => {
      setSelectedVideo(null);
    }, 3000);
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;

    setIsDeletingVideo(true);
    try {
      // 現在のユーザーIDを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }

      // Cloudinaryから動画を削除
      const response = await fetch(`/api/videos/${videoToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("動画の削除に失敗しました");
      }

      toast({
        description: `${videoToDelete.title}を削除しました`,
      });

      // 動画一覧を更新
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('category_id', params.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;
      setVideos(videosData || []);

      // 3秒後にダッシュボードにリダイレクト
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);

    } catch (error) {
      console.error("動画削除エラー:", error);
      toast({
        description: '動画の削除に失敗しました',
      });
    } finally {
      setIsDeletingVideo(false);
      setVideoToDelete(null);
    }
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
    <div className="min-h-screen">
      {/* ハンバーガーメニューボタン */}
      <div className="sticky top-[72px] z-50 mb-4 px-4">
        <Button
          variant="ghost"
          size="icon"
          className="bg-background"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      <div className="relative flex">
        {/* 左サイドメニュー */}
        <div className={`
          fixed md:static top-[72px] left-0 h-[calc(100vh-72px)] md:h-auto
          transform transition-all duration-300 ease-in-out
          ${isMenuOpen 
            ? 'w-full md:w-80 opacity-100 visible md:mr-6' 
            : 'w-0 opacity-0 invisible'
          }
          bg-background md:bg-transparent
          p-4 md:p-0
          overflow-y-auto
          z-40
        `}>
          <div className={`space-y-6 ${!isMenuOpen ? 'hidden' : ''}`}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    {category.name}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>メディアのアップロード</CardTitle>
                <CardDescription>
                  このカテゴリーに新しいメディアを追加します
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="image" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="image" className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      画像
                    </TabsTrigger>
                    <TabsTrigger value="video" className="flex items-center gap-2">
                      <VideoIcon className="h-4 w-4" />
                      動画
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="image">
                    <form onSubmit={handleUpload} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">タイトル</Label>
                        <Input
                          id="title"
                          name="title"
                          placeholder="画像のタイトルを入力"
                          required
                          disabled={isUploading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="image">画像ファイル</Label>
                        <div className="flex items-center justify-center w-full">
                          <label
                            htmlFor="image"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
                          >
                            {previewUrl ? (
                              <div className="relative w-full h-full">
                                <Image
                                  src={previewUrl}
                                  alt="プレビュー"
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            ) : (
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
                                  <span className="font-semibold">クリックして画像をアップロード</span>
                                </p>
                                <p className="text-xs text-gray-500">
                                  PNG, JPG, GIF (最大10MB)
                                </p>
                              </div>
                            )}
                            <input
                              id="image"
                              name="image"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              required
                              disabled={isUploading}
                              onChange={handleFileChange}
                            />
                          </label>
                        </div>
                      </div>
                      {isUploading && (
                        <div className="space-y-2">
                          <div className="text-sm text-gray-500">
                            アップロード中... {uploadProgress}%
                          </div>
                          <Progress value={uploadProgress} className="w-full" />
                        </div>
                      )}
                      {error && (
                        <div className="text-red-500 text-sm">{error}</div>
                      )}
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <div className="flex items-center">
                            <Upload className="mr-2 h-4 w-4" />
                            アップロード中...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Upload className="mr-2 h-4 w-4" />
                            アップロード
                          </div>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="video">
                    <form onSubmit={handleVideoUpload} className="space-y-4">
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="video-upload"
                          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
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
                          />
                        </label>
                      </div>
                      {isVideoUploading && (
                        <div className="space-y-2">
                          <div className="text-sm text-gray-500">
                            アップロード中... {videoUploadProgress}%
                          </div>
                          <Progress value={videoUploadProgress} className="w-full" />
                        </div>
                      )}
                      {error && (
                        <div className="text-red-500 text-sm">{error}</div>
                      )}
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isVideoUploading}
                      >
                        {isVideoUploading ? (
                          <div className="flex items-center">
                            <Upload className="mr-2 h-4 w-4 animate-spin" />
                            アップロード中...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Upload className="mr-2 h-4 w-4" />
                            アップロード
                          </div>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* 画像編集カード */}
            <Card>
              <CardHeader>
                <CardTitle>画像の管理</CardTitle>
                <CardDescription>
                  画像の編集や削除を行います
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {images.map((image) => (
                    <div key={image.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-12 relative rounded overflow-hidden">
                          <Image
                            src={image.url}
                            alt={image.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="truncate">
                          <p className="font-medium truncate">{image.title}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(image.created_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push(`/dashboard/categories/${category?.id}/images/${image.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {images.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      画像がありません
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 動画管理カード */}
            <Card>
              <CardHeader>
                <CardTitle>動画の管理</CardTitle>
                <CardDescription>
                  動画の編集や削除を行います
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {videos.map((video) => (
                    <div key={video.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-12 relative rounded overflow-hidden">
                          <video
                            src={video.url}
                            className="object-cover w-full h-full"
                            preload="metadata"
                          />
                        </div>
                        <div className="truncate">
                          <p className="font-medium truncate">{video.title}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(video.created_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push(`/dashboard/categories/${category?.id}/videos/${video.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {videos.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      動画がありません
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 px-4 transition-all duration-300 ease-in-out">
          <Card>
            <CardHeader>
              <CardTitle>メディア一覧</CardTitle>
              <CardDescription>
                このカテゴリーに含まれるメディアを表示しています
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="images" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="images" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    画像
                  </TabsTrigger>
                  <TabsTrigger value="videos" className="flex items-center gap-2">
                    <VideoIcon className="h-4 w-4" />
                    動画
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="images">
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
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
                </TabsContent>

                <TabsContent value="videos">
                  {videos.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">このカテゴリーにはまだ動画がありません</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {videos.map((video) => (
                        <div
                          key={video.id}
                          className="group relative aspect-square overflow-hidden rounded-lg border bg-muted cursor-pointer"
                          onClick={() => handleVideoClick(video)}
                        >
                          <Image
                            src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/so_1/${video.public_id}.jpg`}
                            alt={video.title}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                            <p className="text-sm font-medium text-white">
                              {video.title}
                            </p>
                            <p className="text-xs text-white/80">
                              {new Date(video.created_at).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-2">
                            <VideoIcon className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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

      {/* 動画ポップアップダイアログ */}
      <Dialog open={!!selectedVideo} onOpenChange={handleCloseVideoDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              {selectedVideo?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="relative aspect-video w-full">
              <video
                src={selectedVideo.url}
                controls
                className="w-full h-full"
                autoPlay
                onEnded={handleVideoEnded}
              >
                お使いのブラウザは動画の再生をサポートしていません。
              </video>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カテゴリーの削除</DialogTitle>
            <DialogDescription>
              このカテゴリーを削除すると、含まれる全ての画像も削除されます。
              この操作は取り消すことができません。
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  このカテゴリーには{images.length}枚の画像が含まれています。
                  全ての画像が完全に削除されます。
                </p>
              </div>
            </div>
          </div>
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
              onClick={handleDeleteCategory}
              disabled={isDeleting}
            >
              {isDeleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 動画編集ダイアログ */}
      <Dialog open={!!videoToEdit} onOpenChange={() => setVideoToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>動画を編集</DialogTitle>
          </DialogHeader>
          {videoToEdit && <EditVideo video={videoToEdit} onClose={() => setVideoToEdit(null)} />}
        </DialogContent>
      </Dialog>

      {/* 動画削除確認ダイアログ */}
      <Dialog open={!!videoToDelete} onOpenChange={() => setVideoToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>動画を削除</DialogTitle>
            <DialogDescription>
              この動画を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVideoToDelete(null)}
              disabled={isDeletingVideo}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteVideo}
              disabled={isDeletingVideo}
            >
              {isDeletingVideo ? "削除中..." : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 