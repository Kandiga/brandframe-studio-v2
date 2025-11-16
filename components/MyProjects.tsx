
import React from 'react';
import { MyProjectsIcon, TrashIcon } from './icons';
import { SavedProject } from '../types';

interface MyProjectsProps {
  projects: SavedProject[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

const MyProjects: React.FC<MyProjectsProps> = ({ projects, onLoad, onDelete }) => {
  return (
    <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900">My Projects</h1>
          <p className="mt-2 text-base lg:text-lg text-gray-600">
            A list of your saved storyboards.
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="mt-6 lg:mt-10 flex flex-col items-center justify-center text-center h-[60vh] bg-white p-4 lg:p-6 rounded-xl shadow-lg">
            <MyProjectsIcon className="w-12 h-12 lg:w-16 lg:h-16 text-gray-300" />
            <p className="mt-4 text-base lg:text-lg font-semibold text-gray-700">No projects yet</p>
            <p className="text-sm lg:text-base text-gray-500 max-w-sm mt-1">
              After you generate a storyboard, click "Save Project," and it will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 lg:mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-xl shadow-lg overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col">
                <div className="aspect-video bg-gray-100">
                   {/* Display thumbnail from storyboard frame (works with both old base64 and new file path formats) */}
                   <img 
                     src={project.storyboard.scenes[0]?.frames[0]?.imageUrl || 'https://placehold.co/400x225/cccccc/FFFFFF?text=No+Image'} 
                     alt={project.title} 
                     className="w-full h-full object-cover"
                     onError={(e) => {
                       // Fallback if image fails to load
                       (e.target as HTMLImageElement).src = 'https://placehold.co/400x225/cccccc/FFFFFF?text=No+Image';
                     }}
                   />
                </div>
                <div className="p-3 lg:p-4 flex-grow">
                  <h3 className="font-bold text-base lg:text-lg text-gray-800 truncate" title={project.title}>{project.title}</h3>
                  <p className="text-xs lg:text-sm text-gray-500">
                    Saved on {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 lg:p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2">
                  <button 
                    onClick={() => onLoad(project.id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 lg:px-4 rounded-lg text-xs lg:text-sm transition-colors min-h-[44px] flex-1"
                  >
                    Load Project
                  </button>
                  <button 
                    onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${project.title}"?`)) {
                            onDelete(project.id);
                        }
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Delete project"
                   >
                     <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default MyProjects;
