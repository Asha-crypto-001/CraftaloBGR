import type { BackdropSetting, ExportFormat } from '../types';
import { createCanvasLinearGradient } from './backdrops';

export const TARGET_8K_LONG_EDGE = 7680;

/**
 * Loads an image from a URL or data URI asynchronously
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Returns native dimensions of a File
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Composites the transparent cutout with custom backdrop settings (solid, gradient, image)
 * and exports to the requested format (PNG, WebP, JPEG).
 */
export async function generateCompositeBlob(
  cutoutUrl: string,
  backdrop: BackdropSetting,
  targetWidth?: number,
  targetHeight?: number,
  format: ExportFormat = 'png'
): Promise<Blob> {
  const cutoutImg = await loadImage(cutoutUrl);
  const w = targetWidth || cutoutImg.naturalWidth;
  const h = targetHeight || cutoutImg.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // 1. Draw Background
  if (backdrop.type === 'solid' && backdrop.color) {
    ctx.fillStyle = backdrop.color;
    ctx.fillRect(0, 0, w, h);
  } else if (backdrop.type === 'gradient' && backdrop.gradient) {
    ctx.fillStyle = createCanvasLinearGradient(ctx, w, h, backdrop.gradient);
    ctx.fillRect(0, 0, w, h);
  } else if (backdrop.type === 'image' && backdrop.imageUrl) {
    const bgImg = await loadImage(backdrop.imageUrl);
    const scale = Math.max(w / bgImg.naturalWidth, h / bgImg.naturalHeight);
    const sourceWidth = w / scale;
    const sourceHeight = h / scale;
    const sourceX = (bgImg.naturalWidth - sourceWidth) / 2;
    const sourceY = (bgImg.naturalHeight - sourceHeight) / 2;
    ctx.drawImage(
      bgImg,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      w,
      h
    );
  } else if (backdrop.type === 'transparent' && format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }

  // 2. Draw the transparent cutout on top
  ctx.drawImage(cutoutImg, 0, 0, w, h);

  // 3. Export to Blob with quality settings
  const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const quality = format === 'png' ? undefined : 0.95;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas export failed'));
      },
      mimeType,
      quality
    );
  });
}

/**
 * Scales the long edge to 7680px using the browser's high-quality canvas resampling.
 */
export async function resampleTo8K(cutoutUrl: string): Promise<Blob> {
  const img = await loadImage(cutoutUrl);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  const maxEdge = Math.max(origW, origH);
  const scale = TARGET_8K_LONG_EDGE / maxEdge;
  const targetW = Math.round(origW * scale);
  const targetH = Math.round(origH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('8K resampling failed'));
      },
      'image/png'
    );
  });
}

/**
 * Triggers browser download of a Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Format bytes to readable string (e.g. 4.2 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
