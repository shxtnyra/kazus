const { app, BrowserWindow, Menu, clipboard, nativeImage, dialog, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

function createWindow() {
  Menu.setApplicationMenu(null);

  nativeTheme.themeSource = 'dark'

  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 700,
    minHeight: 500,
    icon: path.join(__dirname, 'icons/icon-256.ico'),
    center: true,
    backgroundColor: '#312450',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      forcedColors: 'none',
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  })

  // Контекстное меню
  win.webContents.on('context-menu', (event, params) => {
    // Проверяем, что клик был по canvas
    if (params.mediaType === 'canvas' || params.selectionMenu) {
      const template = [
        {
          label: 'Копировать изображение',
          click: () => {
            win.webContents.executeJavaScript(`
              document.querySelector('canvas').toBlob(blob => {
                navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': blob })
                ]);
              }, 'image/png');
            `);
          }
        },
        {
          label: 'Сохранить как...',
          click: async () => {
            const dataUrl = await win.webContents.executeJavaScript(`
              document.querySelector('canvas').toDataURL('image/png');
            `);
            
            const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
            
            const result = await dialog.showSaveDialog(win, {
              title: 'Сохранить изображение',
              defaultPath: randomUUID() + '.png',
              filters: [{ name: 'PNG', extensions: ['png'] }]
            });

            if (!result.canceled && result.filePath) {
              fs.writeFileSync(result.filePath, buffer);
            }
          }
        }
      ];

      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: win });
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);