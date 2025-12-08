
import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Type, Image as ImageIcon, Sparkles, Settings2 } from 'lucide-react';
import { AppStatus, UserInput, AspectRatio, ImageSize } from '../types';

interface InputSectionProps {
  status: AppStatus;
  onSubmit: (input: UserInput) => void;
}

const InputSection: React.FC<InputSectionProps> = ({ status, onSubmit }) => {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Paste Event Globally within the component
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // Iterate using index to avoid iterator issues on some DataTransferItemList implementations
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleFileSelect(file);
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileSelect = (file: File) => {
    // Safety check for file existence and type
    if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) return;
    
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageBase64(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!text && !imageBase64) return;
    onSubmit({
      text,
      image: imageFile,
      imageBase64,
      aspectRatio,
      imageSize,
    });
  };

  const isLoading = status === AppStatus.ANALYZING || status === AppStatus.GENERATING_IMAGE;

  return (
    <div className="h-full flex flex-col gap-4">
      
      {/* Main Input Area - Flex container to keep boxes equal size */}
      <div className="flex-grow flex flex-col gap-4 min-h-0">
        
        {/* 1. Text Input */}
        <div className="flex-1 min-h-[100px] glass-panel rounded-xl p-4 flex flex-col relative focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <Type size={16} />
            <span className="text-xs font-medium uppercase tracking-wider">Prompt / Idea (Optional)</span>
          </div>
          <textarea
            className="flex-grow w-full bg-transparent border-none outline-none resize-none text-gray-200 placeholder-gray-600 custom-scrollbar text-base leading-relaxed"
            placeholder="Describe your miniature world... (e.g., 'A cyberpunk ramen shop inside an old radio')"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* 2. Image Input */}
        <div 
          className={`flex-1 min-h-[100px] glass-panel rounded-xl p-4 flex flex-col relative transition-all duration-200
            ${isDragOver ? 'border-blue-500 bg-blue-500/10' : ''}
            ${!imageBase64 ? 'hover:bg-white/5 cursor-pointer' : ''}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          onClick={() => !imageBase64 && fileInputRef.current?.click()}
        >
          <div className="flex items-center justify-between mb-2 text-gray-400 z-10">
            <div className="flex items-center gap-2">
              <ImageIcon size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">Reference (Optional)</span>
            </div>
            {imageBase64 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setImageBase64(null); setImageFile(null); }}
                className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex-grow flex items-center justify-center relative overflow-hidden rounded-lg bg-black/20 border border-gray-800/50 border-dashed">
            {imageBase64 ? (
              <img 
                src={imageBase64} 
                alt="Reference" 
                className="w-full h-full object-contain" 
              />
            ) : (
              <div className="text-center p-4">
                <Upload size={24} className="mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-400">Click or Paste Image</p>
                <p className="text-xs text-gray-600 mt-1">Ctrl+V supported</p>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                }
            }}
          />
        </div>

      </div>

      {/* Settings Row */}
      <div className="glass-panel rounded-xl p-3 flex flex-wrap gap-4 items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
           {/* Aspect Ratio */}
           <div className="flex items-center gap-2">
              <Settings2 size={14} className="text-gray-500" />
              <select 
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="bg-transparent text-xs text-gray-300 outline-none cursor-pointer hover:text-white"
                disabled={isLoading}
              >
                <option value="1:1" className="bg-gray-800 text-gray-200">1:1 Square</option>
                <option value="3:4" className="bg-gray-800 text-gray-200">3:4 Portrait</option>
                <option value="4:3" className="bg-gray-800 text-gray-200">4:3 Landscape</option>
                <option value="9:16" className="bg-gray-800 text-gray-200">9:16 Mobile</option>
                <option value="16:9" className="bg-gray-800 text-gray-200">16:9 Cinema</option>
              </select>
           </div>
           
           <div className="w-px h-4 bg-gray-700"></div>

           {/* Size (Simulated for UI) */}
           <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Size</span>
              <select 
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value as ImageSize)}
                className="bg-transparent text-xs text-gray-300 outline-none cursor-pointer hover:text-white"
                disabled={isLoading}
              >
                <option value="1K" className="bg-gray-800 text-gray-200">1K</option>
                <option value="2K" className="bg-gray-800 text-gray-200">2K</option>
                <option value="4K" className="bg-gray-800 text-gray-200">4K</option>
              </select>
           </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || (!text && !imageBase64)}
        className={`
          w-full py-4 rounded-xl font-semibold text-sm tracking-wide transition-all shadow-lg flex-shrink-0
          flex items-center justify-center gap-2
          ${isLoading 
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/20'
          }
        `}
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Sparkles size={18} />
            <span>Generate Miniature World</span>
          </>
        )}
      </button>
    </div>
  );
};

export default InputSection;
