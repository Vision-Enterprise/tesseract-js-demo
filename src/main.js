import './style.css';
import 'cropperjs/dist/cropper.css';
import Tesseract from 'tesseract.js';
import Cropper from 'cropperjs';

// Setup HTML Structure
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

    <!-- Crop Container (hidden until image loaded) -->
    <div id="cropContainer" style="display: none;">
      <div class="crop-wrapper">
        <img id="cropImg" alt="Crop Source" />
      </div>
      <div class="crop-actions">
        <button class="btn-secondary" id="resetCropBtn">↺ Reset Crop</button>
        <button class="btn" id="scanBtn" disabled>✂ Crop & Scan</button>
      </div>
    </div>

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
const cropContainer = document.getElementById('cropContainer');
const cropImg = document.getElementById('cropImg');
const resetCropBtn = document.getElementById('resetCropBtn');
const scanBtn = document.getElementById('scanBtn');
const statusPanel = document.getElementById('statusPanel');
const statusText = document.getElementById('statusText');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const outputContainer = document.getElementById('outputContainer');
const outputBox = document.getElementById('outputBox');

// State
let stream = null;
let cropperInstance = null; // Stores active Cropper.js instance

// Tab Switch Logic
tabUpload.addEventListener('click', () => switchTab('upload'));
tabCamera.addEventListener('click', () => switchTab('camera'));

function switchTab(mode) {
  stopCamera();
  destroyCropper();

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

  cropContainer.style.display = 'none';
  scanBtn.disabled = true;
  outputContainer.style.display = 'none';
  statusPanel.style.display = 'none';
}

// File Upload Handlers
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) loadImageForCrop(e.target.files[0]);
});
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
  if (e.dataTransfer.files.length > 0) loadImageForCrop(e.dataTransfer.files[0]);
});

// Camera Controls
startCamBtn.addEventListener('click', startCamera);
captureBtn.addEventListener('click', captureFrame);

async function startCamera() {
  try {
    startCamBtn.disabled = true;
    startCamBtn.textContent = 'Starting...';
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
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
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  stopCamera();
  loadImageForCrop(canvas.toDataURL('image/png'));
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

// Load image into Cropper.js
function loadImageForCrop(source) {
  destroyCropper();

  // Set image src
  if (source instanceof File) {
    cropImg.src = URL.createObjectURL(source);
  } else {
    cropImg.src = source; // Data URL from camera
  }

  cropContainer.style.display = 'block';
  outputContainer.style.display = 'none';
  statusPanel.style.display = 'none';

  // Initialize Cropper after image loads
  cropImg.onload = () => {
    cropperInstance = new Cropper(cropImg, {
      viewMode: 1,        // Keep crop box inside image
      autoCropArea: 0.8,  // Default crop = 80% of image
      movable: true,
      zoomable: true,
      scalable: false,
      rotatable: false,
    });
    scanBtn.disabled = false;
  };
}

// Destroy existing Cropper instance to avoid memory leaks
function destroyCropper() {
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
  cropImg.src = '';
  scanBtn.disabled = true;
}

// Reset crop box to default
resetCropBtn.addEventListener('click', () => {
  if (cropperInstance) cropperInstance.reset();
});

// Run OCR on cropped region
async function runScan() {
  if (!cropperInstance) return;

  // Get canvas of cropped area only (not full image)
  const croppedCanvas = cropperInstance.getCroppedCanvas();
  if (!croppedCanvas) return;

  scanBtn.disabled = true;
  outputContainer.style.display = 'none';
  statusPanel.style.display = 'block';
  statusText.textContent = 'Starting scan...';
  progressText.textContent = '0%';
  progressFill.style.width = '0%';
  progressFill.style.backgroundColor = 'var(--primary)';

  try {
    // Pass cropped canvas directly — Tesseract accepts canvas elements
    const result = await Tesseract.recognize(
      croppedCanvas,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 100);
            statusText.textContent = 'Scanning cropped region...';
            progressText.textContent = `${pct}%`;
            progressFill.style.width = `${pct}%`;
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
    outputBox.textContent = textResult || '(No text resolved in cropped region)';
  } catch (error) {
    statusText.textContent = 'Scanning Failed';
    progressText.textContent = 'FAILED';
    progressFill.style.width = '100%';
    progressFill.style.backgroundColor = 'var(--error)';
    outputContainer.style.display = 'block';
    outputBox.innerHTML = `<span style="color: var(--error)">Failed to scan.<br>Details: ${error.message}</span>`;
    console.error('Scan Error:', error);
  } finally {
    scanBtn.disabled = false;
  }
}

scanBtn.addEventListener('click', runScan);
