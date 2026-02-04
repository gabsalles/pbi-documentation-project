import { PBIModel } from '../types';

const escapeHtml = (unsafe: string | undefined | null): string => {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const generateStaticHtml = (model: PBIModel): string => {
  const now = new Date().toLocaleDateString('pt-BR');
  const safeDatasetName = escapeHtml(model.datasetName);
  
  // Calculate Stats
  const totalTables = model.tables.length;
  const totalMeasures = model.tables.reduce((acc, t) => acc + t.measures.length, 0);
  const totalColumns = model.tables.reduce((acc, t) => acc + t.columns.length, 0);
  const totalPages = model.pages.length;
  
  // Health Metrics
  const unusedMeasures = model.tables.reduce((acc, t) => acc + t.measures.filter(m => !m.isUsedInReport).length, 0);
  const healthScore = Math.max(0, Math.round(100 - ((unusedMeasures / (totalMeasures || 1)) * 100)));

  const style = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    :root {
        /* Bradesco 2026 Colors */
        --brand-red: #CC092F;
        --brand-red-hover: #b30022;
        --brand-dark: #1F1F1F;
        --brand-gray-bg: #F5F7F9;
        --brand-surface: #FFFFFF;
        
        /* Typography */
        --font-main: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        --text-primary: #111827;
        --text-secondary: #6B7280;
        --text-tertiary: #9CA3AF;
        
        /* Syntax Highlighting */
        --code-bg: #1e1e1e;
        --code-text: #e4e4e7;
        --code-keyword: #ff79c6; 
        --code-function: #8be9fd; 
        --code-string: #f1fa8c; 
        --code-number: #bd93f9; 
        --code-comment: #6272a4; 
        
        /* UX Metrics */
        --radius-lg: 20px;
        --radius-md: 12px;
        --radius-sm: 8px;
        --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
        --shadow-card: 0 4px 20px rgba(0,0,0,0.05);
        --shadow-hover: 0 10px 25px rgba(0,0,0,0.08);
    }

    * { box-sizing: border-box; outline: none; -webkit-font-smoothing: antialiased; }

    body {
        font-family: var(--font-main);
        background-color: var(--brand-gray-bg);
        color: var(--text-primary);
        margin: 0;
        padding: 0;
        height: 100vh;
        overflow: hidden;
        display: flex;
        font-size: 14px;
        line-height: 1.5;
    }

    /* --- SIDEBAR --- */
    .sidebar {
        width: 280px;
        background-color: var(--brand-surface);
        display: flex;
        flex-direction: column;
        padding: 0;
        flex-shrink: 0;
        border-right: 1px solid rgba(0,0,0,0.05);
        z-index: 20;
    }

    .brand-header {
        height: 80px;
        display: flex;
        align-items: center;
        padding: 0 32px;
        margin-bottom: 20px;
    }

    .brand-logo {
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    
    .logo-text {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: var(--brand-red);
        line-height: 1;
    }
    
    .logo-sub {
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: var(--text-tertiary);
        margin-top: 4px;
    }

    .nav-links {
        padding: 0 16px;
        flex: 1;
        overflow-y: auto;
    }

    .nav-group {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--text-tertiary);
        font-weight: 600;
        padding: 0 16px;
        margin-bottom: 8px;
        margin-top: 16px;
    }

    .nav-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        margin-bottom: 4px;
        border-radius: var(--radius-md);
        color: var(--text-secondary);
        text-decoration: none;
        font-weight: 500;
        transition: all 0.2s ease;
        cursor: pointer;
        border: 1px solid transparent;
    }

    .nav-item:hover {
        background-color: #FAFAFA;
        color: var(--brand-dark);
    }

    .nav-item.active {
        background-color: #FFF0F2; 
        color: var(--brand-red);
        font-weight: 600;
    }
    
    .nav-icon { width: 18px; height: 18px; margin-right: 12px; stroke-width: 2px; }

    .sidebar-footer {
        padding: 24px;
        border-top: 1px solid rgba(0,0,0,0.05);
        font-size: 11px;
        color: var(--text-tertiary);
    }

    /* --- MAIN CONTENT --- */
    .main {
        flex: 1;
        overflow-y: auto;
        padding: 40px 60px;
        scroll-behavior: smooth;
    }

    .container { max-width: 1200px; margin: 0 auto; padding-bottom: 100px; }

    header { 
        margin-bottom: 48px; 
    }
    
    .header-badge {
        display: inline-flex;
        align-items: center;
        background: #FFFFFF;
        border: 1px solid #E5E7EB;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 16px;
        box-shadow: var(--shadow-sm);
    }

    h1 { 
        font-size: 36px; 
        font-weight: 700; 
        margin: 0 0 8px 0; 
        color: var(--text-primary); 
        letter-spacing: -1px; 
        line-height: 1.1;
    }
    
    .subtitle { 
        color: var(--text-secondary); 
        font-size: 16px; 
        font-weight: 400; 
    }

    /* --- SECTIONS (TABS) --- */
    .section { display: none; animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .section.active { display: block; }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    /* --- WIDGETS --- */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 24px;
        margin-bottom: 48px;
    }

    .widget {
        background: var(--brand-surface);
        padding: 24px;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-card);
        display: flex;
        flex-direction: column;
        transition: transform 0.2s, box-shadow 0.2s;
        border: 1px solid rgba(0,0,0,0.02);
        position: relative;
        overflow: hidden;
    }
    .widget:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); }

    .widget::before {
        content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%;
        background: var(--brand-red); opacity: 0; transition: opacity 0.2s;
    }
    .widget:hover::before { opacity: 1; }

    .widget-val { font-size: 36px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; letter-spacing: -1px; }
    .widget-lbl { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; }
    
    .widget-icon-bg { 
        width: 48px; height: 48px; border-radius: 16px; 
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 20px; 
        background: #FAFAFA;
        color: var(--text-primary);
    }

    /* --- CARDS & SEARCH --- */
    .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
        position: sticky;
        top: 0;
        z-index: 10;
        background: rgba(245, 247, 249, 0.8);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        padding: 16px 0;
    }
    
    .section-title { font-size: 20px; font-weight: 700; color: var(--text-primary); }

    .search-box { position: relative; width: 320px; }
    .search-input {
        width: 100%;
        padding: 12px 16px 12px 44px;
        border-radius: 12px;
        border: 1px solid transparent;
        background: #FFFFFF;
        font-size: 14px;
        transition: all 0.2s;
        box-shadow: var(--shadow-sm);
        font-family: var(--font-main);
    }
    .search-input:focus { 
        border-color: rgba(204,9,47,0.3); 
        box-shadow: 0 0 0 4px rgba(204,9,47,0.05); 
    }
    .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); width: 18px; height: 18px; }

    .card {
        background: var(--brand-surface);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-card);
        margin-bottom: 24px;
        overflow: hidden;
        border: 1px solid rgba(0,0,0,0.02);
        transition: box-shadow 0.2s;
    }
    
    .card:hover { box-shadow: var(--shadow-hover); }

    .card-header {
        padding: 24px 32px;
        border-bottom: 1px solid rgba(0,0,0,0.03);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .card-title { font-size: 16px; font-weight: 700; margin: 0; color: var(--text-primary); }
    .card-subtitle { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
    
    .badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .badge-primary { background: var(--brand-red); color: white; }
    .badge-gray { background: #F3F4F6; color: #4B5563; }
    .badge-green { background: #ECFDF5; color: #059669; }
    
    .desc-box {
        padding: 24px 32px;
        background: #FAFAFA;
        color: var(--text-secondary);
        font-size: 14px;
        border-bottom: 1px solid rgba(0,0,0,0.03);
        line-height: 1.6;
    }

    /* --- DATA TABLES --- */
    .table-container { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th {
        text-align: left;
        padding: 16px 32px;
        background: #FFFFFF;
        color: var(--text-tertiary);
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        border-bottom: 1px solid #F3F4F6;
    }
    .data-table td {
        padding: 16px 32px;
        border-bottom: 1px solid #F9FAFB;
        color: var(--text-primary);
        vertical-align: top;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: #F9FAFB; }
    
    .col-name { font-weight: 600; color: var(--text-primary); font-size: 14px;}
    .col-meta { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
    
    /* --- CODE BLOCKS (SYNTAX HIGHLIGHT) --- */
    .code-container {
        position: relative;
        background: var(--code-bg);
        border-radius: var(--radius-md);
        margin: 0;
        overflow: hidden;
    }
    
    .code-block {
        color: var(--code-text);
        padding: 24px;
        font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
        overflow-x: auto;
        white-space: pre-wrap;
    }
    
    .copy-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        background: rgba(255,255,255,0.1);
        border: none;
        color: #fff;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        opacity: 0;
        backdrop-filter: blur(4px);
    }
    .code-container:hover .copy-btn { opacity: 1; }
    .copy-btn:hover { background: rgba(255,255,255,0.2); }

    /* Syntax Colors */
    .kwd { color: var(--code-keyword); font-weight: bold; }
    .func { color: var(--code-function); }
    .str { color: var(--code-string); }
    .num { color: var(--code-number); }
    .cmt { color: var(--code-comment); font-style: italic; }

    /* --- RELATIONSHIP DIAGRAM LIST --- */
    .rel-item {
        display: flex;
        align-items: center;
        padding: 20px 32px;
        border-bottom: 1px solid #F3F4F6;
        transition: background 0.1s;
    }
    .rel-item:hover { background: #FAFAFA; }
    
    .rel-node {
        flex: 1;
        background: #FFFFFF;
        padding: 12px 16px;
        border-radius: var(--radius-sm);
        border: 1px solid #E5E7EB;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .rel-table { font-weight: 700; font-size: 14px; color: var(--text-primary); }
    .rel-col { font-size: 12px; color: var(--text-secondary); margin-top: 2px; display: flex; align-items: center; gap:4px; }
    .rel-col::before { content:''; display:inline-block; width:6px; height:6px; background:#E5E7EB; border-radius:50%; }
    
    .rel-connector {
        padding: 0 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        color: var(--text-tertiary);
        font-size: 10px;
        font-weight: 700;
        min-width: 120px;
    }
    .rel-line {
        height: 2px;
        background: #E5E7EB;
        width: 100%;
        margin: 6px 0;
        position: relative;
    }
    .rel-line.active { background: var(--brand-red); opacity: 0.8; }
    .rel-line::after {
        content: ''; position: absolute; right: 0; top: -3px;
        width: 0; height: 0; 
        border-top: 4px solid transparent; border-bottom: 4px solid transparent;
        border-left: 6px solid #E5E7EB;
    }
    .rel-line.active::after { border-left-color: var(--brand-red); }
    
    /* --- DEPENDENCIES --- */
    .dep-container {
        padding: 20px 32px;
        background: #FAFAFA;
        border-top: 1px solid rgba(0,0,0,0.03);
    }
    .dep-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-tertiary);
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 12px;
    }
    .dep-tag {
        display: inline-flex;
        align-items: center;
        font-size: 12px;
        background: #FFFFFF;
        border: 1px solid #E5E7EB;
        padding: 6px 12px;
        border-radius: 20px;
        color: var(--text-secondary);
        margin-right: 8px;
        margin-bottom: 8px;
    }

    /* --- REPORT GRID --- */
    .visual-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 24px;
    }
    .visual-card {
        background: #FFFFFF;
        border: 1px solid #E5E7EB;
        padding: 16px;
        border-radius: var(--radius-md);
        transition: all 0.2s;
    }
    .visual-card:hover { border-color: var(--brand-red); transform: translateY(-2px); box-shadow: var(--shadow-sm); }
    
    /* --- PRINT OPTIMIZATIONS --- */
    @media print {
        body { height: auto; overflow: visible; display: block; background: white; padding: 0; }
        .sidebar, .toolbar, .copy-btn { display: none; }
        .main { padding: 0; width: 100%; }
        .container { max-width: 100%; padding: 20px; }
        .section { display: block !important; margin-bottom: 40px; page-break-inside: avoid; }
        .card { box-shadow: none; border: 1px solid #ccc; break-inside: avoid; margin-bottom: 20px; }
        .code-container { background: #f5f5f5; border: 1px solid #ddd; color: #000; }
        .code-block { color: #000 !important; }
        .kwd, .func, .str, .num, .cmt { color: #000 !important; font-weight: normal; }
    }
  `;

  // Minimalist Icons (SVG)
  const Icons = {
    overview: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    table: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4h6V3zm0 18v-6H3v4a2 2 0 0 0 2 2h4zm2-18v6h10V5a2 2 0 0 0-2-2h-8zm0 18h8a2 2 0 0 0 2-2v-4H11v6zm0-8h10v-6H11v6zm-8 0h6v-6H3v6z"></path></svg>`,
    calc: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>`, 
    rel: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><line x1="6" y1="9" x2="6" y2="21"></line></svg>`,
    report: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`
  };

  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Docs - ${safeDatasetName}</title>
    <style>${style}</style>
</head>
<body>

    <!-- SIDEBAR -->
    <nav class="sidebar">
        <div class="brand-header">
            <div class="brand-logo">
               <div class="logo-text">Bradesco</div>
               <div class="logo-sub">PBIP Docs</div>
            </div>
        </div>
        <div class="nav-links">
            <div class="nav-group">Menu Principal</div>
            <a class="nav-item active" onclick="switchTab('overview', this)">
                <div class="nav-icon">${Icons.overview}</div> Visão Geral
            </a>
            <a class="nav-item" onclick="switchTab('tables', this)">
                <div class="nav-icon">${Icons.table}</div> Dicionário de Tabelas
            </a>
            <a class="nav-item" onclick="switchTab('measures', this)">
                <div class="nav-icon">${Icons.calc}</div> Lógica e Medidas
            </a>
            <a class="nav-item" onclick="switchTab('relationships', this)">
                <div class="nav-icon">${Icons.rel}</div> Relacionamentos
            </a>
            <a class="nav-item" onclick="switchTab('reports', this)">
                <div class="nav-icon">${Icons.report}</div> Relatório Visual
            </a>
        </div>
        <div class="sidebar-footer">
            <div style="font-weight:600; color:var(--text-primary)">${safeDatasetName}</div>
            <div style="margin-top:4px; opacity:0.7">Gerado em ${now}</div>
        </div>
    </nav>

    <!-- MAIN -->
    <main class="main">
        <div class="container">
            <header>
                <div class="header-badge">Documentação Técnica</div>
                <h1>${safeDatasetName}</h1>
                <div class="subtitle">Especificação completa do modelo semântico e dependências visuais.</div>
            </header>

            <!-- SECTION: OVERVIEW -->
            <div id="overview" class="section active">
                <div class="stats-grid">
                    <div class="widget">
                        <div class="widget-icon-bg">${Icons.table}</div>
                        <div class="widget-val">${totalTables}</div>
                        <div class="widget-lbl">Tabelas</div>
                    </div>
                    <div class="widget">
                        <div class="widget-icon-bg">${Icons.calc}</div>
                        <div class="widget-val">${totalMeasures}</div>
                        <div class="widget-lbl">Medidas</div>
                    </div>
                    <div class="widget">
                        <div class="widget-icon-bg">${Icons.overview}</div>
                        <div class="widget-val">${totalColumns}</div>
                        <div class="widget-lbl">Colunas</div>
                    </div>
                    <div class="widget">
                        <div class="widget-icon-bg">${Icons.report}</div>
                        <div class="widget-val">${totalPages}</div>
                        <div class="widget-lbl">Páginas</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Resumo Executivo</h3>
                    </div>
                    <div class="desc-box" style="background:white; padding:32px;">
                        <p style="font-size:16px; margin:0 0 16px 0; color:var(--text-primary);">
                            Este documento apresenta a arquitetura de dados do projeto <strong>${safeDatasetName}</strong>.
                            O modelo contém <strong>${model.relationships.length} relacionamentos</strong> e suporta visualizações distribuídas em <strong>${totalPages} páginas</strong>.
                        </p>
                        
                        <div style="display:flex; gap:16px; margin-top:24px;">
                            <div style="flex:1; padding:20px; background:#FAFAFA; border-radius:12px; border:1px solid #E5E7EB;">
                                <div style="font-size:11px; text-transform:uppercase; font-weight:700; color:var(--text-tertiary); margin-bottom:8px;">Índice de Uso</div>
                                <div style="font-size:24px; font-weight:700; color:var(--brand-dark);">${healthScore}%</div>
                                <div style="font-size:13px; color:var(--text-secondary);">Das medidas estão aplicadas em visuais.</div>
                            </div>
                            <div style="flex:1; padding:20px; background:#FAFAFA; border-radius:12px; border:1px solid #E5E7EB;">
                                <div style="font-size:11px; text-transform:uppercase; font-weight:700; color:var(--text-tertiary); margin-bottom:8px;">Modo de Armazenamento</div>
                                <div style="font-size:24px; font-weight:700; color:var(--brand-dark);">${model.tables[0]?.type || 'Misto'}</div>
                                <div style="font-size:13px; color:var(--text-secondary);">Arquitetura principal do dataset.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECTION: TABLES -->
            <div id="tables" class="section">
                <div class="toolbar">
                    <h2 class="section-title">Dicionário de Tabelas</h2>
                    <div class="search-box">
                        <div class="search-icon">${Icons.search}</div>
                        <input type="text" class="search-input" placeholder="Filtrar tabelas e colunas..." onkeyup="filterCards('tables', this.value)">
                    </div>
                </div>

                <div id="tables-list">
                    ${model.tables.map(t => `
                        <div class="card search-item" data-search="${escapeHtml(t.name.toLowerCase())} ${t.columns.map(c => escapeHtml(c.name.toLowerCase())).join(' ')}">
                            <div class="card-header">
                                <div>
                                    <h3 class="card-title">${escapeHtml(t.name)}</h3>
                                    <div class="card-subtitle">${t.columns.length} Colunas • ${t.measures.length} Medidas</div>
                                </div>
                                <span class="badge badge-gray">${escapeHtml(t.type)}</span>
                            </div>
                            
                            ${t.description ? `<div class="desc-box">${escapeHtml(t.description)}</div>` : ''}

                            ${t.sourceExpression ? `
                            <details style="border-bottom:1px solid #F3F4F6;">
                                <summary style="padding:16px 32px; cursor:pointer; font-size:12px; font-weight:600; color:var(--brand-red); display:flex; align-items:center; gap:8px; outline:none;">
                                    ${Icons.code} Visualizar Fonte de Dados (M)
                                </summary>
                                <div class="code-container" style="margin:0 32px 24px 32px;">
                                    <button class="copy-btn" onclick="copyToClipboard(this)">Copiar</button>
                                    <div class="code-block language-powerquery">${escapeHtml(t.sourceExpression)}</div>
                                </div>
                            </details>` : ''}

                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th style="width:40%">Coluna</th>
                                            <th style="width:20%">Tipo</th>
                                            <th style="width:20%">Origem</th>
                                            <th style="width:20%">Uso</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${t.columns.map(c => `
                                            <tr>
                                                <td>
                                                    <div class="col-name">${escapeHtml(c.name)}</div>
                                                    ${c.description ? `<div class="col-meta">${escapeHtml(c.description)}</div>` : ''}
                                                </td>
                                                <td><span style="font-family:monospace; color:var(--text-secondary); background:#F3F4F6; padding:2px 6px; border-radius:4px;">${escapeHtml(c.dataType)}</span></td>
                                                <td><span style="font-size:12px; color:var(--text-tertiary);">${c.sourceColumn ? escapeHtml(c.sourceColumn) : 'Nativa'}</span></td>
                                                <td>
                                                    ${c.isUsedInReport 
                                                        ? '<span class="badge badge-green">Em Uso</span>' 
                                                        : '<span class="badge badge-gray">Não Usado</span>'}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- SECTION: MEASURES -->
            <div id="measures" class="section">
                <div class="toolbar">
                    <h2 class="section-title">Lógica de Negócio (Medidas)</h2>
                    <div class="search-box">
                        <div class="search-icon">${Icons.search}</div>
                        <input type="text" class="search-input" placeholder="Filtrar por nome ou código DAX..." onkeyup="filterCards('measures', this.value)">
                    </div>
                </div>

                <div id="measures-list">
                    ${model.tables.filter(t => t.measures.length > 0).map(t => `
                        <div class="search-item" data-search="${t.measures.map(m => escapeHtml(m.name.toLowerCase()) + ' ' + escapeHtml(m.expression.toLowerCase())).join(' ')}">
                            <h3 style="color:var(--text-tertiary); font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin: 32px 0 16px 0;">
                                ${escapeHtml(t.name)}
                            </h3>
                            ${t.measures.map(m => `
                                <div class="card" style="border-left: 4px solid ${m.isUsedInReport ? '#CC092F' : '#E5E7EB'}">
                                    <div class="card-header" style="border-bottom:none;">
                                        <div>
                                            <h4 class="card-title">${escapeHtml(m.name)}</h4>
                                        </div>
                                        ${m.isUsedInReport 
                                            ? '<span class="badge badge-green">Em Uso</span>' 
                                            : '<span class="badge badge-gray">Não Utilizada</span>'}
                                    </div>
                                    
                                    <div class="code-container" style="margin:0 32px 24px 32px;">
                                        <button class="copy-btn" onclick="copyToClipboard(this)">Copiar</button>
                                        <div class="code-block language-dax">${escapeHtml(m.expression)}</div>
                                    </div>

                                    ${m.dependencies.length > 0 ? `
                                        <div class="dep-container">
                                            <div class="dep-title">Dependências</div>
                                            <div>
                                                ${m.dependencies.map(d => `
                                                    <span class="dep-tag">${escapeHtml(d)}</span>
                                                `).join('')}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- SECTION: RELATIONSHIPS -->
            <div id="relationships" class="section">
                <h2 class="section-title" style="margin-bottom:32px;">Relacionamentos do Modelo</h2>
                <div class="card">
                    ${model.relationships.map(r => `
                        <div class="rel-item">
                            <div class="rel-node">
                                <div class="rel-table">${escapeHtml(r.fromTable)}</div>
                                <div class="rel-col">${escapeHtml(r.fromColumn)}</div>
                            </div>
                            <div class="rel-connector">
                                <div style="margin-bottom:4px; font-family:monospace; color:var(--text-secondary);">${r.cardinality === 'One' ? '1' : '*'}</div>
                                <div class="rel-line ${r.isActive ? 'active' : ''}"></div>
                                <div style="margin-top:4px; font-size:9px; text-transform:uppercase; letter-spacing:0.5px;">${r.crossFilteringBehavior === 'BothDirections' ? 'Bi-Direcional' : 'Única'}</div>
                            </div>
                            <div class="rel-node">
                                <div class="rel-table">${escapeHtml(r.toTable)}</div>
                                <div class="rel-col">${escapeHtml(r.toColumn)}</div>
                            </div>
                            <div style="margin-left:32px;">
                                ${r.isActive 
                                    ? '<span class="badge badge-primary">Ativo</span>' 
                                    : '<span class="badge badge-gray">Inativo</span>'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- SECTION: REPORT -->
            <div id="reports" class="section">
                <h2 class="section-title" style="margin-bottom:32px;">Estrutura Visual do Relatório</h2>
                <div class="visual-grid">
                    ${model.pages.map(p => `
                        <div class="card">
                            <div class="card-header" style="background:#FAFAFA;">
                                <h3 class="card-title">${escapeHtml(p.displayName)}</h3>
                                <div class="badge badge-gray">${p.visuals.length} Visuais</div>
                            </div>
                            <div style="padding:24px;">
                                ${p.visuals.length === 0 ? '<div style="color:var(--text-tertiary); font-style:italic; font-size:13px; text-align:center;">Página vazia.</div>' : ''}
                                <div style="display:flex; flex-direction:column; gap:16px;">
                                    ${p.visuals.slice(0, 10).map(v => `
                                        <div class="visual-card">
                                            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                                <div style="font-size:10px; text-transform:uppercase; color:var(--text-tertiary); font-weight:700; letter-spacing:0.5px;">${escapeHtml(v.type)}</div>
                                            </div>
                                            <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:12px;">${escapeHtml(v.title || 'Sem Título')}</div>
                                            
                                            ${(v.columnsUsed.length + v.measuresUsed.length) > 0 ? `
                                                <div style="display:flex; flex-wrap:wrap; gap:6px;">
                                                    ${/* RENDER MEASURES */''}
                                                    ${v.measuresUsed.slice(0, 3).map((meas) => {
                                                        return `<span style="font-size:11px; padding:2px 8px; border-radius:4px; background:#FFF0F2; color:var(--brand-red); display:flex; align-items:center;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>${escapeHtml(meas)}</span>`
                                                    }).join('')}
                                                    
                                                    ${/* RENDER COLUMNS */''}
                                                    ${v.columnsUsed.slice(0, 3).map((col) => {
                                                        return `<span style="font-size:11px; padding:2px 8px; border-radius:4px; background:#F3F4F6; color:var(--text-secondary); display:flex; align-items:center;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M9 3H5a2 2 0 0 0-2 2v4h6V3z"></path><path d="M9 21v-6H3v4a2 2 0 0 0 2 2h4z"></path></svg>${escapeHtml(col)}</span>`
                                                    }).join('')}
                                                    
                                                    ${(v.columnsUsed.length + v.measuresUsed.length) > 6 ? `<span style="font-size:11px; color:var(--text-tertiary);">+ ${(v.columnsUsed.length + v.measuresUsed.length) - 6}</span>` : ''}
                                                </div>
                                            ` : '<div style="font-size:12px; color:var(--text-tertiary); italic">Sem dados vinculados</div>'}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

        </div>
    </main>

    <script>
        // Make switchTab available globally
        window.switchTab = function(tabId, element) {
            document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            element.classList.add('active');
            document.querySelector('.main').scrollTop = 0;
        }

        function filterCards(sectionId, text) {
            const container = document.getElementById(sectionId + '-list');
            const items = container.querySelectorAll('.search-item');
            const filter = text.toLowerCase();
            
            items.forEach(item => {
                const searchData = item.getAttribute('data-search');
                if (searchData && searchData.includes(filter)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        function copyToClipboard(btn) {
            const codeBlock = btn.nextElementSibling;
            const text = codeBlock.innerText;
            navigator.clipboard.writeText(text).then(() => {
                const original = btn.innerText;
                btn.innerText = 'Copiado!';
                setTimeout(() => btn.innerText = original, 2000);
            });
        }

        // --- ROBUST LEXER-BASED HIGHLIGHTER ---
        
        function highlightTokens(code, type) {
            if (!code) return '';
            
            try {
                let patterns;
                if (type === 'dax') {
                    // Correctly escaped Regex for double-quoted strings: " ( [^"\] | \. )* "
                    // In TS string for HTML: "(?:[^"\\\\\\\\]|\\\\\\\\.)*"
                    const stringPattern = '("(?:[^"\\\\\\\\]|\\\\\\\\.)*")';
                    const commentPattern = '(\\/\\/.*$|--.*$)';
                    const keywords = 'CALCULATE|SUM|AVERAGE|COUNT|DISTINCTCOUNT|FILTER|ALL|ALLSELECTED|VALUES|RELATED|RELATEDTABLE|IF|SWITCH|TRUE|FALSE|BLANK|VAR|RETURN|MAXX|MINX|SUMX|DIVIDE|DATE|YEAR|MONTH|DAY|SAMEPERIODLASTYEAR|DATEADD|USERELATIONSHIP|KEEPFILTERS|CALCULATETABLE';
                    const keywordPattern = '(\\\\b(?:' + keywords + ')\\\\b)';
                    const wrapperPattern = '(\\'[^\\']+\\'|\\\\[[^\\\\]]+\\\\])'; // Tables '...' or Cols [...]

                    patterns = new RegExp(
                        stringPattern + '|' + commentPattern + '|' + keywordPattern + '|' + wrapperPattern,
                        'gmi'
                    );
                } else { // M
                    const stringPattern = '("(?:[^"\\\\\\\\]|\\\\\\\\.)*")';
                    const commentPattern = '(\\/\\/.*$)';
                    const keywords = 'let|in|each|if|then|else|try|otherwise|type|table|record|list|binary|date|datetime|time|text|number|logical|any|null|true|false|#shared|#table|#date';
                    const keywordPattern = '(\\\\b(?:' + keywords + ')\\\\b)';
                    const stepPattern = '(#"[^"]+")';

                    patterns = new RegExp(
                        stringPattern + '|' + commentPattern + '|' + keywordPattern + '|' + stepPattern,
                        'gmi'
                    );
                }

                let lastIndex = 0;
                let result = "";
                let match;
                
                while ((match = patterns.exec(code)) !== null) {
                    result += escapeHtml(code.substring(lastIndex, match.index));
                    
                    if (match[1]) { // String
                        result += '<span class="str">' + escapeHtml(match[1]) + '</span>';
                    } else if (match[2]) { // Comment
                        result += '<span class="cmt">' + escapeHtml(match[2]) + '</span>';
                    } else if (match[3]) { // Keyword
                        result += '<span class="kwd">' + escapeHtml(match[3]) + '</span>';
                    } else if (match[4]) { // Entities
                        result += '<span class="func">' + escapeHtml(match[4]) + '</span>';
                    }
                    
                    lastIndex = patterns.lastIndex;
                }
                
                result += escapeHtml(code.substring(lastIndex));
                return result;
            } catch (e) {
                console.error("Highlight error", e);
                return escapeHtml(code);
            }
        }
        
        function escapeHtml(text) {
             if (!text) return '';
             return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        function applyHighlighting() {
            try {
                document.querySelectorAll('.language-dax').forEach(block => {
                    const rawCode = block.innerText; 
                    block.innerHTML = highlightTokens(rawCode, 'dax');
                });

                document.querySelectorAll('.language-powerquery').forEach(block => {
                    const rawCode = block.innerText;
                    block.innerHTML = highlightTokens(rawCode, 'm');
                });
            } catch(e) { console.error("Highlighter crashed", e); }
        }

        // Run after load
        setTimeout(applyHighlighting, 100);
    </script>
</body>
</html>`;
  return html;
};