import { useState, useEffect, useCallback } from 'react';
import { SavedProject } from '../types.js';
import { useLocalStorage } from './useLocalStorage.js';
import { STORAGE_KEYS } from '../constants/index.js';
import { logInfo, logError, logWarn } from '../utils/logger.js';

/**
 * Custom hook for managing saved projects
 */
export function useProjects() {
  const [projects, setProjects, removeProjects] = useLocalStorage<SavedProject[]>(
    STORAGE_KEYS.PROJECTS,
    []
  );

  const saveProject = useCallback((project: SavedProject) => {
    try {
      setProjects((prevProjects) => {
        // Limit to last 50 projects to prevent quota issues
        const updated = [project, ...prevProjects];
        const limited = updated.slice(0, 50);
        
        logInfo('Project saved successfully', {
          category: 'STORAGE',
          component: 'useProjects',
          action: 'save',
          projectId: project.id,
          projectName: project.name,
          totalProjects: limited.length,
        });
        
        return limited;
      });
    } catch (error) {
      logError('Failed to save project', error, {
        category: 'STORAGE',
        component: 'useProjects',
        action: 'save',
        projectId: project.id,
        projectName: project.name,
      });
      
      // Try to clear old projects and retry
      try {
        setProjects((prevProjects) => {
          // Keep only last 20 projects
          const limited = prevProjects.slice(0, 19);
          const updated = [project, ...limited];
          
          logWarn('Retrying project save after cleanup', {
            category: 'STORAGE',
            component: 'useProjects',
            action: 'save-retry',
            projectId: project.id,
            keptProjects: limited.length,
          });
          
          return updated;
        });
      } catch (retryError) {
        logError('Failed to save project even after cleanup', retryError, {
          category: 'STORAGE',
          component: 'useProjects',
          action: 'save-retry-failed',
          projectId: project.id,
        });
        throw new Error('Storage quota exceeded. Please delete old projects manually.');
      }
    }
  }, [setProjects]);

  const deleteProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    
    setProjects((prevProjects) => {
      const filtered = prevProjects.filter(p => p.id !== projectId);
      
      logInfo('Project deleted', {
        category: 'STORAGE',
        component: 'useProjects',
        action: 'delete',
        projectId,
        projectName: project?.name,
        remainingProjects: filtered.length,
      });
      
      return filtered;
    });
  }, [setProjects, projects]);

  const loadProject = useCallback((projectId: string): SavedProject | undefined => {
    const project = projects.find(p => p.id === projectId);
    
    logInfo('Project loaded', {
      category: 'STORAGE',
      component: 'useProjects',
      action: 'load',
      projectId,
      found: !!project,
      projectName: project?.name,
    });
    
    return project;
  }, [projects]);

  const clearAllProjects = useCallback(() => {
    const projectsCount = projects.length;
    
    logInfo('Clearing all projects', {
      category: 'STORAGE',
      component: 'useProjects',
      action: 'clearAll',
      projectsCount,
    });
    
    removeProjects();
  }, [removeProjects, projects]);

  return {
    projects,
    saveProject,
    deleteProject,
    loadProject,
    clearAllProjects,
  };
}

