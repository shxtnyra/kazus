import filters from "./filters.js";

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true, imageSmoothingEnabled: false });
const uploadInput = document.getElementById('upload');

let originalImage = null;
let originalImageData = null;
let activeFilterStack = [];
let scale = 1;

// Функция обновления масштаба 
function updateCanvasDisplaySize() {
  if (!originalImage) return;
  canvas.style.width = (originalImage.width * scale) + 'px';
  canvas.style.height = (originalImage.height * scale) + 'px';
}

// Масштбировние
window.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.12 : 0.12;
    scale = Math.min(Math.max(0.1, scale + delta), 20);
    
    updateCanvasDisplaySize();
  }
}, { passive: false });

// Загрузка изображения
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

// Ресет настроек
document.getElementById('reset-btn').addEventListener('click', () => {
  for (const filter of activeFilterStack) {
    filter.elem.checked = false;
  }

  document.querySelectorAll('.sidebar input[type="range"]').forEach(input => {
    input.value = input.getAttribute('value');
  });

  activeFilterStack = [];
  scale = 1;
  applyAllFilters();
})

// Функция для привязки переключателей
function attachFilter(id, filterFn) {
  const elem = document.getElementById(id);

  elem.addEventListener('change', (e) => {
    if (e.target.checked) {
      activeFilterStack.push({'id': id, 'elem': elem, 'fn': filterFn});
      console.log(activeFilterStack)
    } else {
      activeFilterStack = activeFilterStack.filter(f => f.id !== id);
      console.log(activeFilterStack)
    }
    applyAllFilters();
  });
}

// Авто-привязка всех переключтелей
document.querySelectorAll('[data-filter]').forEach(checkbox => {
  const filterName = checkbox.dataset.filter;
  if (filters[filterName]) {
    attachFilter(checkbox.id, filters[filterName]);
  }
});

// Привязка изменений у ползунков
document.getElementById('sidebar').addEventListener('input', (e) => {
  if (e.target.type === 'range') applyAllFilters();
});

// Функция получения параметров
function getParams() {
  const params = {};
  document.querySelectorAll('[data-param]').forEach(input => {
    params[input.dataset.param] = parseFloat(input.value);
  });
  params.width = canvas.width;
  
  return params;
}

// Применение фильтров
function applyAllFilters() {
  if (!originalImageData) return;

  const workingData = new ImageData(
    new Uint8ClampedArray(originalImageData.data),
    originalImageData.width,
    originalImageData.height
  );

  const params = getParams();
  
  for (let i = 0; i < activeFilterStack.length; i++) {
    activeFilterStack[i].fn(workingData.data, params);
  }

  ctx.putImageData(workingData, 0, 0);
}

