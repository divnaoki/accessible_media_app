export interface Video {
  id: string;
  user_id: string;
  category_id: string;
  url: string;
  public_id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  created_at: string;
  updated_at: string;
} 