const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
    
    // --- NOVA LÓGICA DE BUSCA INTELIGENTE ---
    const index = lines.findIndex(line => {
      const trimmed = line.trim();
      
      // Testa todas as variações de aspas que o TMDL pode ter gerado (incluindo calculation items!)
      return trimmed.startsWith(`measure '${itemName}'`) || 
             trimmed.startsWith(`measure "${itemName}"`) || 
             trimmed.startsWith(`measure ${itemName}`) ||
             trimmed.startsWith(`column '${itemName}'`) || 
             trimmed.startsWith(`column "${itemName}"`) || 
             trimmed.startsWith(`column ${itemName}`) ||
             trimmed.startsWith(`calculationItem '${itemName}'`) || 
             trimmed.startsWith(`calculationItem "${itemName}"`) || 
             trimmed.startsWith(`calculationItem ${itemName}`);
    });

    if (index !== -1) {
      const match = lines[index].match(/^(\s*)/);
      const indent = match ? match[1] : '';
      let i = index - 1;
      
      // Limpa as descrições antigas
      while (i >= 0 && lines[i].trim().startsWith('///')) {
        lines.splice(i, 1);
        i--;
      }
      
      // Insere a nova
      const newIndex = i + 1;
      const formattedDesc = newDescription.split('\n').map(d => `${indent}/// ${d}`).join('\n');
      lines.splice(newIndex, 0, formattedDesc);
      
      // Salva no HD
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      return { success: true };
    }
    return { success: false, error: 'Item não encontrado no arquivo TMDL. Verifique as aspas.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- NOVO CÓDIGO PARA ABRIR A PASTA NATIVAMENTE ---
ipcMain.handle('select-pbip-folder', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Selecione a pasta do projeto .PBIP'
  });
  
  if (result.canceled) return null;
  
  const rootPath = result.filePaths[0];
  
  // Função para ler todos os ficheiros dentro das subpastas
  const getAllFiles = (dirPath, arrayOfFiles = []) => {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push({
          path: fullPath,
          name: file,
          // Mantém a estrutura de pastas que o parser espera
          webkitRelativePath: path.relative(path.dirname(rootPath), fullPath).replace(/\\/g, '/')
        });
      }
    });
    
    return arrayOfFiles;
  };

  try {
    return getAllFiles(rootPath);
  } catch (err) {
    return null;
  }
});