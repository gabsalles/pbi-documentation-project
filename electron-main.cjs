const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path'); // ESSENCIAL: Não pode faltar!
const fs = require('fs');

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Cole o handler de salvamento no final do ficheiro
ipcMain.handle('save-description', async (event, { filePath, itemName, newDescription, type }) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const marker = type === 'measure' ? `measure ${itemName}` : `column ${itemName}`;
    const index = lines.findIndex(line => line.includes(marker));

    if (index !== -1) {
      const match = lines[index].match(/^(\s*)/);
      const indent = match ? match[1] : '';
      let i = index - 1;
      while (i >= 0 && lines[i].trim().startsWith('///')) {
        lines.splice(i, 1);
        i--;
      }
      const newIndex = i + 1;
      const formattedDesc = newDescription.split('\n').map(d => `${indent}/// ${d}`).join('\n');
      lines.splice(newIndex, 0, formattedDesc);
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      return { success: true };
    }
    return { success: false, error: 'Item não encontrado' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});