import React, { useState, useEffect } from 'react';
import { YouTubeVideo, Comment } from '../types';
import { fetchVideoComments } from '../services/youtubeService';

interface VideoDetailsModalProps {
  video: YouTubeVideo;
  isOpen: boolean;
  onClose: () => void;
}

const VideoDetailsModal: React.FC<VideoDetailsModalProps> = ({ video, isOpen, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && video.id) {
      loadComments();
    }
  }, [isOpen, video.id]);

  const loadComments = async () => {
    setIsLoadingComments(true);
    setCommentsError(null);
    try {
      const fetchedComments = await fetchVideoComments(video.id, 20);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
      setCommentsError(error instanceof Error ? error.message : 'Failed to load comments');
    } finally {
      setIsLoadingComments(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{video.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="font-medium">{video.channelName}</span>
                <span>•</span>
                <span>{formatNumber(video.viewCount)} views</span>
                {video.likeCount > 0 && <span>• {formatNumber(video.likeCount)} likes</span>}
                {video.commentCount !== undefined && video.commentCount > 0 && (
                  <span>• {formatNumber(video.commentCount)} comments</span>
                )}
                {video.engagementRate !== undefined && video.engagementRate > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-indigo-600">
                      {video.engagementRate.toFixed(2)}% engagement
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-6 py-4">
            {/* Video Info */}
            <div className="mb-6">
              <div className="mb-4">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x450?text=No+Thumbnail';
                  }}
                />
              </div>
              {video.description && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{video.description}</p>
                </div>
              )}
              <div className="mb-4">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Watch on YouTube
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* Comments Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Top Comments {comments.length > 0 && `(${comments.length})`}
                </h3>
                {comments.length > 0 && (
                  <button
                    onClick={loadComments}
                    disabled={isLoadingComments}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:text-gray-400"
                  >
                    Refresh
                  </button>
                )}
              </div>

              {isLoadingComments && comments.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <svg
                    className="animate-spin h-8 w-8 text-indigo-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              ) : commentsError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{commentsError}</p>
                  <button
                    onClick={loadComments}
                    className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No comments available for this video.</p>
                  <p className="text-sm mt-2">Comments may be disabled or not yet loaded.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{comment.author}</span>
                          <span className="text-xs text-gray-500">
                            {formatDate(comment.publishedAt)}
                          </span>
                        </div>
                        {comment.likeCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.834a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                            </svg>
                            <span>{formatNumber(comment.likeCount)}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetailsModal;

