/**
 * preprocessing.js
 * 
 * Deterministic image preprocessing for OCR accuracy improvement.
 * No AI. Pure canvas pixel manipulation.
 * 
 * Pipeline:
 *   Canvas (color) ? Grayscale ? Threshold ? Canvas (B&W)
 */

/**
 * Convert canvas to grayscale using luminance formula.
 * Formula: 0.299R + 0.587G + 0.114B
 * These weights match human eye sensitivity to each channel.
 * 
 * @param {HTMLCanvasElement} sourceCanvas
 * @returns {HTMLCanvasElement} grayscale canvas
 */
export function applyGrayscale(sourceCanvas) {
  const output = document.createElement('canvas');
  output.width = sourceCanvas.width;
  output.height = sourceCanvas.height;

  const ctx = output.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, output.width, output.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);
  return output;
}

/**
 * Apply binary thresholding to a grayscale canvas.
 * Pixels >= threshold ? white (255).
 * Pixels < threshold ? black (0).
 * 
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {number} threshold - 0-255, default 128
 * @returns {HTMLCanvasElement}
 */
export function applyThreshold(sourceCanvas, threshold = 128) {
  const output = document.createElement('canvas');
  output.width = sourceCanvas.width;
  output.height = sourceCanvas.height;

  const ctx = output.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, output.width, output.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const value = data[i] >= threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
  return output;
}

/**
 * Full preprocessing pipeline: grayscale ? threshold.
 * 
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {object} options
 * @param {boolean} options.grayscale
 * @param {boolean} options.threshold
 * @param {number}  options.thresholdValue
 * @returns {HTMLCanvasElement}
 */
export function preprocess(sourceCanvas, options = {}) {
  const {
    grayscale = true,
    threshold = true,
    thresholdValue = 128,
  } = options;

  let canvas = sourceCanvas;
  if (grayscale) canvas = applyGrayscale(canvas);
  if (threshold) canvas = applyThreshold(canvas, thresholdValue);
  return canvas;
}
