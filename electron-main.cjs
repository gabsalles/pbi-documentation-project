const { app, BrowserWindow } = require('electron');
const path = require('path');

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