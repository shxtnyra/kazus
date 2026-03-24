const canvas = document.getElementById('canvas');
const wrapper = document.getElementById('canvas-wrapper');
const ctx = canvas.getContext('2d', { willReadFrequently: true, imageSmoothingEnabled: false });
const uploadInput = document.getElementById('upload');

let originalImage = null;
let originalImageData = null;
let filters = [];
let scale = 1;

// Функция обновления масштаба 
function updateCanvasDisplaySize() {
  if (!originalImage) return;
  
  canvas.style.width = (originalImage.width * scale) + 'px';
  canvas.style.height = (originalImage.height * scale) + 'px';
}

// Масштабирования
window.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.12 : 0.12;
    scale = Math.min(Math.max(0.1, scale + delta), 20);
    
    updateCanvasDisplaySize();
  }
}, { passive: false });

uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      scale = 1;

      ctx.drawImage(img, 0, 0);
      originalImage = img;
      originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      updateCanvasDisplaySize();
      applyAllFilters()
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
})

document.getElementById('reset-btn').addEventListener('click', () => {
  for (const filter of filters) {
    filter.elem.checked = false;
  }

  document.querySelectorAll('.sidebar input[type="range"]').forEach(input => {
    input.value = input.getAttribute('value');
  });

  filters = [];
  scale = 1;
  applyAllFilters();
})

function attachFilter(id, filterFn) {
  const elem = document.getElementById(id);

  elem.addEventListener('change', (e) => {
    if (e.target.checked) {
      filters.push({'id': id, 'elem': elem, 'fn': filterFn});
      console.log(filters)
    } else {
      filters = filters.filter(f => f.id !== id);
      console.log(filters)
    }
    applyAllFilters();
  });
}

attachFilter('grayscale-check', grayscale);
attachFilter('negative-check', negative);
attachFilter('threshold-active', binarization);
attachFilter('power-law-transform-active', powerLawTransform);
attachFilter('log-transform-active', logarithmicTransform);
attachFilter('quantization-transform-active', quantizationTransform);
attachFilter('solarisation-transform-active', solarisationTransform);
attachFilter('pixelate-transform-active', pixelateTransform);
attachFilter('dithering-check', orderedDither);
attachFilter('scanlines-check', scanlines);
attachFilter('hue-rotate-active', hueRotateTransform);
attachFilter('film-grain-active', filmGrainTransform);
attachFilter('salt-pepper-prob-active', saltPepperTransform);

document.getElementById('sidebar').addEventListener('input', (e) => {
  if (e.target.type === 'range') applyAllFilters();
});

function applyAllFilters() {
  if (!originalImageData) return;

  const workingData = new ImageData(
    new Uint8ClampedArray(originalImageData.data),
    originalImageData.width,
    originalImageData.height
  );
  const data = workingData.data;

  const params = {
    width: canvas.width,
    pixelSize: parseInt(document.getElementById('pixel-size').value),
    threshold: parseInt(document.getElementById('threshold').value),
    powerLaw: parseFloat(document.getElementById('power-law').value),
    logGain: parseFloat(document.getElementById('log-gain').value),
    quantSteps: parseInt(document.getElementById('quant-steps').value),
    solarThreshold: parseInt(document.getElementById('solar-threshold').value),
    hueAngle: parseInt(document.getElementById('hue-angle').value),
    grainAmount: parseInt(document.getElementById('grain-amount').value),
    saltPepperProb: parseFloat(document.getElementById('salt-pepper-prob').value),
  };
  
  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < filters.length; j++) {
      filters[j].fn(data, i, params);
    }
  }

  ctx.putImageData(workingData, 0, 0);
}

// --- РЕЕСТР ФУНКЦИЙ ---
function grayscale(data, i) {
  const r = data[i], g = data[i+1], b = data[i+2];
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  data[i] = data[i+1] = data[i+2] = gray;
}

function negative(data, i) {
  data[i]   = 255 - data[i];
  data[i+1] = 255 - data[i+1];
  data[i+2] = 255 - data[i+2];
}

function binarization(data, i, params) {
  const gray = (data[i] + data[i+1] + data[i+2]) / 3;
  const val = gray >= params.threshold ? 255 : 0;
  data[i] = data[i+1] = data[i+2] = val;
}

function powerLawTransform(data, i, params) {
  const gamma = params.powerLaw;
  
  data[i]   = 255 * Math.pow(data[i] / 255, gamma);
  data[i+1] = 255 * Math.pow(data[i+1] / 255, gamma);
  data[i+2] = 255 * Math.pow(data[i+2] / 255, gamma);
}

function logarithmicTransform(data, i, params) {
  const gain = params.logGain;
  const c = 255 / Math.log(1 + 255 * gain);
  
  data[i]   = c * Math.log(1 + data[i] * gain);
  data[i+1] = c * Math.log(1 + data[i+1] * gain);
  data[i+2] = c * Math.log(1 + data[i+2] * gain);
}

function quantizationTransform(data, i, params) {
  const steps = params.quantSteps
  const stepSize = 255 / steps;

  data[i]     = Math.round(data[i] / stepSize) * stepSize;
  data[i + 1] = Math.round(data[i + 1] / stepSize) * stepSize;
  data[i + 2] = Math.round(data[i + 2] / stepSize) * stepSize;
}

function solarisationTransform(data, i, params) {
  const threshold = params.solarThreshold
  
  if (data[i] > threshold) data[i] = 255 - data[i];
  if (data[i+1] > threshold) data[i+1] = 255 - data[i+1];
  if (data[i+2] > threshold) data[i+2] = 255 - data[i+2];
}

function pixelateTransform(data, i, params) {
  const size = params.pixelSize || 8;
  const width = params.width;

  const x = (i / 4) % width;
  const y = Math.floor((i / 4) / width);

  const blockX = Math.floor(x / size) * size;
  const blockY = Math.floor(y / size) * size;

  const blockI = (blockY * width + blockX) * 4;

  data[i]     = data[blockI];
  data[i + 1] = data[blockI + 1];
  data[i + 2] = data[blockI + 2];
}

// Дальше идёт вайбкод который я даже не знаю как работает
const bayerMatrix = [
  [ 10, 128,  32, 160],
  [192,  164, 224,  96],
  [ 48, 176,  116, 144],
  [240, 112, 208,  180]
];

function orderedDither(data, i, params) {
  const width = params.width;
  const x = (i / 4) % width;
  const y = Math.floor((i / 4) / width);

  const threshold = bayerMatrix[y % 4][x % 4];

  const gray = (data[i] + data[i+1] + data[i+2]) / 3;

  const val = gray > threshold ? 255 : 0;
  
  data[i] = data[i+1] = data[i+2] = val;
}

function scanlines(data, i, params) {
  const width = params.width;
  const y = Math.floor((i / 4) / width);
  
  if (y % 2 === 0) {
    data[i] = 0;
    data[i+1] = 0;
    data[i+2] = 0;
  }
}

function hueRotateTransform(data, i, params) {
  const angle = (params.hueAngle) * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  
  const r = data[i], g = data[i+1], b = data[i+2];
  
  data[i] = Math.max(0, Math.min(255, 
    r*(0.213+0.787*cos-0.213*sin) + 
    g*(0.715-0.715*cos-0.715*sin) + 
    b*(0.072-0.072*cos+0.928*sin)
  ));
  data[i+1] = Math.max(0, Math.min(255,
    r*(0.213-0.213*cos+0.143*sin) + 
    g*(0.715+0.285*cos+0.140*sin) + 
    b*(0.072-0.072*cos-0.283*sin)
  ));
  data[i+2] = Math.max(0, Math.min(255,
    r*(0.213-0.213*cos-0.787*sin) + 
    g*(0.715-0.715*cos+0.715*sin) + 
    b*(0.072+0.928*cos+0.072*sin)
  ));
}

function filmGrainTransform(data, i, params) {
  const amount = params.grainAmount || 15;
  const noise = (Math.random() - 0.5) * amount;
  
  data[i]     = Math.max(0, Math.min(255, data[i] + noise));
  data[i+1]   = Math.max(0, Math.min(255, data[i+1] + noise));
  data[i+2]   = Math.max(0, Math.min(255, data[i+2] + noise));
}

function saltPepperTransform(data, i, params) {
  const probability = params.saltPepperProb
  
  if (Math.random() < probability) {
    const val = Math.random() > 0.5 ? 255 : 0;
    data[i] = data[i+1] = data[i+2] = val;
  }
}

