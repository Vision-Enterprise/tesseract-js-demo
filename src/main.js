import './style.css';
import Tesseract from 'tesseract.js';

// Setup HTML Structure with tabs and camera controls
document.querySelector('#app').innerHTML = `
  <div class="scanner-card">
    <h1 class="title">NutriVision Scanner</h1>
    <p class="subtitle">University Capstone OCR Prototype - Camera & Upload</p>

    <!-- Scan Source Tabs -->
    <div class="tab-container">
      <button class="tab-btn active" id="tabUpload">📄 File Import</button>
      <button class="tab-btn" id="tabCamera">📷 Live Camera</button>
    </div>

    <!-- Mode 1: Dropzone / File Picker -->
    <div class="dropzone" id="dropzone">
      <span class="dropzone-icon">📄</span>
      <p style="margin: 0; font-size: 16px; font-weight: 500;">Drag & drop document or click to scan file</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-muted);">Supports PNG, JPG, JPEG</p>
      <input type="file" id="fileInput" accept="image/*" style="display: none;" />
    </div>

    <!-- Mode 2: Camera Panel -->
    <div class="camera-panel" id="cameraPanel" style="display: none;">
      <div class="video-wrapper">
        <video id="video" autoplay playsinline></video>
      </div>
      <div class="camera-controls">
        <button class="btn-secondary" id="startCamBtn">Start Camera</button>
        <button class="btn" id="captureBtn" style="flex: 1.5;" disabled>Capture Snap</button>
      </div>
    </div>

    <!-- Preview Container -->
    <div class="preview-container" id="previewContainer" style="display: none;">
      <img id="previewImg" class="preview-image" alt="Scanned Document Preview" />
    </div>

    <!-- Run OCR Action -->
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
const tabUpload = document.getElementById('tabUpload');
const tabCamera = document.getElementById('tabCamera');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const cameraPanel = document.getElementById('cameraPanel');
const video = document.getElementById('video');
const startCamBtn = document.getElementById('startCamBtn');
const captureBtn = document.getElementById('captureBtn');
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
let selectedImageSource = null; // Can be a File or a Data URL
let stream = null;

// Tab Switch Logic
tabUpload.addEventListener('click', () => {
  switchTab('upload');
});

tabCamera.addEventListener('click', () => {
  switchTab('camera');
});

function switchTab(mode) {
  stopCamera();
  if (mode === 'upload') {
    tabUpload.classList.add('active');
    tabCamera.classList.remove('active');
    dropzone.style.display = 'block';
    cameraPanel.style.display = 'none';
  } else {
    tabUpload.classList.remove('active');
    tabCamera.classList.add('active');
    dropzone.style.display = 'none';
    cameraPanel.style.display = 'flex';
  }
  // Clear preview and scan readiness when switching
  selectedImageSource = null;
  previewContainer.style.display = 'none';
  previewImg.src = '';
  scanBtn.disabled = true;
  outputContainer.style.display = 'none';
  statusPanel.style.display = 'none';
}

// Trigger input click on dropzone click
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    processImageSource(e.target.files[0]);
  }
});

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
    processImageSource(e.dataTransfer.files[0]);
  }
});

// Process source (accepts File or Data URL string)
function processImageSource(source) {
  selectedImageSource = source;
  if (source instanceof File) {
    const objectUrl = URL.createObjectURL(source);
    previewImg.src = objectUrl;
  } else {
    // Data URL from Camera
    previewImg.src = source;
  }
  previewContainer.style.display = 'flex';
  scanBtn.disabled = false;
}

// Camera controls
startCamBtn.addEventListener('click', startCamera);
captureBtn.addEventListener('click', captureFrame);

async function startCamera() {
  try {
    startCamBtn.disabled = true;
    startCamBtn.textContent = 'Starting...';
    
    // FacingMode 'environment' tells mobile browsers to request back camera
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    video.srcObject = stream;
    captureBtn.disabled = false;
    startCamBtn.textContent = 'Camera Active';
  } catch (err) {
    console.error('Camera Access Error:', err);
    alert(`Camera error: ${err.message}. Ensure HTTPS or localhost is used.`);
    startCamBtn.disabled = false;
    startCamBtn.textContent = 'Start Camera';
  }
}

function captureFrame() {
  if (!stream) return;

  const canvas = document.createElement('canvas');
  // Match camera frame size
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/png');
  processImageSource(dataUrl);

  stopCamera();
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  video.srcObject = null;
  captureBtn.disabled = true;
  startCamBtn.disabled = false;
  startCamBtn.textContent = 'Start Camera';
}

// Run OCR processing
async function runScan() {
  if (!selectedImageSource) return;

  scanBtn.disabled = true;
  outputContainer.style.display = 'none';
  statusPanel.style.display = 'block';
  statusText.textContent = 'Starting scan...';
  progressText.textContent = '0%';
  progressFill.style.width = '0%';
  progressFill.style.backgroundColor = 'var(--primary)';

  try {
    const result = await Tesseract.recognize(
      selectedImageSource,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const percentage = Math.round(m.progress * 100);
            statusText.textContent = 'Scanning document text...';
            progressText.textContent = `${percentage}%`;
            progressFill.style.width = `${percentage}%`;
          } else {
            statusText.textContent = m.status;
            progressText.textContent = '...';
          }
        }
      }
    );

    statusText.textContent = 'Scan Complete!';
    progressText.textContent = '100%';
    progressFill.style.width = '100%';

    outputContainer.style.display = 'block';
    const textResult = result.data.text.trim();
    outputBox.textContent = textResult || '(No text resolved in this document)';
  } catch (error) {
    statusText.textContent = 'Scanning Failed';
    progressText.textContent = 'FAILED';
    progressFill.style.width = '100%';
    progressFill.style.backgroundColor = 'var(--error)';
    
    outputContainer.style.display = 'block';
    outputBox.innerHTML = `<span style="color: var(--error)">Failed to scan image.<br>Details: ${error.message}</span>`;
    console.error('Scan Error:', error);
  } finally {
    scanBtn.disabled = false;
  }
}

scanBtn.addEventListener('click', runScan);
