import type {
  BackdropSetting,
  ExportFormat,
  ImageItem,
  ResolutionMode,
} from '../types';
import { generateCompositeBlob, resampleTo8K } from './imageUtils';

export async function createImageExportBlob(
  item: ImageItem,
  backdrop: BackdropSetting,
  format: ExportFormat,
  resolutionMode: ResolutionMode
): Promise<Blob> {
  if (!item.cutoutUrl) {
    throw new Error(`No processed image is available for ${item.name}.`);
  }

  if (resolutionMode === 'original') {
    return generateCompositeBlob(item.cutoutUrl, backdrop, undefined, undefined, format);
  }

  const cutout8k = await resampleTo8K(item.cutoutUrl);
  const tempUrl = URL.createObjectURL(cutout8k);
  try {
    return await generateCompositeBlob(tempUrl, backdrop, undefined, undefined, format);
  } finally {
    URL.revokeObjectURL(tempUrl);
  }
}
