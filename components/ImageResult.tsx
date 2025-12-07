import React from 'react';
import { AppStatus } from '../types';
import { Image as ImageIcon, Download, Maximize2 } from 'lucide-react';

interface ImageResultProps {
  imageBase64: string | null;
  status: AppStatus;
}

const ImageResult: React.FC<ImageResultProps> = ({ imageBase64, status }) => {
  const handleDownload = () => {
    if (imageBase64) {
      const link = document.createElement('a');
      link.href = imageBase64;
      link.download = `gemini-miniature-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (status === AppStatus.GENERATING_IMAGE) {
    return (
      <div className="h-full w-full glass-panel rounded-2xl flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-purple-500/10 animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white">Rendering Scene</h3>
                <p className="text-sm text-gray-400">Gemini is constructing your miniature world...</p>
            </div>
        </div>
      </div>
    );
  }

  if (!imageBase64) {
    return (
      <div className="h-full w-full glass-panel rounded-2xl flex flex-col items-center justify-center p-8 text-gray-500 border-2 border-dashed border-gray-800/50">
        <ImageIcon size={48} className="mb-4 opacity-30" />
        <p className="text-sm">Generated artwork will appear here</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full glass-panel rounded-2xl p-2 flex flex-col relative group">
      <div className="relative flex-grow rounded-xl overflow-hidden bg-black/50 flex items-center justify-center">
        <img 
          src={imageBase64} 
          alt="Generated Miniature" 
          className="max-h-full max-w-full object-contain shadow-2xl"
        />
        
        {/* Overlay Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-3">
            <button 
                onClick={() => window.open(imageBase64, '_blank')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md transition-colors"
                title="Open Full Size"
            >
                <Maximize2 size={20} />
            </button>
            <button 
                onClick={handleDownload}
                className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white shadow-lg transition-colors flex items-center gap-2 px-4"
            >
                <Download size={20} />
                <span className="font-medium text-sm">Download</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImageResult;
