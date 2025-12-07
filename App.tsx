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
                // Wait a moment for the state to settle after selection, though prompt says assume success.
                // Re-checking to be safe, or just proceeding.
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
    // 1. Ensure API Key is selected for High-Quality Models
    await checkApiKey();

    setStatus(AppStatus.ANALYZING);
    setErrorMsg(null);
    setPromptData(null);
    setResultImage(null);

    try {
      // Step 1: Analyze text/image and generate prompt
      const engineeredData = await engineerPrompt(input.text, input.imageBase64);
      setPromptData(engineeredData);

      // Step 2: Generate Image
      setStatus(AppStatus.GENERATING_IMAGE);
      const imageUrl = await generatePosterImage(
          engineeredData.visualPrompt, 
          input.aspectRatio, 
          input.imageSize,
          input.imageBase64 // Pass the reference image here
      );
      
      setResultImage(imageUrl);
      setStatus(AppStatus.SUCCESS);

    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      
      const message = err.message || "An unexpected error occurred.";
      setErrorMsg(message);

      // If we got a permission denied error, it might be due to a bad key or no key.
      // Re-prompting might be useful.
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
    <div className="min-h-screen bg-[#0d1117] text-gray-200 selection:bg-blue-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-[1800px] mx-auto p-4 md:p-6 lg:p-8 h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg shadow-blue-500/20">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Miniature World Generator</h1>
              <p className="text-xs text-blue-300/80 font-medium tracking-wide uppercase">Powered by Gemini 3 Pro & Nano Banana Pro</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Key Selector Button */}
             <button 
                onClick={openKeySelection}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-xs text-gray-400 hover:text-white transition-colors border border-gray-700"
             >
                <KeyRound size={12} />
                <span>API Key</span>
             </button>

            {/* Error Banner */}
            {errorMsg && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm animate-fade-in">
                <AlertCircle size={16} />
                {errorMsg}
                </div>
            )}
          </div>
        </header>

        {/* Main Content - Three Columns */}
        <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0 pb-4">
          
          {/* Column 1: Input */}
          <div className="h-full min-h-[500px]">
            <InputSection status={status} onSubmit={handleGenerate} />
          </div>

          {/* Column 2: Prompt Engineering */}
          <div className="h-full min-h-[300px]">
            <PromptDisplay status={status} promptData={promptData} />
          </div>

          {/* Column 3: Result */}
          <div className="h-full min-h-[400px]">
            <ImageResult status={status} imageBase64={resultImage} />
          </div>

        </main>
      </div>
    </div>
  );
};

export default App;