
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';
import { logInfo, logWarn, logError } from '../utils/logger.js';

interface ImageUploadProps {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  onFileChange: (file: File | null) => void;
  previewUrl: string | null;
  multiple?: boolean;
  maxFiles?: number;
  onMultipleFilesChange?: (files: File[]) => void;
  previewUrls?: string[];
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  id, 
  title, 
  subtitle, 
  buttonText, 
  onFileChange, 
  previewUrl,
  multiple = false,
  maxFiles,
  onMultipleFilesChange,
  previewUrls = []
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChangeInternal = (file: File | null) => {
    if (file) {
      if (file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        logInfo('File uploaded successfully', {
          category: 'VALIDATION',
          component: 'ImageUpload',
          action: 'file-upload',
          fileType: file.type,
          fileSize: `${(file.size / 1024).toFixed(2)}KB`,
          fileName: file.name,
          uploadId: id,
        });
        onFileChange(file);
      } else {
        logWarn('Invalid file type uploaded', {
          category: 'VALIDATION',
          component: 'ImageUpload',
          action: 'file-validation-failed',
          fileType: file.type,
          fileName: file.name,
          uploadId: id,
        });
        alert(`Invalid file type: ${file.type}. Please upload an image file (PNG, JPG, or SVG).`);
        onFileChange(null);
      }
    } else {
      logInfo('File removed', {
        category: 'USER_ACTION',
        component: 'ImageUpload',
        action: 'file-remove',
        uploadId: id,
      });
      onFileChange(null);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (multiple && onMultipleFilesChange) {
        const imageFiles = Array.from(e.dataTransfer.files).filter(
          file => file.type.startsWith('image/') || file.type === 'image/svg+xml'
        );
        if (maxFiles && imageFiles.length > maxFiles) {
          alert(`Maximum ${maxFiles} files allowed. Only the first ${maxFiles} will be added.`);
          imageFiles.splice(maxFiles);
        }
        if (imageFiles.length > 0) {
          onMultipleFilesChange(imageFiles);
        } else {
          alert('No valid image files found. Please upload image files (PNG, JPG, or SVG).');
        }
      } else {
        const file = e.dataTransfer.files[0];
        if (file && (file.type.startsWith('image/') || file.type === 'image/svg+xml')) {
          logInfo('File dropped successfully', {
            category: 'USER_ACTION',
            component: 'ImageUpload',
            action: 'file-drop',
            fileType: file.type,
            fileSize: `${(file.size / 1024).toFixed(2)}KB`,
            fileName: file.name,
            uploadId: id,
          });
          onFileChange(file);
        } else {
          logWarn('Invalid file type dropped', {
            category: 'VALIDATION',
            component: 'ImageUpload',
            action: 'file-drop-validation-failed',
            fileType: file?.type,
            fileName: file?.name,
            uploadId: id,
          });
          alert(`Invalid file type: ${file.type}. Please upload an image file (PNG, JPG, or SVG).`);
          onFileChange(null);
        }
      }
      e.dataTransfer.clearData();
    }
  }, [onFileChange, multiple, onMultipleFilesChange, maxFiles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (multiple && onMultipleFilesChange) {
        const imageFiles = Array.from(e.target.files).filter(
          file => file.type.startsWith('image/') || file.type === 'image/svg+xml'
        );
        if (maxFiles && imageFiles.length > maxFiles) {
          alert(`Maximum ${maxFiles} files allowed. Only the first ${maxFiles} will be added.`);
          imageFiles.splice(maxFiles);
        }
        if (imageFiles.length > 0) {
          onMultipleFilesChange(imageFiles);
        } else {
          alert('No valid image files found. Please upload image files (PNG, JPG, or SVG).');
        }
      } else {
        handleFileChangeInternal(e.target.files[0]);
      }
    } else {
      if (!multiple) {
        handleFileChangeInternal(null);
      }
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative p-6 bg-white rounded-xl border-2 border-dashed transition-all duration-300 ${
        isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
      }`}
    >
      {multiple && previewUrls.length > 0 ? (
        <div className="flex flex-col items-center text-center">
          <div className="grid grid-cols-3 gap-2 mb-4 w-full">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative">
                <img src={url} alt={`Preview ${index + 1}`} className="w-full h-20 object-cover rounded" />
                <button
                  onClick={() => {
                    // File removal is handled by parent component via onRemoveCharacter prop
                    // This button is just for visual feedback
                  }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mb-2">{previewUrls.length} {previewUrls.length === 1 ? 'image' : 'images'} uploaded</p>
          <label
            htmlFor={id}
            className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Add More
          </label>
        </div>
      ) : previewUrl ? (
        <div className="flex flex-col items-center text-center">
          <img src={previewUrl} alt="Preview" className="max-h-24 mb-4 object-contain" />
          <button
            onClick={() => {
              onFileChange(null);
              const input = document.getElementById(id) as HTMLInputElement;
              if (input) input.value = '';
            }}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">{subtitle}</p>
          <label
            htmlFor={id}
            className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <UploadIcon className="w-5 h-5" />
            {buttonText}
          </label>
          <input
            id={id}
            type="file"
            className="hidden"
            accept="image/png, image/jpeg, image/svg+xml"
            onChange={handleInputChange}
            multiple={multiple}
          />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
