import React, { useState, useRef, useEffect } from 'react';
import { AppStatus, UserInput, AspectRatio, ImageSize } from '../types';
import { Upload, X, ArrowRight, Loader2, Settings2 } from 'lucide-react';

interface InputSectionProps {
  status: AppStatus;
  onSubmit: (input: UserInput) => void;
}

const InputSection: React.FC<InputSectionProps> = ({ status, onSubmit }) => {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [imageSize, setImageSize] = useState<ImageSize>('4K');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const processFile = (file: File | undefined) => {
    if (file && file.type.startsWith('image/')) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (isProcessing) return;
    
    // Check if there are files in clipboard
    if (e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
            e.preventDefault();
            processFile(file);
        }
    }
  };

  const clearImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImageFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (!text && !imageFile) return;
    
    onSubmit({
      text,
      image: imageFile,
      imageBase64: preview, 
      aspectRatio,
      imageSize
    });
  };

  const isProcessing = status === AppStatus.ANALYZING || status === AppStatus.GENERATING_IMAGE;

  return (
    <div 
        ref={containerRef}
        className="h-full flex flex-col p-6 gap-5 glass-panel rounded-2xl outline-none"
        onPaste={handlePaste}
        tabIndex={0} // Enable div to capture paste events when focused
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          Input
        </h2>
        <p className="text-sm text-gray-400">
          Describe a city, stock, poem, mood, or upload a reference image.
        </p>
      </div>

      {/* Settings Row */}
      <div className="flex gap-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
        <div className="flex-1 space-y-1">
            <label className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <Settings2 size={12} /> Aspect Ratio
            </label>
            <select 
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                disabled={isProcessing}
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none"
            >
                <option value="9:16">9:16 (Portrait)</option>
                <option value="16:9">16:9 (Landscape)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="3:4">3:4 (Portrait)</option>
                <option value="4:3">4:3 (Landscape)</option>
            </select>
        </div>
        <div className="flex-1 space-y-1">
            <label className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <Settings2 size={12} /> Resolution
            </label>
            <select 
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value as ImageSize)}
                disabled={isProcessing}
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none"
            >
                <option value="4K">4K (Ultra HD)</option>
                <option value="2K">2K (Quad HD)</option>
                <option value="1K">1K (Full HD)</option>
            </select>
        </div>
      </div>

      {/* Inputs Container - Equal Sizing */}
      <div className="flex-grow flex flex-col gap-4 min-h-0">
          {/* Text Area */}
          <div className="relative flex-1 min-h-[140px]">
            <textarea
              className="w-full h-full p-4 bg-gray-850/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none resize-none text-gray-200 placeholder-gray-600 transition-all text-sm"
              placeholder="Try: 'Weather in London', 'NVIDIA Stock', 'A cozy cabin in snow', or a classic poem..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          {/* Image Upload */}
          <div className="relative group flex-1 min-h-[140px]">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={isProcessing}
            />
            
            {!preview ? (
              <div 
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`
                  w-full h-full border-2 border-dashed border-gray-700 rounded-xl 
                  flex flex-col items-center justify-center gap-2 
                  text-gray-500 cursor-pointer transition-all
                  ${!isProcessing ? 'hover:border-blue-500/50 hover:bg-gray-800/50' : 'opacity-50 cursor-not-allowed'}
                `}
              >
                <Upload size={20} />
                <div className="flex flex-col items-center">
                    <span className="text-xs font-medium">Upload Reference (Optional)</span>
                    <span className="text-[10px] text-gray-600 mt-1">Click or Paste Image</span>
                </div>
              </div>
            ) : (
              <div 
                className="relative w-full h-full rounded-xl border border-gray-700 bg-gray-900/50 flex items-center justify-center overflow-hidden"
                onClick={() => !isProcessing && fileInputRef.current?.click()}
              >
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-full object-contain" 
                />
                {!isProcessing && (
                  <button 
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/80 text-white rounded-full backdrop-blur-sm transition-colors z-10"
                  >
                    <X size={14} />
                  </button>
                )}
                 <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] text-gray-300 backdrop-blur-md pointer-events-none">
                    Reference
                 </div>
              </div>
            )}
          </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isProcessing || (!text && !imageFile)}
        className={`
          w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2
          transition-all duration-300 shadow-lg text-sm shrink-0
          ${isProcessing || (!text && !imageFile)
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/20'
          }
        `}
      >
        {isProcessing ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <span>Generate Miniature</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>

      {/* Status Messages */}
      {status === AppStatus.ANALYZING && (
        <div className="text-xs text-center text-blue-400 animate-pulse shrink-0">
          Analyzing intent & gathering real-time data (Gemini 3 Pro)...
        </div>
      )}
      {status === AppStatus.GENERATING_IMAGE && (
        <div className="text-xs text-center text-purple-400 animate-pulse shrink-0">
          Rendering {imageSize} 3D scene (Nano Banana Pro)...
        </div>
      )}
    </div>
  );
};

export default InputSection;