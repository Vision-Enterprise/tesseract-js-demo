import './style.css';
import 'cropperjs/dist/cropper.css';
import { createWorker } from 'tesseract.js';
import Cropper from 'cropperjs';
import { preprocess } from './preprocessing.js';

document.querySelector('#app').innerHTML = `
  <div class="scanner-card">
    <h1 class="title">NutriVision Scanner</h1>
    <p class="subtitle">University Capstone OCR Prototype - Camera & Upload</p>

    <div class="tab-container">
      <button class="tab-btn active" id="tabUpload">File Import</button>
      <button class="tab-btn" id="tabCamera">Live Camera</button>
    </div>

    <div class="dropzone" id="dropzone">
      <span class="dropzone-icon">📄</span>
      <p style="margin: 0; font-size: 16px; font-weight: 500;">Drag & drop document or click to scan file</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-muted);">Supports PNG, JPG, JPEG</p>
      <input type="file" id="fileInput" accept="image/*" style="display: none;" />
    </div>

    <div class="camera-panel" id="cameraPanel" style="display: none;">
      <div class="video-wrapper">
        <video id="video" autoplay playsinline></video>
      </div>
      <div class="camera-controls">
        <button class="btn-secondary" id="startCamBtn">Start Camera</button>
        <button class="btn" id="captureBtn" style="flex: 1.5;" disabled>Capture Snap</button>
      </div>
    </div>

    <div id="cropContainer" style="display: none;">
      <div class="crop-wrapper">
        <img id="cropImg" alt="Crop Source" />
      </div>

      <!-- Preprocessing Controls -->
      <div class="preprocess-toggle">
        <label class="toggle-label">
          <input type="checkbox" id="preprocessToggle" checked />
          <span class="toggle-text">Apply preprocessing (grayscale + threshold)</span>
        </label>
        <div class="threshold-control" id="thresholdControl">
          <label for="thresholdSlider" style="font-size: 13px; color: var(--text-muted);">
            Threshold: <strong id="thresholdValue">128</strong>
          </label>
          <input type="range" id="thresholdSlider" min="50" max="220" value="128" style="width: 100%;" />
        </div>
      </div>

      <!-- OCR Settings Controls -->
      <div class="preprocess-toggle" style="margin-top: 16px;">
        <label class="output-label" style="margin-bottom: 8px; display: block; font-size: 14px;">OCR Engine Settings</label>
        
        <div style="margin-bottom: 12px;">
          <label style="font-size: 13px; color: var(--text-muted); display: block; margin-bottom: 4px;">Page Segmentation Mode (PSM)</label>
          <select id="psmSelect" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-main); font-weight: 500;">
            <option value="3">Auto Segmentation (PSM 3)</option>
            <option value="7" selected>Single Line of Text (PSM 7)</option>
            <option value="8">Single Word (PSM 8)</option>
          </select>
        </div>

        <div>
          <label style="font-size: 13px; color: var(--text-muted); display: block; margin-bottom: 4px;">Character Whitelist Preset</label>
          <select id="whitelistSelect" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-main); font-weight: 500;">
            <option value="">All Characters (Default)</option>
            <option value="0123456789">Numbers Only (0-9)</option>
            <option value="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-">Batch Numbers (Caps & Digits & Dash)</option>
          </select>
        </div>
      </div>

      <!-- Preprocessed image preview (visible after scan) -->
      <div id="preprocessPreviewContainer" style="display: none; margin-bottom: 16px; margin-top: 16px;">
        <label class="output-label">Preprocessed Image Preview</label>
        <canvas id="preprocessPreview" style="width: 100%; border-radius: 8px; border: 1px solid var(--border); display: block;"></canvas>
      </div>

      <div class="crop-actions" style="margin-top: 16px;">
        <button class="btn-secondary" id="resetCropBtn">Reset Crop</button>
        <button class="btn" id="scanBtn" disabled>Crop & Scan</button>
      </div>
    </div>

    <div class="status-panel" id="statusPanel" style="display: none;">
      <div class="status-header">
        <span id="statusText">Ready</span>
        <span id="progressText">0%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
    </div>

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
const preprocessToggle = document.getElementById('preprocessToggle');
const thresholdSlider = document.getElementById('thresholdSlider');
const thresholdValueLabel = document.getElementById('thresholdValue');
const thresholdControl = document.getElementById('thresholdControl');
const preprocessPreviewContainer = document.getElementById('preprocessPreviewContainer');
const preprocessPreview = document.getElementById('preprocessPreview');
const psmSelect = document.getElementById('psmSelect');
const whitelistSelect = document.getElementById('whitelistSelect');

// State
let stream = null;
let cropperInstance = null;

// Threshold slider
thresholdSlider.addEventListener('input', () => {
  thresholdValueLabel.textContent = thresholdSlider.value;
});

// Toggle threshold visibility
preprocessToggle.addEventListener('change', () => {
  thresholdControl.style.display = preprocessToggle.checked ? 'block' : 'none';
  if (!preprocessToggle.checked) {
    preprocessPreviewContainer.style.display = 'none';
  }
});

// Tab Switch
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
  preprocessPreviewContainer.style.display = 'none';
}

// File Upload
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

// Camera
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
    console.error('Camera error:', err);
    alert(`Camera error: ${err.message}. Ensure HTTPS or localhost.`);
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

// Crop
function loadImageForCrop(source) {
  destroyCropper();
  preprocessPreviewContainer.style.display = 'none';
  cropImg.src = source instanceof File ? URL.createObjectURL(source) : source;
  cropContainer.style.display = 'block';
  outputContainer.style.display = 'none';
  statusPanel.style.display = 'none';

  cropImg.onload = () => {
    cropperInstance = new Cropper(cropImg, {
      viewMode: 1,
      autoCropArea: 0.8,
      movable: true,
      zoomable: true,
      scalable: false,
      rotatable: false,
    });
    scanBtn.disabled = false;
  };
}

function destroyCropper() {
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
  cropImg.src = '';
  scanBtn.disabled = true;
}

resetCropBtn.addEventListener('click', () => {
  if (cropperInstance) cropperInstance.reset();
});

// Run OCR
async function runScan() {
  if (!cropperInstance) return;

  let canvas = cropperInstance.getCroppedCanvas();
  if (!canvas) return;

  // Apply preprocessing if toggle is ON
  if (preprocessToggle.checked) {
    canvas = preprocess(canvas, {
      grayscale: true,
      threshold: true,
      thresholdValue: parseInt(thresholdSlider.value, 10),
    });

    // Show preprocessed image
    preprocessPreview.width = canvas.width;
    preprocessPreview.height = canvas.height;
    preprocessPreview.getContext('2d').drawImage(canvas, 0, 0);
    preprocessPreviewContainer.style.display = 'block';
  } else {
    preprocessPreviewContainer.style.display = 'none';
  }

  scanBtn.disabled = true;
  outputContainer.style.display = 'none';
  statusPanel.style.display = 'block';
  statusText.textContent = 'Initializing OCR worker...';
  progressText.textContent = '0%';
  progressFill.style.width = '0%';
  progressFill.style.backgroundColor = 'var(--primary)';

  let worker = null;
  try {
    // Create dedicated worker to allow parameters modification
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(m.progress * 100);
          statusText.textContent = `Scanning... ${pct}%`;
          progressText.textContent = `${pct}%`;
          progressFill.style.width = `${pct}%`;
        } else {
          statusText.textContent = m.status;
        }
      }
    });

    // Set configuration parameters on worker
    const workerParams = {
      tessedit_pageseg_mode: psmSelect.value
    };

    if (whitelistSelect.value) {
      workerParams.tessedit_char_whitelist = whitelistSelect.value;
    }

    await worker.setParameters(workerParams);

    // Perform recognition
    const result = await worker.recognize(canvas);

    statusText.textContent = 'Scan Complete!';
    progressText.textContent = '100%';
    progressFill.style.width = '100%';
    outputContainer.style.display = 'block';
    
    const textResult = result.data.text.trim();
    outputBox.textContent = textResult || '(No text resolved)';
  } catch (error) {
    statusText.textContent = 'Scanning Failed';
    progressText.textContent = 'FAILED';
    progressFill.style.width = '100%';
    progressFill.style.backgroundColor = 'var(--error)';
    outputContainer.style.display = 'block';
    outputBox.innerHTML = `<span style="color: var(--error)">Error: ${error.message}</span>`;
    console.error('Scan Error:', error);
  } finally {
    if (worker) {
      await worker.terminate();
    }
    scanBtn.disabled = false;
  }
}

scanBtn.addEventListener('click', runScan);
