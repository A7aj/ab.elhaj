import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { AudioFileIcon } from './icons/AudioFileIcon';
import { CloseIcon } from './icons/CloseIcon';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    onFileChange(file);
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    onFileChange(null);
  };
  
  if (selectedFile) {
    return (
      <div className="bg-sky-50 dark:bg-sky-900/50 border border-sky-200 dark:border-sky-800 rounded-lg p-3 flex items-center justify-between transition-all">
        <div className="flex items-center min-w-0">
          <AudioFileIcon className="w-7 h-7 text-sky-500 flex-shrink-0" />
          <div className="mr-3 min-w-0">
            <p className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">{selectedFile.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
        <button onClick={handleRemoveFile} className="p-1 text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/50' : 'border-slate-300 dark:border-slate-600 hover:border-sky-400 dark:hover:border-sky-500 bg-slate-50 dark:bg-slate-700/50'}`}
    >
      <div className="flex flex-col items-center justify-center pt-5 pb-6">
        <UploadIcon className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-500" />
        <p className="mb-1 text-xs text-slate-500 dark:text-slate-400 text-center"><span className="font-semibold">انقر للرفع</span> أو اسحب وأفلت الملف هنا</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">MP3, WAV, M4A, OGG, AAC</p>
      </div>
      <input 
        id="dropzone-file" 
        type="file" 
        className="hidden" 
        onChange={handleInputChange} 
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.amr,.wma,.m4b" 
      />
    </label>
  );
};