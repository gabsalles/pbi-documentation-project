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
    win.webContents.openDevTools(); // <--- ADICIONE ESTA LINHA!
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

// --- ORGANIZADOR EM LOTE (PASTAS) ---
ipcMain.handle('bulk-update-folders', async (event, { updates }) => {
  let successCount = 0;
  let errors = [];

  for (const update of updates) {
    try {
      let content = fs.readFileSync(update.filePath, 'utf-8');
      let lines = content.split(/\r?\n/);

      const index = lines.findIndex(line => {
        const t = line.trim();
        return t.startsWith(`measure '${update.itemName}'`) || 
               t.startsWith(`measure "${update.itemName}"`) || 
               t.startsWith(`measure ${update.itemName}`);
      });

      if (index !== -1) {
        const match = lines[index].match(/^(\s*)/);
        const indent = match ? match[1] : '';
        const propertyIndent = indent + '\t'; // Recuo padrão para propriedades

        // Tenta achar um displayFolder já existente nas próximas linhas para substituir
        let i = index + 1;
        let foundOldFolder = false;
        
        while (i < lines.length && (lines[i].trim() === '' || lines[i].match(/^\s+/) || lines[i].trim().startsWith('///'))) {
            if (lines[i].trim().startsWith('displayFolder')) {
                lines[i] = `${propertyIndent}displayFolder: ${update.newFolder}`; // Atualiza o existente
                foundOldFolder = true;
                break;
            }
            i++;
        }

        // Se não tinha pasta antes, cria uma linha nova logo abaixo da medida
        if (!foundOldFolder) {
            lines.splice(index + 1, 0, `${propertyIndent}displayFolder: ${update.newFolder}`);
        }

        fs.writeFileSync(update.filePath, lines.join('\n'), 'utf-8');
        successCount++;
      } else {
        errors.push(`Não achei: ${update.itemName}`);
      }
    } catch (e) {
      errors.push(`Erro ${update.itemName}: ${e.message}`);
    }
  }
  return { success: true, successCount, errors };
});

// --- MOTOR DE TRANSFERÊNCIA DE MEDIDAS ENTRE TABELAS ---
ipcMain.handle('move-measures', async (event, { moves }) => {
  let successCount = 0;
  let errors = [];

  for (const move of moves) {
    try {
      // 1. LER O FICHEIRO DE ORIGEM
      let sourceContent = fs.readFileSync(move.sourcePath, 'utf-8');
      let sourceLines = sourceContent.split(/\r?\n/);
      
      const measureStartIndex = sourceLines.findIndex(line => {
        const t = line.trim();
        return t.startsWith(`measure '${move.itemName}'`) || 
               t.startsWith(`measure "${move.itemName}"`) || 
               t.startsWith(`measure ${move.itemName}`);
      });

      if (measureStartIndex === -1) {
        errors.push(`Não encontrei: ${move.itemName} na origem.`);
        continue;
      }

      // Detetar a indentação original da medida (normalmente 1 Tab)
      const baseIndentMatch = sourceLines[measureStartIndex].match(/^(\s*)/);
      const baseIndent = baseIndentMatch ? baseIndentMatch[1] : '';
      
      // Encontrar onde termina o bloco da medida (onde a indentação volta a ser igual ou menor)
      let endIndex = measureStartIndex + 1;
      while (endIndex < sourceLines.length) {
        const line = sourceLines[endIndex];
        if (line.trim() === '') { endIndex++; continue; } // Ignora linhas em branco no meio
        
        const lineIndent = line.match(/^(\s*)/)[1];
        // Se a indentação for menor ou igual e não for um comentário ///, o bloco acabou
        if (lineIndent.length <= baseIndent.length && !line.trim().startsWith('///')) {
           break;
        }
        endIndex++;
      }

      // Subir para incluir os comentários /// antes da medida
      let actualStartIndex = measureStartIndex;
      while (actualStartIndex > 0 && sourceLines[actualStartIndex - 1].trim().startsWith('///')) {
         actualStartIndex--;
      }

      // RECORTAR o bloco inteiro da matriz original
      const measureBlock = sourceLines.splice(actualStartIndex, endIndex - actualStartIndex);
      
      // Ajustar a pasta (displayFolder) no bloco recortado
      if (move.newFolder) {
         const folderLineIndex = measureBlock.findIndex(l => l.trim().startsWith('displayFolder'));
         const propertyIndent = baseIndent + '\t'; // Indentação de propriedade
         
         if (folderLineIndex !== -1) {
             measureBlock[folderLineIndex] = `${propertyIndent}displayFolder: ${move.newFolder}`; // Substitui
         } else {
             // Insere logo abaixo da linha "measure 'Nome' = ..."
             const insertPos = (measureStartIndex - actualStartIndex) + 1;
             measureBlock.splice(insertPos, 0, `${propertyIndent}displayFolder: ${move.newFolder}`);
         }
      }

      // GRAVAR AS ALTERAÇÕES NO FICHEIRO DE ORIGEM (Sem a medida)
      fs.writeFileSync(move.sourcePath, sourceLines.join('\n'), 'utf-8');

      // 2. LER E COLAR NO FICHEIRO DE DESTINO
      let targetContent = fs.readFileSync(move.targetPath, 'utf-8');
      // Colar o bloco no final do ficheiro da nova tabela
      targetContent += '\n\n' + measureBlock.join('\n');
      fs.writeFileSync(move.targetPath, targetContent, 'utf-8');

      successCount++;
    } catch (e) {
      errors.push(`Erro em ${move.itemName}: ${e.message}`);
    }
  }
  return { success: true, successCount, errors };
});