
import React from 'react';
import { Storyboard } from '../types';

interface ScriptViewProps {
  storyboard: Storyboard | null;
}

const ScriptView: React.FC<ScriptViewProps> = ({ storyboard }) => {
  if (!storyboard) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Your generated script will appear here.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 prose max-w-none">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Generated Script</h2>
      <div className="space-y-6">
        {storyboard.scenes.map((scene) => (
          <div key={scene.id} className="p-4 border rounded-lg bg-white shadow-sm">
            <h3 className="font-bold text-indigo-600">{scene.title}</h3>
            <p className="mt-2 text-lg text-gray-700">"{scene.scriptLine}"</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Emotion: {scene.emotion}
              </span>
              <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Intent: {scene.intent}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScriptView;
