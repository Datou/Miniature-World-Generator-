
import React, { useState } from 'react';
import { AppStatus, EngineeredPrompt, UserInput } from './types';
import { engineerPrompt, generatePosterImage } from './services/geminiService';
import InputSection from './components/InputSection';
import PromptDisplay from './components/PromptDisplay';
import ImageResult from './components/ImageResult';
import { Sparkles, AlertCircle, KeyRound } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [promptData, setPromptData] = useState<EngineeredPrompt | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkApiKey = async () => {
    try {
        if (window.aistudio && window.aistudio.hasSelectedApiKey) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await window.aistudio.openSelectKey();
                return true; 
            }
            return true;
        }
    } catch (e) {
        console.error("Error checking API key", e);
    }
    return false;
  };

  const handleGenerate = async (input: UserInput) => {
    await checkApiKey();

    setStatus(AppStatus.ANALYZING);
    setErrorMsg(null);
    setPromptData(null);
    setResultImage(null);

    try {
      // Pass navigator.language to service for localization
      const userLocale = navigator.language;
      const engineeredData = await engineerPrompt(input.text, input.imageBase64, userLocale);
      setPromptData(engineeredData);

      setStatus(AppStatus.GENERATING_IMAGE);
      const imageUrl = await generatePosterImage(
          engineeredData.visualPrompt, 
          input.aspectRatio, 
          input.imageSize,
          input.imageBase64
      );
      
      setResultImage(imageUrl);
      setStatus(AppStatus.SUCCESS);

    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      
      const message = err.message || "An unexpected error occurred.";
      setErrorMsg(message);

      if (message.includes("403") || message.includes("permission")) {
         if (window.aistudio && window.aistudio.openSelectKey) {
             setErrorMsg("Permission Denied. Please select a valid paid API key.");
             await window.aistudio.openSelectKey();
         }
      }
    }
  };

  const openKeySelection = async () => {
      if (window.aistudio && window.aistudio.openSelectKey) {
          await window.aistudio.openSelectKey();
      }
  };

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#0d1117] text-gray-200 selection:bg-blue-500/30 flex flex-col relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-[1800px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:h-full max-h-screen">
        {/* Header */}
        <header className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg shadow-blue-500/20">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Miniature World Generator</h1>
              <p className="text-xs text-blue-300/80 font-medium tracking-wide uppercase">Powered by Gemini 3 Pro & Nano Banana Pro</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 self-end md:self-auto">
             <button 
                onClick={openKeySelection}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-xs text-gray-400 hover:text-white transition-colors border border-gray-700"
             >
                <KeyRound size={12} />
                <span>API Key</span>
             </button>

            {errorMsg && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm animate-fade-in">
                <AlertCircle size={16} />
                {errorMsg}
                </div>
            )}
          </div>
        </header>

        {/* Main Content - Grid on Desktop, Stack on Mobile */}
        <main className="flex-grow min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 w-full pb-2">
          
          {/* Column 1: Input */}
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <InputSection status={status} onSubmit={handleGenerate} />
          </div>

          {/* Column 2: Prompt Engineering */}
          <div className="flex flex-col h-[400px] lg:h-full min-h-0 overflow-hidden">
            <PromptDisplay status={status} promptData={promptData} />
          </div>

          {/* Column 3: Result */}
          <div className="flex flex-col h-[400px] lg:h-full min-h-0 overflow-hidden">
            <ImageResult status={status} imageBase64={resultImage} />
          </div>

        </main>
      </div>
    </div>
  );
};

export default App;
