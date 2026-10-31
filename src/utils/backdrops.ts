export interface GradientPreset {
  id: string;
  label: string;
  css: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'aurora',
    label: 'Aurora',
    css: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    css: 'linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)',
  },
  {
    id: 'lime',
    label: 'Citrus',
    css: 'linear-gradient(135deg,#84cc16,#14b8a6)',
  },
  {
    id: 'mono',
    label: 'Graphite',
    css: 'linear-gradient(135deg,#1c1c1c,#3d3d3d)',
  },
  {
    id: 'neon',
    label: 'Neon',
    css: 'linear-gradient(135deg,#06b6d4,#4f46e5)',
  },
  {
    id: 'bloom',
    label: 'Bloom',
    css: 'linear-gradient(135deg,#fda4af,#f9a8d4,#c4b5fd)',
  },
];

interface GradientStop {
  color: string;
  position: number;
}

function splitGradientArguments(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '(') depth += 1;
    if (value[i] === ')') depth -= 1;
    if (value[i] === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }

  parts.push(value.slice(start).trim());
  return parts;
}

function parseGradientStops(values: string[]): GradientStop[] {
  const stops = values.map((value) => {
    const match = value.match(/^(.*?)\s+(-?\d*\.?\d+%)$/);
    return {
      color: match ? match[1].trim() : value,
      position: match ? Number.parseFloat(match[2]) / 100 : Number.NaN,
    };
  });

  if (stops.length < 2 || stops.some((stop) => !stop.color)) {
    throw new Error('The selected gradient is not supported for export.');
  }

  const firstUnspecified = stops.findIndex((stop) => Number.isNaN(stop.position));
  if (firstUnspecified === -1) return stops;

  if (firstUnspecified === 0) stops[0].position = 0;
  const last = stops.length - 1;
  if (Number.isNaN(stops[last].position)) stops[last].position = 1;

  let left = 0;
  while (left < last) {
    let right = left + 1;
    while (right < last && Number.isNaN(stops[right].position)) right += 1;

    const start = stops[left].position;
    const end = stops[right].position;
    for (let index = left + 1; index < right; index += 1) {
      stops[index].position =
        start + ((end - start) * (index - left)) / (right - left);
    }
    left = right;
  }

  return stops;
}

export function createCanvasLinearGradient(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  cssGradient: string
): CanvasGradient {
  const match = cssGradient.match(/^linear-gradient\((.+)\)$/i);
  if (!match) {
    throw new Error('Only CSS linear gradients can be exported.');
  }

  const [direction, ...stopValues] = splitGradientArguments(match[1]);
  const angleMatch = direction.match(/^(-?\d*\.?\d+)(deg|rad|turn)$/i);
  if (!angleMatch) {
    throw new Error('The selected gradient has an unsupported angle.');
  }

  const value = Number.parseFloat(angleMatch[1]);
  const unit = angleMatch[2].toLowerCase();
  const angle = unit === 'rad' ? value : unit === 'turn' ? value * 2 * Math.PI : (value * Math.PI) / 180;
  const directionX = Math.sin(angle);
  const directionY = -Math.cos(angle);
  const lineLength =
    Math.abs(width * directionX) + Math.abs(height * directionY);
  const centerX = width / 2;
  const centerY = height / 2;
  const halfLength = lineLength / 2;
  const gradient = context.createLinearGradient(
    centerX - directionX * halfLength,
    centerY - directionY * halfLength,
    centerX + directionX * halfLength,
    centerY + directionY * halfLength
  );

  for (const stop of parseGradientStops(stopValues)) {
    gradient.addColorStop(stop.position, stop.color);
  }

  return gradient;
}

export function getUniqueFilename(filename: string, existingNames: Set<string>): string {
  const dot = filename.lastIndexOf('.');
  const extension = dot > 0 ? filename.slice(dot) : '';
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  let candidate = filename;
  let suffix = 2;

  while (existingNames.has(candidate.toLowerCase())) {
    candidate = `${stem} (${suffix})${extension}`;
    suffix += 1;
  }

  existingNames.add(candidate.toLowerCase());
  return candidate;
}

export function getExportBasename(name: string): string {
  const basename = name.replace(/\.[^/.]+$/, '');
  const safeName = [...basename]
    .map((character) =>
      /[<>:"/\\|?*]/.test(character) || character.charCodeAt(0) < 32
        ? '_'
        : character
    )
    .join('')
    .trim();
  return safeName.replace(/\./g, '').trim() ? safeName : 'image';
}
