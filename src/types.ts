export interface MovieMetadata {
  title: string;
  year: string;
  genre: string[];
  duration: string;
  rating: string;
  director: string;
  cast: string[];
  synopsis: string;
  posterUrl?: string;
  backdropUrl?: string;
}

export interface ScriptSegment {
  timecode: string;
  visual: string;
  audio: string;
  transition: string;
}

export interface StoryboardItem {
  segment: string;
  description: string;
  visualReference: string;
  suggestedClips: string[];
}

export interface SocialVersion {
  platform: 'YouTube' | 'Shorts' | 'Reels';
  hook: string;
  keyPoints: string[];
  callToAction: string;
}

export interface CineScriptPackage {
  metadata: MovieMetadata;
  narrativeSummary: string;
  voiceOverScript: ScriptSegment[];
  storyboard: StoryboardItem[];
  socialVersions: SocialVersion[];
  youtubeReferences: string[];
  generatedImageUrl?: string;
  generatedVideoUrl?: string;
  generatedAudioUrl?: string;
  youtubeTrailerUrl?: string;
  ttsProvider?: 'gemini' | 'elevenlabs';
}
