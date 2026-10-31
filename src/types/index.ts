export type ProcessStatus = 'idle' | 'processing' | 'done' | 'error';

export interface ImageItem {
  id: string;
  name: string;
  originalFile: File;
  originalUrl: string;
  originalWidth: number;
  originalHeight: number;
  cutoutBlob?: Blob;
  cutoutUrl?: string;
  compositeUrl?: string;
  status: ProcessStatus;
  progress: number;
  timeSeconds?: number;
  error?: string;
}

export type BackdropType = 'transparent' | 'solid' | 'gradient' | 'image';

export interface BackdropSetting {
  type: BackdropType;
  color?: string;
  gradient?: string;
  imageUrl?: string;
}

export type ExportFormat = 'png' | 'webp' | 'jpeg';

export type ResolutionMode = 'original' | '8k';
