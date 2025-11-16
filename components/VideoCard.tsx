import React, { useState } from 'react';
import { YouTubeVideo } from '../types';
import VideoDetailsModal from './VideoDetailsModal';

interface VideoCardProps {
  video: YouTubeVideo;
  onSelect: (video: YouTubeVideo) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onSelect }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/320x180?text=No+Thumbnail';
          }}
        />
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration)}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">
          {video.title}
        </h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-[2.5rem]">
          {video.description || 'No description available'}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span className="font-medium">{video.channelName}</span>
          <div className="flex items-center gap-3">
            <span>{formatNumber(video.viewCount)} views</span>
            {video.likeCount > 0 && (
              <span>{formatNumber(video.likeCount)} likes</span>
            )}
            {video.commentCount !== undefined && video.commentCount > 0 && (
              <span>{formatNumber(video.commentCount)} comments</span>
            )}
          </div>
        </div>
        {video.engagementRate !== undefined && video.engagementRate > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Engagement:</span>
              <span className="font-semibold text-indigo-600">
                {video.engagementRate.toFixed(2)}%
              </span>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            View Details
          </button>
          <button
            onClick={() => onSelect(video)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Use as Inspiration
          </button>
        </div>
      </div>
      </div>
      <VideoDetailsModal
        video={video}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default VideoCard;

