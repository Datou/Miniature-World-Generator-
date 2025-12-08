export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING_IMAGE = 'GENERATING_IMAGE',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface EngineeredPrompt {
  posterTitle: string;
  posterSubtitle: string;
  visualPrompt: string;
  groundingSources?: { title: string; uri: string }[];
}

export interface GenerationResult {
  imageBase64: string | null;
  promptData: EngineeredPrompt | null;
}

export interface UserInput {
  text: string;
  image: File | null;
  imageBase64: string | null;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  forceAnalysis?: boolean;
}

// Global definition for the AI Studio helper environment
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}