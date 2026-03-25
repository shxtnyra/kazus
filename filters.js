// --- РЕЕСТР ФУНКЦИЙ ---

const bayerMatrix = [
  [ 10, 128,  32, 160],
  [192,  164, 224,  96],
  [ 48, 176,  116, 144],
  [240, 112, 208,  180]
];

const filters = {
  grayscale(data) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = data[i+1] = data[i+2] = gray;
    }
  },

  negative(data) {
    for (let i = 0; i < data.length; i += 4){
      data[i]   = 255 - data[i];
      data[i+1] = 255 - data[i+1];
      data[i+2] = 255 - data[i+2];
    }
  },

  binarization(data, params) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i+1] + data[i+2]) / 3;
      const val = gray >= params.binarizationThreshold ? 255 : 0;
      data[i] = data[i+1] = data[i+2] = val;
    }
  },

  powerlaw(data, params) {
    const gamma = params.powerLaw;

    // Предрасчёт LUT
    const lut = new Uint8ClampedArray(256)
    for(let i = 0; i < 256; i++) {
      lut[i] = 255 * Math.pow(i / 255, gamma);``
    }
    
    for (let i = 0; i < data.length; i += 4) {
      data[i]   = lut[data[i]];
      data[i+1] = lut[data[i+1]];
      data[i+2] = lut[data[i+2]];
    }
  },

  logtransform(data, params) {
    const gain = params.logGain;
    const c = 255 / Math.log(1 + 255 * gain);

    // Опять предрасчёты
    const lut = new Uint8ClampedArray(256);
    for(let i = 0; i < 256; i++) {
      lut[i] = c * Math.log(1 + i * gain);
    }
    
    for (let i = 0; i < data.length; i += 4) {
      data[i]   = lut[data[i]];
      data[i+1] = lut[data[i+1]];
      data[i+2] = lut[data[i+2]];
    }
  },

  quantization(data, params) {
    const steps = params.quantSteps
    const stepSize = 255 / steps;

    // И опять
    const lut = new Uint8ClampedArray(256);
    for(let i = 0; i < 256; i++) {
      lut[i] = Math.round(i / stepSize) * stepSize;
    }

    for (let i = 0; i < data.length; i += 4) {
      data[i]   = lut[data[i]];
      data[i+1] = lut[data[i+1]];
      data[i+2] = lut[data[i+2]];
    }
  },

  solarisation(data, params) {
    const threshold = params.solarThreshold

    const lut = new Uint8ClampedArray(256);
    for(let i = 0; i < 256; i++) {
      lut[i] = i > threshold ? 255 - i : i;
    }
    
    for (let i = 0; i < data.length; i += 4) {
      data[i]   = lut[data[i]];
      data[i+1] = lut[data[i+1]];
      data[i+2] = lut[data[i+2]];
    }
  },

  // Пока без lut хз надо ли
  pixelate(data, params) {
    const size = params.pixelSize;
    const width = params.width;

    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);

      const blockX = Math.floor(x / size) * size;
      const blockY = Math.floor(y / size) * size;

      const blockI = (blockY * width + blockX) * 4;

      data[i]     = data[blockI];
      data[i + 1] = data[blockI + 1];
      data[i + 2] = data[blockI + 2];
    }
  },

  scanlines(data, params) {
    const width = params.width;

    for (let i = 0; i < data.length; i += 4) {
      const y = Math.floor((i / 4) / width);
      
      if (y % 2 === 0) {
        data[i] = 0;
        data[i+1] = 0;
        data[i+2] = 0;
      }
    }
  },

  // Тут вроде LUT не поможет
  huerotate(data, params) {
    const angle = (params.hueAngle) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
  
    for (let i = 0; i < data.length; i += 4) {
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
  },

  saltpepper(data, params) {
    const probability = params.saltPepperProb
    
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < probability) {
      const val = Math.random() > 0.5 ? 255 : 0;
      data[i] = data[i+1] = data[i+2] = val;
    }
    }
  },

  filmgrain(data, params) {
    const amount = params.grainAmount || 15;
    
    for (let i = 0; i < data.length; i += 4) {
      // Один шум для всех каналов (монохромное зерно)
      const noise = (Math.random() - 0.5) * amount;
      
      data[i]     = Math.max(0, Math.min(255, data[i] + noise));
      data[i+1]   = Math.max(0, Math.min(255, data[i+1] + noise));
      data[i+2]   = Math.max(0, Math.min(255, data[i+2] + noise));
    }
  },

  dithering(data, params) {
    const width = params.width;
    const dScale = params.ditherScale || 1;      // DPI паттерна
    const dThresh = params.ditherThreshold || 1; // Сдвиг порога
    const dLinear = params.ditherLinear || 1;    // Линейное усиление яркости

    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);

      // 1. Учитываем масштаб паттерна (DPI)
      // Делим координаты на dScale, чтобы «растянуть» матрицу Байера
      const mX = Math.floor(x / dScale) % 4;
      const mY = Math.floor(y / dScale) % 4;
      
      // Получаем базовый порог из матрицы (0-255)
      const bayerValue = bayerMatrix[mY][mX];

      // 2. Рассчитываем серый цвет с учетом линейного масштаба
      const r = data[i], g = data[i+1], b = data[i+2];
      let gray = (0.299 * r + 0.587 * g + 0.114 * b) * dLinear;

      // 3. Сравнение с модифицированным порогом
      const finalVal = gray > (bayerValue * dThresh) ? 255 : 0;

      data[i] = data[i+1] = data[i+2] = finalVal;
    }
  },


  // Ультрапродвинутый diserth
  floydSteinberg(data, params) {
    const width = params.width;
    const height = data.length / (width * 4);

    for (let y = 0; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        const oldR = data[i], oldG = data[i+1], oldB = data[i+2];
        
        // Квантование (бинаризация для примера)
        const newR = oldR < 128 ? 0 : 255;
        const newG = oldG < 128 ? 0 : 255;
        const newB = oldB < 128 ? 0 : 255;

        data[i] = newR; data[i+1] = newG; data[i+2] = newB;

        const errR = oldR - newR, errG = oldG - newG, errB = oldB - newB;

        // Распределяем ошибку на соседей (коэффициенты алгоритма)
        const distribute = (nx, ny, factor) => {
          const idx = (ny * width + nx) * 4;
          data[idx] += errR * factor;
          data[idx+1] += errG * factor;
          data[idx+2] += errB * factor;
        };

        distribute(x + 1, y, 7 / 16);
        distribute(x - 1, y + 1, 3 / 16);
        distribute(x, y + 1, 5 / 16);
        distribute(x + 1, y + 1, 1 / 16);
      }
    }
  },
}

export default filters