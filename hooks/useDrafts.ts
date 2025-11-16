import { useState, useEffect, useCallback } from 'react';
import { supabaseConfig } from '../config/supabase';
import { logInfo, logError } from '../utils/logger';

export interface WizardDraftData {
  logoFile?: string | null;
  characterFile?: string | null;
  backgroundFile?: string | null;
  artStyleFile?: string | null;
  characterFiles?: string[];
  storyDescription: string;
  aspectRatio: '16:9' | '9:16';
  frameCount: number;
}

export interface StoryboardDraft {
  id: string;
  user_id: string;
  title: string;
  draft_data: WizardDraftData;
  step_position: number;
  thumbnail_url?: string | null;
  created_at: string;
  updated_at: string;
}

const USER_ID = 'default-user';

export function useDrafts() {
  const [drafts, setDrafts] = useState<StoryboardDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    if (!supabaseConfig.isConfigured) {
      logError('Supabase not configured, skipping draft fetch', new Error('Supabase not configured'), {
        category: 'DRAFT',
        component: 'useDrafts',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${supabaseConfig.url}/rest/v1/storyboard_drafts?user_id=eq.${USER_ID}&order=updated_at.desc`,
        {
          headers: {
            'apikey': supabaseConfig.anonKey,
            'Authorization': `Bearer ${supabaseConfig.anonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch drafts: ${response.statusText}`);
      }

      const data = await response.json();
      setDrafts(data);

      logInfo('Drafts fetched successfully', {
        category: 'DRAFT',
        component: 'useDrafts',
        count: data.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch drafts';
      setError(errorMessage);
      logError('Error fetching drafts', err, {
        category: 'DRAFT',
        component: 'useDrafts',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveDraft = useCallback(async (
    title: string,
    draftData: WizardDraftData,
    stepPosition: number,
    thumbnailUrl?: string | null,
    existingDraftId?: string
  ): Promise<StoryboardDraft | null> => {
    if (!supabaseConfig.isConfigured) {
      logError('Supabase not configured, cannot save draft', new Error('Supabase not configured'), {
        category: 'DRAFT',
        component: 'useDrafts',
      });
      return null;
    }

    setError(null);

    try {
      const now = new Date().toISOString();
      const payload = {
        user_id: USER_ID,
        title,
        draft_data: draftData,
        step_position: stepPosition,
        thumbnail_url: thumbnailUrl,
        updated_at: now,
        ...(existingDraftId ? {} : { created_at: now }),
      };

      const url = existingDraftId
        ? `${supabaseConfig.url}/rest/v1/storyboard_drafts?id=eq.${existingDraftId}`
        : `${supabaseConfig.url}/rest/v1/storyboard_drafts`;

      const response = await fetch(url, {
        method: existingDraftId ? 'PATCH' : 'POST',
        headers: {
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to save draft: ${response.statusText}`);
      }

      const data = await response.json();
      const savedDraft = Array.isArray(data) ? data[0] : data;

      logInfo(existingDraftId ? 'Draft updated successfully' : 'Draft saved successfully', {
        category: 'DRAFT',
        component: 'useDrafts',
        draftId: savedDraft.id,
        title,
      });

      await fetchDrafts();
      return savedDraft;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save draft';
      setError(errorMessage);
      logError('Error saving draft', err, {
        category: 'DRAFT',
        component: 'useDrafts',
      });
      return null;
    }
  }, [fetchDrafts]);

  const loadDraft = useCallback(async (draftId: string): Promise<StoryboardDraft | null> => {
    if (!supabaseConfig.isConfigured) {
      logError('Supabase not configured, cannot load draft', new Error('Supabase not configured'), {
        category: 'DRAFT',
        component: 'useDrafts',
      });
      return null;
    }

    setError(null);

    try {
      const response = await fetch(
        `${supabaseConfig.url}/rest/v1/storyboard_drafts?id=eq.${draftId}`,
        {
          headers: {
            'apikey': supabaseConfig.anonKey,
            'Authorization': `Bearer ${supabaseConfig.anonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load draft: ${response.statusText}`);
      }

      const data = await response.json();
      const draft = data[0];

      if (!draft) {
        throw new Error('Draft not found');
      }

      logInfo('Draft loaded successfully', {
        category: 'DRAFT',
        component: 'useDrafts',
        draftId,
        title: draft.title,
      });

      return draft;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load draft';
      setError(errorMessage);
      logError('Error loading draft', err, {
        category: 'DRAFT',
        component: 'useDrafts',
      });
      return null;
    }
  }, []);

  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    if (!supabaseConfig.isConfigured) {
      logError('Supabase not configured, cannot delete draft', new Error('Supabase not configured'), {
        category: 'DRAFT',
        component: 'useDrafts',
      });
      return false;
    }

    setError(null);

    try {
      const response = await fetch(
        `${supabaseConfig.url}/rest/v1/storyboard_drafts?id=eq.${draftId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': supabaseConfig.anonKey,
            'Authorization': `Bearer ${supabaseConfig.anonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete draft: ${response.statusText}`);
      }

      logInfo('Draft deleted successfully', {
        category: 'DRAFT',
        component: 'useDrafts',
        draftId,
      });

      await fetchDrafts();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete draft';
      setError(errorMessage);
      logError('Error deleting draft', err, {
        category: 'DRAFT',
        component: 'useDrafts',
      });
      return false;
    }
  }, [fetchDrafts]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  return {
    drafts,
    isLoading,
    error,
    saveDraft,
    loadDraft,
    deleteDraft,
    refreshDrafts: fetchDrafts,
  };
}
