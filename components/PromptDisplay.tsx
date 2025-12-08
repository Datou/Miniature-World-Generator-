import React from 'react';
import { EngineeredPrompt, AppStatus } from '../types';
import { Terminal, Wand2, Link2 } from 'lucide-react';

interface PromptDisplayProps {
  promptData: EngineeredPrompt | null;
  status: AppStatus;
}

const PromptDisplay: React.FC<PromptDisplayProps> = ({ promptData, status }) => {
  // Skeleton loader for when analyzing
  if (status === AppStatus.ANALYZING) {
    return (
        <div className="h-full flex flex-col p-6 glass-panel rounded-2xl animate-pulse">
            <div className="h-8 w-1/3 bg-gray-700 rounded mb-6 flex-shrink-0"></div>
            <div className="space-y-4 flex-grow">
                <div className="h-4 bg-gray-800 rounded w-full"></div>
                <div className="h-4 bg-gray-800 rounded w-5/6"></div>
                <div className="h-4 bg-gray-800 rounded w-4/6"></div>
                <div className="h-32 bg-gray-800 rounded w-full mt-8"></div>
            </div>
        </div>
    )
  }

  if (!promptData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 glass-panel rounded-2xl text-gray-500 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
            <Wand2 size={32} className="opacity-50" />
        </div>
        <h3 className="text-lg font-medium mb-2">Prompt Engineer AI</h3>
        <p className="text-sm max-w-xs">
          Your input will be analyzed and transformed into a professional 3D art prompt here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 glass-panel rounded-2xl overflow-hidden">
      <div className="flex-shrink-0 flex items-center gap-2 mb-4">
        <Terminal size={20} className="text-blue-400" />
        <h2 className="text-xl font-bold text-gray-200">Engineered Prompt</h2>
      </div>

      <div className="flex-grow flex flex-col min-h-0 gap-4">
        {/* Extracted Metadata - Constrained height to ensure it doesn't dominate */}
        <div className="flex-shrink-0 overflow-y-auto max-h-[40%] custom-scrollbar space-y-4 pr-2">
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
            <div className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">Extracted Metadata</div>
            
            <div className="grid grid-cols-1 gap-4">
                <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <div className="text-lg font-serif text-white">{promptData.posterTitle}</div>
                </div>
                <div>
                <label className="block text-xs text-gray-400 mb-1">Subtitle / Context</label>
                <div className="text-sm font-mono text-yellow-400">{promptData.posterSubtitle}</div>
                </div>
            </div>
            </div>

            {/* Grounding Sources (if available) */}
            {promptData.groundingSources && promptData.groundingSources.length > 0 && (
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 flex items-center gap-2">
                <Link2 size={12} />
                <span>Sources</span>
                </div>
                <ul className="space-y-2">
                {promptData.groundingSources.map((source, idx) => (
                    <li key={idx}>
                    <a 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 truncate block transition-colors flex items-center gap-2"
                    >
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></span>
                        {source.title}
                    </a>
                    </li>
                ))}
                </ul>
            </div>
            )}
        </div>

        {/* The Visual Prompt - Takes remaining space and scrolls internally */}
        <div className="flex-grow flex flex-col min-h-0 space-y-2">
            <div className="flex-shrink-0 text-xs uppercase tracking-wider text-gray-500 font-bold">Visual Description</div>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-4 bg-black/30 rounded-lg border border-gray-800 text-gray-300 text-sm leading-relaxed font-mono whitespace-pre-wrap">
                {promptData.visualPrompt}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PromptDisplay;