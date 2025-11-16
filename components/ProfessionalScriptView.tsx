
import React, { useState } from 'react';
import { Storyboard } from '../types';

interface ProfessionalScriptViewProps {
  storyboard: Storyboard | null;
}

const LayerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const ProfessionalScriptView: React.FC<ProfessionalScriptViewProps> = ({ storyboard }) => {
  const [expandedScene, setExpandedScene] = useState<number | null>(null);

  if (!storyboard) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Your professional screenplay will appear here.</p>
      </div>
    );
  }

  const toggleScene = (sceneId: number) => {
    setExpandedScene(expandedScene === sceneId ? null : sceneId);
  };

  const tiers = [
    { key: 'cinematographyFormat', label: 'TIER 1: Cinematography & Format', icon: '🎥', color: 'bg-red-50 border-red-300', textColor: 'text-red-900', tier: 1 },
    { key: 'subjectIdentity', label: 'TIER 2: Subject Identity', icon: '👤', color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-900', tier: 2 },
    { key: 'sceneContext', label: 'TIER 3: Scene & Context', icon: '🏛️', color: 'bg-green-50 border-green-200', textColor: 'text-green-900', tier: 3 },
    { key: 'action', label: 'TIER 4: Action', icon: '🎬', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-900', tier: 4 },
    { key: 'cameraComposition', label: 'TIER 4: Camera & Composition', icon: '📹', color: 'bg-cyan-50 border-cyan-200', textColor: 'text-cyan-900', tier: 4 },
    { key: 'styleAmbiance', label: 'TIER 5: Style & Ambiance', icon: '🎨', color: 'bg-pink-50 border-pink-200', textColor: 'text-pink-900', tier: 5 },
    { key: 'audioDialogue', label: 'TIER 6: Audio & Dialogue', icon: '🎵', color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-900', tier: 6 },
    { key: 'technicalNegative', label: 'TIER 7: Technical & Negative', icon: '❌', color: 'bg-gray-50 border-gray-300', textColor: 'text-gray-900', tier: 7 },
  ];

  return (
    <div className="mt-8 max-w-none">
      <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <LayerIcon className="w-6 h-6 text-indigo-600" />
          Professional Screenplay: Master Screenplay Architect
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Level 9 Broadcast Quality - Master Screenplay Architect with 8-component tier hierarchy, Story-World Parameterization, and Plot-Algorithm mechanism.
        </p>
      </div>

      <div className="space-y-6">
        {storyboard.scenes.map((scene) => {
          const isExpanded = expandedScene === scene.id;

          return (
            <div key={scene.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Scene Header */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleScene(scene.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-indigo-600">{scene.title}</h3>
                    <p className="mt-2 text-lg text-gray-700 italic">"{scene.scriptLine}"</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                        Emotion: {scene.emotion}
                      </span>
                      <span className="text-xs font-semibold bg-green-100 text-green-800 px-3 py-1 rounded-full">
                        Intent: {scene.intent}
                      </span>
                    </div>
                  </div>
                  <button className="ml-4 text-gray-400 hover:text-gray-600">
                    <svg
                      className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 8-Component Tier Hierarchy - Expanded */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-4">
                    8-Component Tier Hierarchy (Level 9 Broadcast Quality)
                  </h4>
                  <div className="space-y-4">
                    {tiers.map(tier => {
                      const value = scene[tier.key as keyof typeof scene];
                      // Handle backward compatibility - check both new and old field names
                      let displayValue = value as string;
                      if (!displayValue) {
                        // Fallback to deprecated fields for backward compatibility
                        if (tier.key === 'subjectIdentity' && scene.subject) displayValue = scene.subject;
                        else if (tier.key === 'sceneContext' && scene.sceneDescription) displayValue = scene.sceneDescription;
                        else if (tier.key === 'styleAmbiance' && scene.style) displayValue = scene.style;
                        else if (tier.key === 'cameraComposition' && scene.cinematography) displayValue = scene.cinematography;
                      }
                      return (
                        <div key={tier.key} className={`p-4 rounded-lg border ${tier.color}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{tier.icon}</span>
                            <h5 className={`font-bold ${tier.textColor}`}>
                              {tier.label}
                              {tier.tier === 1 && <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">CRITICAL</span>}
                            </h5>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{displayValue || 'Not specified'}</p>
                        </div>
                      );
                    })}

                    {/* Veo 3.1 Prompt - Special Section */}
                    <div className="p-4 rounded-lg border bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🎥</span>
                        <h5 className="font-bold text-indigo-900">Veo 3.1 Comprehensive Prompt</h5>
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">Optimized</span>
                      </div>
                      <p className="text-gray-700 text-sm font-mono whitespace-pre-wrap bg-white p-3 rounded border border-indigo-200">
                        {scene.veoPrompt}
                      </p>
                      <p className="mt-2 text-xs text-gray-500 italic">
                        Includes "(thats where the camera is)" positioning syntax for Veo 3.1 optimization
                      </p>
                    </div>

                    {/* Optional: Three-Layer Architecture Display */}
                    {(scene.deepStructure || scene.intermediateStructure || scene.surfaceStructure) && (
                      <div className="p-4 rounded-lg border bg-gradient-to-r from-slate-50 to-gray-50 border-slate-300 mt-4">
                        <h5 className="font-bold text-slate-900 mb-3">Three-Layer Architecture</h5>
                        <div className="space-y-2 text-sm">
                          {scene.deepStructure && (
                            <div>
                              <span className="font-semibold text-slate-700">[DS] Deep Structure:</span>
                              <p className="text-gray-600 ml-4">{scene.deepStructure}</p>
                            </div>
                          )}
                          {scene.intermediateStructure && (
                            <div>
                              <span className="font-semibold text-slate-700">[IS] Intermediate Structure:</span>
                              <p className="text-gray-600 ml-4">{scene.intermediateStructure}</p>
                            </div>
                          )}
                          {scene.surfaceStructure && (
                            <div>
                              <span className="font-semibold text-slate-700">[SS] Surface Structure:</span>
                              <p className="text-gray-600 ml-4">{scene.surfaceStructure}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h4 className="text-sm font-bold text-gray-700 mb-3">Level 9 Master Screenplay Architect Methodology</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-gray-600">
          <div>
            <strong>Story-World [SW]:</strong> Parameterization with Deep/Intermediate Structure
          </div>
          <div>
            <strong>Plot-Algorithm [PA]:</strong> Goal-Path orientation with Difference-Engine
          </div>
          <div>
            <strong>Character Continuity:</strong> Verbatim consistency (word-for-word copying)
          </div>
          <div>
            <strong>Attention Hierarchy:</strong> Tier 1-7 front-loading to overcome Transformer decay
          </div>
          <div>
            <strong>Technical Excellence:</strong> ARRI Alexa Mini LF / Sony Venice, 35mm T1.5, 1080p/4K
          </div>
          <div>
            <strong>Broadcast Quality:</strong> All 8 components with Veo 3.1 optimization
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalScriptView;
