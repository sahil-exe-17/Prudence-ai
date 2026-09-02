/**
 * PRUDENCE AI — in-browser drawing reader.
 *
 * Recovers the text printed on a drawing without any cloud call, so the
 * compliance engine has evidence to work with when no API key is configured.
 * Three strategies, cheapest and most accurate first:
 *
 *   1. PDF text layer  — exact, instant, works on any vector CAD export
 *   2. PDF page render → OCR   — for scanned PDFs with no text layer
 *   3. Image OCR       — for PNG/JPG screenshots and photographed sheets
 *
 * OCR on architectural sheets is genuinely imperfect: rotated dimension
 * strings and 6pt leader text read poorly. That is why the output carries a
 * `quality` field — the caller reports partial reads honestly rather than
 * presenting a half-read sheet as a complete audit.
 */

export type ReadSource = 'pdf-text' | 'pdf-ocr' | 'image-ocr' | 'none';

export type DrawingRead = {
  text: string;
  source: ReadSource;
  /** Mean OCR confidence 0..1. Always 1 for a real PDF text layer. */
  quality: number;
  characters: number;
  note: string;
};

export type ReadProgress = (stage: string, fraction: number) => void;

const EMPTY: DrawingRead = {
  text: '',
  source: 'none',
  quality: 0,
  characters: 0,
  note: '',
};

/** Below this, a PDF "text layer" is really just a title block or nothing. */
const MIN_USEFUL_PDF_TEXT = 120;

/* ------------------------------------------------------------------ *
 * PDF handling
 * ------------------------------------------------------------------ */

type PdfModule = typeof import('pdfjs-dist');

let pdfModule: PdfModule | null = null;

async function loadPdfjs(): Promise<PdfModule> {
  if (pdfModule) return pdfModule;
  const pdfjs = await import('pdfjs-dist');
  // `?url` makes Vite emit the worker as an asset and hand back its real URL.
  // A bare specifier in `new URL(..., import.meta.url)` does NOT resolve and
  // 404s at runtime, taking every PDF read down with it.
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  pdfModule = pdfjs;
  return pdfjs;
}

/** Reads the selectable text layer, concatenated across pages. */
async function readPdfTextLayer(data: ArrayBuffer, onProgress: ReadProgress) {
  const pdfjs = await loadPdfjs();
  const document = await pdfjs.getDocument({ data: data.slice(0) }).promise;
  const pageCount = Math.min(document.numPages, 12);
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    onProgress('Reading PDF text layer', pageNumber / pageCount);
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => (typeof item === 'object' && item && 'str' in item ? String(item.str) : ''))
      .join(' ');
    chunks.push(pageText);
  }

  return { text: chunks.join('\n'), document, pageCount };
}

/** Rasterises one PDF page at a scale generous enough for OCR to work. */
async function renderPdfPage(document: any, pageNumber: number): Promise<HTMLCanvasElement> {
  const page = await document.getPage(pageNumber);
  // ~200 DPI equivalent. Small text on CAD sheets is unreadable below this.
  const viewport = page.getViewport({ scale: 2.6 });
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.min(4000, Math.floor(viewport.width));
  canvas.height = Math.min(4000, Math.floor(viewport.height));
  if (!canvas.getContext('2d')) throw new Error('2D canvas unavailable');

  // Pass `canvas` ALONE. pdf.js 6 treats `canvasContext` as a legacy path that
  // requires `canvas: null`; supplying both leaves the render task's
  // continuation loop unresolved, so `.promise` never settles on any page that
  // needs more than one chunk. The page still paints, which is why this looked
  // like a blank preview rather than an error.
  await page.render({ canvas, viewport }).promise;
  return canvas;
}

/**
 * Rasterises one page of a PDF to a blob URL for display.
 *
 * A PDF cannot be shown in an `<img>` and cannot be decoded by
 * THREE.TextureLoader, so without this a PDF upload has no sheet to render —
 * neither in the 2D preview nor as the hologram's ground projection.
 *
 * Returns the page count too, so the caller can drive sheet navigation.
 * The caller owns the returned URL and must revoke it.
 */
export async function renderPdfPageToUrl(
  file: File,
  pageNumber = 1
): Promise<{ url: string; width: number; height: number; pageCount: number }> {
  const pdfjs = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const document = await pdfjs.getDocument({ data: buffer }).promise;
  const page = Math.min(Math.max(1, pageNumber), document.numPages);
  const canvas = await renderPdfPage(document, page);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), 'image/png')
  );
  if (!blob) throw new Error('Could not encode the rendered PDF page');

  return {
    url: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
    pageCount: document.numPages,
  };
}

/* ------------------------------------------------------------------ *
 * Image preprocessing
 * ------------------------------------------------------------------ */

/**
 * Upscales small images and pushes the drawing to hard black-on-white.
 *
 * Line drawings are mostly background; a light adaptive threshold removes the
 * paper texture and the faint grid that otherwise get read as punctuation.
 */
function preprocess(source: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const sourceWidth = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const sourceHeight = 'naturalHeight' in source ? source.naturalHeight : source.height;

  // OCR accuracy collapses under roughly 1600px on the long edge.
  const longEdge = Math.max(sourceWidth, sourceHeight);
  const scale = Math.min(3, Math.max(1, 1900 / Math.max(1, longEdge)));

  const canvas = document.createElement('canvas');
  canvas.width = Math.min(4200, Math.round(sourceWidth * scale));
  canvas.height = Math.min(4200, Math.round(sourceHeight * scale));

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return canvas;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;

  // Mean luminance drives the threshold, so this works on both white sheets
  // and dark-background CAD exports.
  let total = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    total += 0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
  }
  const mean = total / (pixels.length / 4);
  const inverted = mean < 110;
  const threshold = inverted ? mean * 1.35 : mean * 0.82;

  for (let index = 0; index < pixels.length; index += 4) {
    const luma = 0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
    const isInk = inverted ? luma > threshold : luma < threshold;
    const value = isInk ? 0 : 255;
    pixels[index] = value;
    pixels[index + 1] = value;
    pixels[index + 2] = value;
    pixels[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be decoded'));
    image.src = url;
  });
}

/* ------------------------------------------------------------------ *
 * OCR
 * ------------------------------------------------------------------ */

async function runOcr(canvas: HTMLCanvasElement, onProgress: ReadProgress) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (message: { status?: string; progress?: number }) => {
      if (message.status === 'recognizing text') {
        onProgress('Scanning drawing text', message.progress ?? 0);
      }
    },
  });

  try {
    // Dimension strings are the target, so keep the alphabet tight — it stops
    // hatching and leader lines being read as random glyphs.
    await worker.setParameters({
      tessedit_char_whitelist:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;-/()\'"%×xX ',
      preserve_interword_spaces: '1',
    });

    const { data } = await worker.recognize(canvas);
    return {
      text: String(data.text || ''),
      quality: Math.max(0, Math.min(1, (data.confidence ?? 0) / 100)),
    };
  } finally {
    await worker.terminate();
  }
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

/**
 * Reads whatever text can be recovered from the uploaded drawing, locally.
 *
 * Never throws: a failed read returns an empty result with an explanatory
 * note, so an unreadable sheet degrades to "not readable" rather than an error.
 */
export async function readDrawingLocally(
  file: File,
  objectUrl: string,
  onProgress: ReadProgress = () => {}
): Promise<DrawingRead> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImage = file.type.startsWith('image/');

  try {
    if (isPdf) {
      const buffer = await file.arrayBuffer();
      const { text, document, pageCount } = await readPdfTextLayer(buffer, onProgress);

      if (text.trim().length >= MIN_USEFUL_PDF_TEXT) {
        return {
          text,
          source: 'pdf-text',
          quality: 1,
          characters: text.trim().length,
          note: `Read the PDF text layer directly across ${pageCount} page(s) — exact, no OCR needed.`,
        };
      }

      // Scanned PDF: rasterise the first page and OCR it.
      onProgress('Rendering PDF for scanning', 0);
      const canvas = await renderPdfPage(document, 1);
      const result = await runOcr(preprocess(canvas), onProgress);
      return {
        text: result.text,
        source: 'pdf-ocr',
        quality: result.quality,
        characters: result.text.trim().length,
        note: `This PDF has no text layer, so page 1 was scanned by OCR at ${Math.round(result.quality * 100)}% mean confidence. Rotated and very small dimension text may be missed.`,
      };
    }

    if (isImage) {
      const image = await loadImage(objectUrl);
      const result = await runOcr(preprocess(image), onProgress);
      return {
        text: result.text,
        source: 'image-ocr',
        quality: result.quality,
        characters: result.text.trim().length,
        note: `Image scanned by on-device OCR at ${Math.round(result.quality * 100)}% mean confidence. Rotated and very small dimension text may be missed — add an API key for a full vision read.`,
      };
    }

    return {
      ...EMPTY,
      note: `${file.type || 'This file type'} cannot be read in the browser. Upload a PDF or an image of the sheet.`,
    };
  } catch (error) {
    return {
      ...EMPTY,
      note: `On-device reading failed: ${error instanceof Error ? error.message : 'unknown error'}.`,
    };
  }
}
