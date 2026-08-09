import './style.css';
import Tesseract from 'tesseract.js';

// Scaffold basic sandbox UI
document.querySelector('#app').innerHTML = `
  <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
    <h2>NutriVision OCR Sandbox</h2>
    <p>Phase 3: Basic Tesseract Initialization</p>
    
    <div style="margin-bottom: 20px;">
      <canvas id="sampleCanvas" width="300" height="100" style="border: 1px dashed #999; display: block; margin-bottom: 10px;"></canvas>
      <button id="runOcrBtn" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px;">Run OCR on Canvas</button>
    </div>
    
    <div style="margin-bottom: 20px;">
      <strong>Status:</strong> <span id="statusText">Idle</span>
      <progress id="progressBar" value="0" max="100" style="width: 100%; display: none; margin-top: 5px;"></progress>
    </div>
    
    <div>
      <strong>Extracted Text:</strong>
      <pre id="outputText" style="background: #f4f4f4; padding: 10px; border-radius: 4px; min-height: 50px; white-space: pre-wrap; border: 1px solid #ddd;"></pre>
    </div>
  </div>
`;

// Draw sample text on canvas to bypass file upload for initial test
const canvas = document.getElementById('sampleCanvas');
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#333333';
ctx.font = 'bold 24px Arial';
ctx.fillText('NUTRIVISION-100', 30, 60);

const runOcrBtn = document.getElementById('runOcrBtn');
const statusText = document.getElementById('statusText');
const progressBar = document.getElementById('progressBar');
const outputText = document.getElementById('outputText');

// Asynchronous OCR logic
async function runOCR() {
  runOcrBtn.disabled = true;
  outputText.textContent = '';
  statusText.textContent = 'Initializing...';
  progressBar.style.display = 'block';
  progressBar.value = 0;

  try {
    const image = canvas.toDataURL('image/png');

    // Tesseract.recognize is async, returns Promise
    const result = await Tesseract.recognize(
      image,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            statusText.textContent = `Recognizing: ${Math.round(m.progress * 100)}%`;
            progressBar.value = m.progress * 100;
          } else {
            statusText.textContent = m.status; // e.g. loading language traineddata
          }
        }
      }
    );

    statusText.textContent = 'Completed!';
    progressBar.style.display = 'none';
    outputText.textContent = result.data.text;
  } catch (error) {
    statusText.textContent = 'Error!';
    progressBar.style.display = 'none';
    outputText.textContent = `OCR Error: ${error.message}`;
    console.error('OCR Error:', error);
  } finally {
    runOcrBtn.disabled = false;
  }
}

runOcrBtn.addEventListener('click', runOCR);
