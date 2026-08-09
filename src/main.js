import './style.css';
import Tesseract from 'tesseract.js';

// Setup HTML Structure
document.querySelector('#app').innerHTML = `
  <div class="scanner-card">
    <h1 class="title">NutriVision Scanner</h1>
    <p class="subtitle">University Capstone OCR Prototype - Document Scan</p>

    <!-- Dropzone / File Picker -->
    <div class="dropzone" id="dropzone">
      <span class="dropzone-icon">📄</span>
      <p style="margin: 0; font-size: 16px; font-weight: 500;">Drag & drop document or click to scan file</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-muted);">Supports PNG, JPG, JPEG</p>
      <input type="file" id="fileInput" accept="image/*" style="display: none;" />
    </div>

    <!-- Preview Container -->
    <div class="preview-container" id="previewContainer" style="display: none;">
      <img id="previewImg" class="preview-image" alt="Scanned Document Preview" />
    </div>

    <!-- Actions -->
    <button class="btn" id="scanBtn" disabled>Run Document Scan</button>

    <!-- Status Panel -->
    <div class="status-panel" id="statusPanel" style="display: none;">
      <div class="status-header">
        <span id="statusText">Ready</span>
        <span id="progressText">0%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
    </div>

    <!-- Output -->
    <div class="output-container" id="outputContainer" style="display: none;">
      <label class="output-label">Extracted Text Data</label>
      <div class="output-box" id="outputBox"></div>
    </div>
  </div>
`;

// Element Selectors
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const previewImg = document.getElementById('previewImg');
const scanBtn = document.getElementById('scanBtn');
const statusPanel = document.getElementById('statusPanel');
const statusText = document.getElementById('statusText');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const outputContainer = document.getElementById('outputContainer');
const outputBox = document.getElementById('outputBox');

// State
let selectedImageFile = null;

// Trigger input click on dropzone click
dropzone.addEventListener('click', () => fileInput.click());

// Handle file selection
fileInput.addEventListener('change', handleFileSelect);

// Drag & Drop handlers
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.style.borderColor = 'var(--primary)';
});

dropzone.addEventListener('dragleave', () => {
  dropzone.style.borderColor = 'var(--border)';
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.style.borderColor = 'var(--border)';
  if (e.dataTransfer.files.length > 0) {
    processFile(e.dataTransfer.files[0]);
  }
});

function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    processFile(e.target.files[0]);
  }
}

// Process selected file
function processFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please import a valid image document.');
    return;
  }

  selectedImageFile = file;

  // Use Object URL for visual preview (memory-efficient)
  const objectUrl = URL.createObjectURL(file);
  previewImg.src = objectUrl;

  // Show UI elements
  previewContainer.style.display = 'flex';
  scanBtn.disabled = false;

  // Reset outputs
  outputContainer.style.display = 'none';
  statusPanel.style.display = 'none';
}

// Run OCR processing
async function runScan() {
  if (!selectedImageFile) return;

  // UI Updates
  scanBtn.disabled = true;
  dropzone.style.pointerEvents = 'none';
  outputContainer.style.display = 'none';
  statusPanel.style.display = 'block';
  statusText.textContent = 'Initializing engine...';
  progressText.textContent = '0%';
  progressFill.style.width = '0%';
  progressFill.style.backgroundColor = 'var(--primary)'; // Reset from potential error red

  try {
    const result = await Tesseract.recognize(
      selectedImageFile,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const percentage = Math.round(m.progress * 100);
            statusText.textContent = 'Extracting document text...';
            progressText.textContent = `${percentage}%`;
            progressFill.style.width = `${percentage}%`;
          } else {
            statusText.textContent = m.status;
            progressText.textContent = '...';
          }
        }
      }
    );

    // Complete UI
    statusText.textContent = 'OCR Completed!';
    progressText.textContent = '100%';
    progressFill.style.width = '100%';

    // Output raw result
    outputContainer.style.display = 'block';
    const textResult = result.data.text.trim();
    outputBox.textContent = textResult || '(No text resolved in this image document)';
  } catch (error) {
    statusText.textContent = 'Error occurred';
    progressText.textContent = 'FAILED';
    progressFill.style.width = '100%';
    progressFill.style.backgroundColor = 'var(--error)';
    
    outputContainer.style.display = 'block';
    outputBox.innerHTML = `<span style="color: var(--error)">Failed to scan image.<br>Details: ${error.message}</span>`;
    console.error('Scan Error:', error);
  } finally {
    scanBtn.disabled = false;
    dropzone.style.pointerEvents = 'auto';
  }
}

scanBtn.addEventListener('click', runScan);
