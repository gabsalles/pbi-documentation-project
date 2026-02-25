const { app, BrowserWindow, ipcMain } = require('electron'); // Adicione ipcMain
const fs = require('fs'); // Adicione fs para ler/escrever arquivos

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'build', 'icon.ico'), // Descomente quando tiver o ícone pronto!
    autoHideMenuBar: true, // Esconde aquela barra "Arquivo, Editar, Exibir"
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Se estivermos em desenvolvimento, carrega o Vite local
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
  } else {
    // Se for o .exe final, carrega a pasta dist/ que o Vite gerou
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// No final do arquivo, adicione o "Ouvidor" de salvamento:
ipcMain.handle('save-description', async (event, { filePath, itemName, newDescription, type }) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    // Lógica para achar a linha da medida ou coluna
    // Ex: measure 'Nome da Medida' ou column 'Nome da Coluna'
    const marker = type === 'measure' ? `measure ${itemName}` : `column ${itemName}`;
    const index = lines.findIndex(line => line.includes(marker));

    if (index !== -1) {
      // 1. Remove descrições antigas (linhas com /// acima do item)
      let i = index - 1;
      while (i >= 0 && lines[i].trim().startsWith('///')) {
        lines.splice(i, 1);
        i--;
      }

      // 2. Insere a nova descrição (ajusta o índice porque deletamos linhas)
      const newIndex = i + 1;
      const formattedDesc = `/// ${newDescription.replace(/\n/g, '\n/// ')}`;
      lines.splice(newIndex, 0, formattedDesc);

      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      return { success: true };
    }
    return { success: false, error: 'Item não encontrado no arquivo.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});