const DEFAULT_TARGET_BYTES = 160 * 1024;
const MAX_DIMENSIONS = [1280, 1080, 960, 840, 720, 640, 560];
const QUALITY_STEPS = [0.78, 0.68, 0.6, 0.52, 0.46, 0.4];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to read the selected image.'));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to optimize the selected image.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

export async function optimizeAdmissionPhoto(
  file: File,
  options?: { targetBytes?: number },
): Promise<File> {
  const targetBytes = options?.targetBytes ?? DEFAULT_TARGET_BYTES;
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Unable to prepare the selected image.');
    }

    let bestBlob: Blob | null = null;

    for (const maxDimension of MAX_DIMENSIONS) {
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);
        bestBlob = blob;
        if (blob.size <= targetBytes) {
          return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'student-photo'}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
        }
      }
    }

    if (!bestBlob || bestBlob.size > targetBytes) {
      throw new Error('Photo is too large. Please use a clearer face photo with less background.');
    }

    return new File([bestBlob], `${file.name.replace(/\.[^.]+$/, '') || 'student-photo'}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
