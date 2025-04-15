-- Create categories table
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create images table
CREATE TABLE images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create videos table
CREATE TABLE videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  external_service TEXT NOT NULL DEFAULT 'cloudinary',
  external_id TEXT NOT NULL,
  thumbnail_url TEXT,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  duration FLOAT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- Similar policies for images and videos
CREATE POLICY "Users can view their own images"
  ON images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM categories
    WHERE categories.id = images.category_id
    AND categories.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own images"
  ON images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM categories
    WHERE categories.id = images.category_id
    AND categories.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own images"
  ON images FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM categories
    WHERE categories.id = images.category_id
    AND categories.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own images"
  ON images FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM categories
    WHERE categories.id = images.category_id
    AND categories.user_id = auth.uid()
  ));

-- Similar policies for videos
CREATE POLICY "Users can view their own videos"
  ON videos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM categories
    WHERE categories.id = videos.category_id
    AND categories.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own videos"
  ON videos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM categories
    WHERE categories.id = videos.category_id
    AND categories.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own videos"
  ON videos FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM categories
    WHERE categories.id = videos.category_id
    AND categories.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own videos"
  ON videos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM categories
    WHERE categories.id = videos.category_id
    AND categories.user_id = auth.uid()
  )); 