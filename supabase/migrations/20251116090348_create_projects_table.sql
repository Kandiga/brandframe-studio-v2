/*
  # Create projects table for BrandFrame Studio

  1. New Tables
    - `projects`
      - `id` (uuid, primary key) - Unique project identifier
      - `user_id` (uuid) - Reference to user who created the project
      - `title` (text) - Project title
      - `story` (text) - Story description
      - `aspect_ratio` (text) - Aspect ratio (16:9 or 9:16)
      - `frame_count` (integer) - Number of frames in the project
      - `storyboard` (jsonb) - Complete storyboard data (scenes, images, etc.)
      - `logo_asset` (text, nullable) - Logo image URL or base64
      - `main_character_asset` (text, nullable) - Main character image URL or base64
      - `additional_character_assets` (jsonb, nullable) - Array of additional character images
      - `background_asset` (text, nullable) - Background image URL or base64
      - `art_style_asset` (text, nullable) - Art style reference image URL or base64
      - `created_at` (timestamptz) - Project creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `projects` table
    - Add policy for authenticated users to read their own projects
    - Add policy for authenticated users to create their own projects
    - Add policy for authenticated users to update their own projects
    - Add policy for authenticated users to delete their own projects
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  story text NOT NULL DEFAULT '',
  aspect_ratio text NOT NULL DEFAULT '16:9',
  frame_count integer NOT NULL DEFAULT 4,
  storyboard jsonb,
  logo_asset text,
  main_character_asset text,
  additional_character_assets jsonb DEFAULT '[]'::jsonb,
  background_asset text,
  art_style_asset text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects(created_at DESC);