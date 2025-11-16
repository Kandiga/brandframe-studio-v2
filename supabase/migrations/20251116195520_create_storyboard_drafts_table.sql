/*
  # Create storyboard_drafts table for saving work in progress

  1. New Tables
    - `storyboard_drafts`
      - `id` (uuid, primary key) - Unique identifier for the draft
      - `user_id` (text) - User identifier (stored as text for simplicity, no auth required)
      - `title` (text) - User-provided name for the draft
      - `draft_data` (jsonb) - Complete wizard state including files, settings, and step position
      - `step_position` (integer) - Current step number where user left off (1-5)
      - `thumbnail_url` (text, nullable) - Preview image URL for draft card
      - `created_at` (timestamptz) - When the draft was first created
      - `updated_at` (timestamptz) - When the draft was last modified

  2. Indexes
    - Index on `user_id` for fast draft retrieval by user
    - Index on `updated_at` for sorting drafts by recency

  3. Security
    - Enable RLS on `storyboard_drafts` table
    - Add policy for users to read their own drafts
    - Add policy for users to insert their own drafts
    - Add policy for users to update their own drafts
    - Add policy for users to delete their own drafts

  4. Notes
    - No authentication system in place, so user_id is a simple string (e.g., device ID or localStorage key)
    - draft_data stores the complete wizard state as JSON
    - Drafts auto-save every 30 seconds and can be manually saved
    - Drafts are cleared after successful storyboard generation
*/

CREATE TABLE IF NOT EXISTS storyboard_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL DEFAULT 'default-user',
  title text NOT NULL,
  draft_data jsonb NOT NULL,
  step_position integer NOT NULL DEFAULT 1,
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storyboard_drafts_user_id ON storyboard_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_drafts_updated_at ON storyboard_drafts(updated_at DESC);

ALTER TABLE storyboard_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own drafts"
  ON storyboard_drafts FOR SELECT
  USING (user_id = 'default-user' OR user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can insert their own drafts"
  ON storyboard_drafts FOR INSERT
  WITH CHECK (user_id = 'default-user' OR user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can update their own drafts"
  ON storyboard_drafts FOR UPDATE
  USING (user_id = 'default-user' OR user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = 'default-user' OR user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can delete their own drafts"
  ON storyboard_drafts FOR DELETE
  USING (user_id = 'default-user' OR user_id = current_setting('app.user_id', true));