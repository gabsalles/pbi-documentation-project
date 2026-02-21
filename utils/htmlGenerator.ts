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

export const generateStaticHtml = (
  model: PBIModel, 
  customTitle?: string, 
  primaryColor?: string, 
  logoBase64?: string | null,
  customSubtitle?: string,
  authorName?: string,
  executiveSummary?: string,
  classification?: string
): string => {
  const now = new Date().toLocaleDateString('pt-BR');
  // const safeDatasetName = escapeHtml(model.datasetName);

  // Usa o título personalizado se existir, senão usa o nome original do dataset
  const titleToUse = customTitle || model.datasetName;
  const safeDatasetName = escapeHtml(titleToUse);
  
  // Calculate Stats
  const totalTables = model.tables.length;
  const totalMeasures = model.tables.reduce((acc, t) => acc + t.measures.length, 0);
  const totalColumns = model.tables.reduce((acc, t) => acc + t.columns.length, 0);
  const totalPages = model.pages.length;
  const totalRoles = model.roles.length;
  const calcGroups = model.tables.filter(t => t.isCalculationGroup).length;
  const parameters = model.tables.filter(t => t.isParameter).length + model.parameters.length;
  
  // Health Metrics
  const unusedMeasures = model.tables.reduce((acc, t) => acc + t.measures.filter(m => !m.isUsedInReport).length, 0);
  const usedMeasures = totalMeasures - unusedMeasures;
  const healthScore = totalMeasures > 0 ? Math.round((usedMeasures / totalMeasures) * 100) : 100;

  // Mermaid Diagram Data Preparation
  const tableIdMap = new Map<string, string>();
  model.tables.forEach((t, index) => {
      tableIdMap.set(t.name, `T${index}`);
  });

  const visibleTableNames = new Set(model.tables.map(t => t.name));
  const relColumns = new Map<string, Set<string>>();
  model.tables.forEach(t => relColumns.set(t.name, new Set()));
  
  model.relationships.forEach(rel => {
      if (visibleTableNames.has(rel.fromTable) && visibleTableNames.has(rel.toTable)) {
          relColumns.get(rel.fromTable)?.add(rel.fromColumn);
          relColumns.get(rel.toTable)?.add(rel.toColumn);
      }
  });

  const sanitizeAttr = (str: string) => {
      let s = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_]/g, "_");
      if (/^\d/.test(s)) s = "_" + s; 
      return s;
  };

  // Build Mermaid Definition strictly formatted
  let mermaidDef = 'erDiagram';
  
  model.tables.forEach(t => {
      const tid = tableIdMap.get(t.name);
      // Escape label properly for Mermaid string "..."
      const label = t.name.replace(/"/g, "'"); 
      
      const keys = relColumns.get(t.name);
      
      if (keys && keys.size > 0) {
          mermaidDef += `\n    ${tid}["${label}"] {`;
          keys.forEach(col => {
              mermaidDef += `\n        string ${sanitizeAttr(col)} FK`;
          });
          mermaidDef += `\n    }`;
      } else {
          mermaidDef += `\n    ${tid}["${label}"] {\n        string _\n    }`;
      }
  });

  model.relationships.forEach(rel => {
      if (visibleTableNames.has(rel.fromTable) && visibleTableNames.has(rel.toTable)) {
        const fromId = tableIdMap.get(rel.fromTable);
        const toId = tableIdMap.get(rel.toTable);
        
        const right = rel.cardinality === 'One' ? "||" : "o{"; 
        const line = rel.isActive === false ? ".." : "--";
        const label = rel.crossFilteringBehavior === 'BothDirections' ? "Bi-Dir" : "Filtra >";
        
        mermaidDef += `\n    ${toId} ||${line}${right} ${fromId} : "${label}"`;
      }
  });

  const style = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

    :root {
        --brand-red: ${primaryColor || '#1a6aff'}; /* Cor personalizada ou azul base */
        --brand-red-hover: #00e8ff;  /* Ciano néon (Destaque/Glow) */
        --brand-dark: #1F1F1F;
        --brand-gray-bg: #F3F4F6;
        --brand-surface: #FFFFFF;
        
        --font-main: 'Inter', system-ui, sans-serif;
        --font-code: 'JetBrains Mono', monospace;
        
        --text-primary: #111827;
        --text-secondary: #4B5563;
        --text-tertiary: #9CA3AF;
        
        --code-bg: #1e1e1e;
        --code-text: #e4e4e7;
        
        --radius-lg: 12px;
        --radius-md: 8px;
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }

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

    /* Sidebar */
    .sidebar {
        width: 260px;
        background-color: var(--brand-surface);
        display: flex;
        flex-direction: column;
        border-right: 1px solid #E5E7EB;
        z-index: 50;
    }

    .brand-header {
        height: 64px;
        display: flex;
        align-items: center;
        padding: 0 24px;
        background-color: var(--brand-red);
        background-image: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.15) 100%);
        color: white;
    }

    .logo-text { font-size: 18px; font-weight: 800; letter-spacing: -0.025em; }
    .logo-text span { font-weight: 300; opacity: 0.9; }

    .nav-links { padding: 20px 12px; flex: 1; overflow-y: auto; }

    .nav-item {
        display: flex;
        align-items: center;
        padding: 10px 16px;
        margin-bottom: 4px;
        border-radius: var(--radius-md);
        color: var(--text-secondary);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
    }

    .nav-item:hover { background-color: #F9FAFB; color: var(--brand-dark); }
    .nav-item.active { 
        background-color: var(--brand-red); 
        background-image: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.15) 100%);
        color: white; 
        font-weight: 600; 
        border: none;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .nav-icon { margin-right: 12px; display: flex; }

    /* Main Area */
    .main { flex: 1; overflow-y: auto; padding: 0; position: relative; scroll-behavior: smooth; }
    .container { max-width: 1280px; margin: 0 auto; padding: 40px; }

    header { margin-bottom: 40px; }
    .header-badge {
        display: inline-flex;
        align-items: center;
        background: white;
        padding: 6px 16px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 16px;
        box-shadow: var(--shadow-sm);
        border: 1px solid #E5E7EB;
    }

    h1 { font-size: 36px; font-weight: 800; margin: 0; color: var(--brand-dark); letter-spacing: -0.03em; line-height: 1.1; }
    .subtitle { color: var(--text-secondary); font-size: 18px; margin-top: 8px; font-weight: 400; }

    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 40px; }
    
    .widget {
        background: white;
        padding: 24px;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        border: 1px solid #E5E7EB;
        position: relative;
        overflow: hidden;
        transition: transform 0.2s;
    }
    .widget:hover { transform: translateY(-2px); box-shadow: var(--shadow-card); }
    
    .widget::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
    .widget.red::before { background: var(--brand-red); }
    .widget.purple::before { background: #8B5CF6; }
    .widget.green::before { background: #10B981; }
    .widget.blue::before { background: #3B82F6; }

    .widget-val { font-size: 36px; font-weight: 800; color: var(--text-primary); margin-top: 4px; letter-spacing: -0.02em; }
    .widget-lbl { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }

    /* Cards */
    .card {
        background: white;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        margin-bottom: 32px;
        border: 1px solid #E5E7EB;
        overflow: hidden;
    }

    .card-header {
        padding: 20px 24px;
        border-bottom: 1px solid #F3F4F6;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #FFFFFF;
    }

    .card-title { font-size: 18px; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
    .card-subtitle { font-size: 13px; color: var(--text-tertiary); font-weight: 400; margin-top: 2px; }

    /* Badges */
    .badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
    .badge-primary { background: #FFF1F2; color: var(--brand-red); border: 1px solid #FECDD3; }
    .badge-gray { background: #F3F4F6; color: #4B5563; border: 1px solid #E5E7EB; }
    .badge-green { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
    .badge-purple { background: #F5F3FF; color: #7C3AED; border: 1px solid #DDD6FE; }
    .badge-blue { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
    .badge-orange { background: #FFF7ED; color: #C2410C; border: 1px solid #FED7AA; }

    /* Tables */
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { text-align: left; padding: 12px 24px; background: #F9FAFB; color: var(--text-secondary); font-weight: 600; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #E5E7EB; }
    .data-table td { padding: 12px 24px; border-bottom: 1px solid #F3F4F6; vertical-align: top; color: var(--text-secondary); }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: #FAFAFA; }
    .col-name { font-weight: 600; color: var(--text-primary); font-family: var(--font-code); font-size: 12px; }
    .col-meta { font-size: 11px; color: #6B7280; margin-top: 2px; line-height: 1.4; }

    /* Code Block */
    .code-container { position: relative; margin: 0 24px 24px; }
    .code-block {
        background: var(--code-bg);
        color: var(--code-text);
        padding: 20px;
        font-family: var(--font-code);
        font-size: 13px;
        line-height: 1.6;
        overflow-x: auto;
        border-radius: 8px;
        border: 1px solid #333;
        white-space: pre-wrap;
    }
    .copy-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: #fff;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .copy-btn:hover { background: rgba(255,255,255,0.2); }

    /* Search Input */
    .search-wrapper { position: relative; margin-bottom: 32px; }
    .search-input {
        width: 100%;
        padding: 16px 20px;
        padding-left: 48px;
        border-radius: 12px;
        border: 1px solid #E5E7EB;
        font-size: 15px;
        box-shadow: var(--shadow-sm);
        transition: all 0.2s;
    }
    .search-input:focus { border-color: var(--brand-red); outline: none; box-shadow: 0 0 0 3px rgba(204, 9, 47, 0.1); }
    .search-icon { position: absolute; left: 16px; top: 16px; color: #9CA3AF; }

    /* Mermaid */
    .mermaid-container {
        padding: 0;
        background: white;
        height: 600px;
        overflow: hidden;
        border-bottom: 1px solid #E5E7EB;
        position: relative;
    }
    .mermaid {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .mermaid svg {
        max-width: none !important; /* Force reset for pan zoom */
    }
    .mermaid-controls {
        position: absolute;
        bottom: 16px;
        right: 16px;
        display: flex;
        gap: 8px;
        background: white;
        padding: 4px;
        border-radius: 8px;
        border: 1px solid #E5E7EB;
        box-shadow: var(--shadow-sm);
        z-index: 10;
    }
    .mermaid-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #F9FAFB;
        border: 1px solid #E5E7EB;
        border-radius: 6px;
        cursor: pointer;
        color: var(--text-secondary);
    }
    .mermaid-btn:hover { background: #F3F4F6; color: var(--brand-dark); }

    /* Screenshot */
    .screenshot-container {
        border-bottom: 1px solid #F3F4F6;
        background: #F9FAFB;
        display: flex;
        justify-content: center;
        padding: 0;
        overflow: hidden;
    }
    .screenshot-img {
        max-width: 100%;
        max-height: 500px;
        object-fit: contain;
        display: block;
        margin: 0 auto;
    }

    /* Utilities */
    .section { display: none; animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .section.active { display: block; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @media print {
        body { height: auto; overflow: visible; display: block; background: white; }
        .sidebar, .search-wrapper, .mermaid-controls, .copy-btn { display: none !important; }
        .main { padding: 0; width: 100%; }
        .container { padding: 0; max-width: none; }
        .section { display: block !important; margin-bottom: 40px; page-break-inside: avoid; }
        .card { box-shadow: none; border: 1px solid #ccc; break-inside: avoid; }
        .code-block { border: 1px solid #ccc; background: #fff; color: #000; }
        .header-badge { display: none; }
        h1 { font-size: 24px; margin-bottom: 20px; }
    }
  `;

  // Icons SVG
  const Icons = {
    overview: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    table: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 0 0-2 2v4h6V3zm0 18v-6H3v4a2 2 0 0 0 2 2h4zm2-18v6h10V5a2 2 0 0 0-2-2h-8zm0 18h8a2 2 0 0 0 2-2v-4H11v6zm0-8h10v-6H11v6zm-8 0h6v-6H3v6z"></path></svg>`,
    measure: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>`, 
    rel: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><line x1="6" y1="9" x2="6" y2="21"></line></svg>`,
    report: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    security: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke="green"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke="#E5E7EB"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    bookmark: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`,
    search: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    minus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    refresh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`
  };

  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Docs - ${safeDatasetName}</title>
    <style>${style}</style>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js"></script>
</head>
<body>

    <!-- SIDEBAR -->
    <nav class="sidebar">
        <div class="brand-header" style="justify-content: center;">
            ${logoBase64 
                ? `<img src="${logoBase64}" alt="Logo da Empresa" style="max-height: 40px; max-width: 200px; object-fit: contain;" />` 
                : `<div class="logo-text">DAXILIZER <span>BI DOCS</span></div>`
            }
        </div>
        <div class="nav-links">
            <a class="nav-item active" onclick="switchTab('overview', this)">
                <div class="nav-icon">${Icons.overview}</div> Visão Geral
            </a>
            <a class="nav-item" onclick="switchTab('tables', this)">
                <div class="nav-icon">${Icons.table}</div> Tabelas
            </a>
            <a class="nav-item" onclick="switchTab('measures', this)">
                <div class="nav-icon">${Icons.measure}</div> Medidas DAX
            </a>
            <a class="nav-item" onclick="switchTab('relationships', this)">
                <div class="nav-icon">${Icons.rel}</div> Relacionamentos
            </a>
            <a class="nav-item" onclick="switchTab('security', this)">
                <div class="nav-icon">${Icons.security}</div> Segurança (RLS)
            </a>
            <a class="nav-item" onclick="switchTab('report', this)">
                <div class="nav-icon">${Icons.report}</div> Relatório
            </a>
        </div>
    </nav>

    <!-- MAIN CONTENT -->
    <main class="main">
        <div class="container">
            <header style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <div class="header-badge">
                        Gerado em: ${now} 
                        ${authorName ? `<span style="margin: 0 8px; color: #D1D5DB;">|</span> Responsável: <b style="color: var(--brand-dark); margin-left: 4px;">${escapeHtml(authorName)}</b>` : ''}
                    </div>
                    <h1>${safeDatasetName}</h1>
                    <div class="subtitle">${customSubtitle ? escapeHtml(customSubtitle) : 'Documentação Técnica de Modelo Semântico'}</div>
                </div>
                
                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 12px;">
                    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo da Empresa" style="max-height: 60px; max-width: 200px; object-fit: contain;" />` : ''}
                    
                    ${classification ? (() => {
                        let classColor = '#2563EB', classBg = '#EFF6FF', classBorder = '#BFDBFE'; // Azul (Uso Interno)
                        if (classification === 'Público') { classColor = '#059669'; classBg = '#ECFDF5'; classBorder = '#A7F3D0'; } // Verde
                        else if (classification === 'Confidencial') { classColor = '#D97706'; classBg = '#FFFBEB'; classBorder = '#FDE68A'; } // Laranja
                        else if (classification === 'Restrito') { classColor = '#DC2626'; classBg = '#FEF2F2'; classBorder = '#FECACA'; } // Vermelho
                        
                        return `<div style="display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: ${classColor}; background: ${classBg}; border: 1px solid ${classBorder}; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            ${escapeHtml(classification)}
                        </div>`;
                    })() : ''}
                </div>
            </header>

            <!-- 1. OVERVIEW -->
            <div id="overview" class="section active">
                ${executiveSummary ? `
                    <div class="card" style="margin-bottom: 24px; border-left: 4px solid var(--brand-red);">
                        <div class="card-header"><h3 class="card-title">Resumo Executivo</h3></div>
                        <div style="padding: 20px 24px; color: var(--text-secondary); line-height: 1.6; white-space: pre-wrap; font-size: 14px;">${escapeHtml(executiveSummary)}</div>
                    </div>
                    ` : ''}
                <div class="stats-grid">
                    <div class="widget red">
                        <div class="widget-lbl">Tabelas</div>
                        <div class="widget-val">${totalTables}</div>
                    </div>
                    <div class="widget purple">
                        <div class="widget-lbl">Medidas</div>
                        <div class="widget-val">${totalMeasures}</div>
                    </div>
                    <div class="widget blue">
                        <div class="widget-lbl">Páginas</div>
                        <div class="widget-val">${totalPages}</div>
                    </div>
                    <div class="widget green">
                        <div class="widget-lbl">Roles (RLS)</div>
                        <div class="widget-val">${totalRoles}</div>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="widget">
                         <div class="widget-lbl">Saúde do Modelo</div>
                         <div class="widget-val" style="font-size: 24px; color: ${healthScore > 80 ? '#10B981' : healthScore > 50 ? '#F59E0B' : '#EF4444'}">${healthScore}% <span style="font-size:12px; color:#999; font-weight:400;">Uso de Medidas</span></div>
                         <div style="font-size:12px; margin-top:8px; color:#6B7280;">
                            ${usedMeasures} em uso • ${unusedMeasures} obsoletas
                         </div>
                    </div>
                     <div class="widget">
                         <div class="widget-lbl">Calculation Groups</div>
                         <div class="widget-val" style="font-size: 24px;">${calcGroups}</div>
                    </div>
                     <div class="widget">
                         <div class="widget-lbl">Parâmetros de Campo</div>
                         <div class="widget-val" style="font-size: 24px;">${parameters}</div>
                    </div>
                     <div class="widget">
                         <div class="widget-lbl">Colunas Físicas</div>
                         <div class="widget-val" style="font-size: 24px;">${totalColumns}</div>
                    </div>
                </div>
            </div>

            <!-- 2. TABLES -->
            <div id="tables" class="section">
                <div class="search-wrapper">
                    <div class="search-icon">${Icons.search}</div>
                    <input type="text" class="search-input" placeholder="Filtrar tabelas..." onkeyup="filterCards(this, 'table-card')">
                </div>

                ${model.tables.map(t => {
                    let badgeClass = 'badge-gray';
                    let typeLabel: string = t.type;
                    if (t.isCalculationGroup) { badgeClass = 'badge-purple'; typeLabel = 'Calculation Group'; }
                    else if (t.isParameter) { badgeClass = 'badge-blue'; typeLabel = 'Field Parameter'; }
                    else if (t.type === 'Calculated') { badgeClass = 'badge-orange'; }
                    else if (t.isUDF) { badgeClass = 'badge-orange'; typeLabel = 'Power Query Function'; }

                    const showCollapse = t.columns.length > 10;
                    const collapseId = `tbl-${Math.random().toString(36).substr(2, 9)}`;

                    return `
                    <div class="card table-card" data-search="${escapeHtml(t.name.toLowerCase())}">
                        <div class="card-header">
                            <div>
                                <h3 class="card-title">${escapeHtml(t.name)} <span class="badge ${badgeClass}">${typeLabel}</span></h3>
                                <div class="card-subtitle">${t.columns.length} Colunas • ${t.measures.length} Medidas</div>
                            </div>
                            <div>${t.columns.some(c => c.isUsedInReport) ? '<span class="badge badge-green">Em Uso</span>' : '<span class="badge badge-gray">Não Usada</span>'}</div>
                        </div>
                        ${t.description ? `<div style="padding:16px 24px; background:#FEF3C7; color:#92400E; font-size:13px; border-bottom:1px solid #FDE68A;">${escapeHtml(t.description)}</div>` : ''}
                        
                        ${t.sourceExpression ? `
                        <div class="code-container" style="margin-top:24px;">
                            <div style="font-size:11px; font-weight:700; color:#6B7280; margin-bottom:8px; text-transform:uppercase;">Fonte (Power Query)</div>
                            <div class="code-block" id="code-${collapseId}">${escapeHtml(t.sourceExpression)}</div>
                            <button class="copy-btn" onclick="copyToClipboard('code-${collapseId}')">${Icons.copy} Copiar</button>
                        </div>` : ''}

                        <div style="overflow-x:auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Tipo</th>
                                        <th style="text-align:center;">Oculta</th>
                                        <th style="text-align:center;">Em Uso</th>
                                    </tr>
                                </thead>
                                <tbody id="${collapseId}" class="${showCollapse ? 'collapsed-body' : ''}" style="${showCollapse ? 'display:none;' : ''}">
                                    ${t.columns.map(c => `
                                    <tr>
                                        <td>
                                            <div class="col-name">${escapeHtml(c.name)}</div>
                                            ${c.description ? `<div class="col-meta">${escapeHtml(c.description)}</div>` : ''}
                                        </td>
                                        <td><span style="font-family:monospace; color:#6B7280;">${escapeHtml(c.dataType)}</span></td>
                                        <td style="text-align:center;">${c.isHidden ? Icons.check : ''}</td>
                                        <td style="text-align:center;">${c.isUsedInReport ? Icons.check : Icons.x}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${showCollapse ? `
                            <div style="text-align:center; padding:12px; background:#FAFAFA; border-top:1px solid #eee;">
                                <button onclick="toggleTable('${collapseId}', this)" style="background:none; border:none; color:#2563EB; font-weight:600; cursor:pointer; font-size:12px;">Mostrar ${t.columns.length} Colunas</button>
                            </div>` : ''}
                        </div>
                    </div>
                `}).join('')}
            </div>

            <!-- 3. MEASURES -->
            <div id="measures" class="section">
                <div class="search-wrapper">
                    <div class="search-icon">${Icons.search}</div>
                    <input type="text" class="search-input" placeholder="Buscar medida ou código DAX..." onkeyup="filterCards(this, 'measure-card')">
                </div>

                ${model.tables.flatMap(t => t.measures).map((m, idx) => {
                    const uniqueId = `measure-${idx}`;
                    return `
                    <div class="card measure-card" data-search="${escapeHtml(m.name.toLowerCase() + ' ' + m.expression.toLowerCase())}">
                        <div class="card-header">
                            <div>
                                <h3 class="card-title">${escapeHtml(m.name)} 
                                    ${m.isCalculationItem ? '<span class="badge badge-purple">Calc Item</span>' : ''}
                                </h3>
                                <div class="card-subtitle">Tabela Pai: <b>${escapeHtml(m.parentTable)}</b></div>
                            </div>
                            <div>${m.isUsedInReport ? '<span class="badge badge-green">Em Uso</span>' : '<span class="badge badge-gray">Não Usada</span>'}</div>
                        </div>
                        ${m.description ? `<div style="padding:16px 24px; background:#EFF6FF; color:#1E40AF; font-size:13px; border-bottom:1px solid #DBEAFE;">${escapeHtml(m.description)}</div>` : ''}
                        
                        <div class="code-container" style="margin-top:20px;">
                            <div class="code-block" id="${uniqueId}">${escapeHtml(m.expression)}</div>
                            <button class="copy-btn" onclick="copyToClipboard('${uniqueId}')">${Icons.copy} Copiar DAX</button>
                        </div>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; padding:0 24px 20px;">
                            <div>
                                <small style="display:block; font-weight:bold; color:#6B7280; margin-bottom:4px; font-size:10px; text-transform:uppercase;">FORMAT STRING</small>
                                <div style="font-family:var(--font-code); background:#F3F4F6; padding:8px; border-radius:4px; font-size:12px; color:#374151;">${m.formatString || 'General'}</div>
                            </div>
                            <div>
                                <small style="display:block; font-weight:bold; color:#6B7280; margin-bottom:4px; font-size:10px; text-transform:uppercase;">DEPENDÊNCIAS</small>
                                <div style="display:flex; flex-wrap:wrap; gap:4px;">
                                    ${m.dependencies.length ? m.dependencies.map(d => `<span class="badge badge-gray" style="font-size:10px;">${escapeHtml(d)}</span>`).join('') : '<span style="color:#9CA3AF; font-style:italic; font-size:12px;">Nenhuma</span>'}
                                </div>
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>

            <!-- 4. RELATIONSHIPS -->
            <div id="relationships" class="section">
                <div class="card" style="overflow:hidden;">
                    <div class="card-header"><h3 class="card-title">Diagrama Entidade-Relacionamento</h3></div>
                    <div class="mermaid-container">
                        <div class="mermaid">${mermaidDef}</div>
                        <div class="mermaid-controls">
                            <button class="mermaid-btn" onclick="if(panZoomInstance) panZoomInstance.zoomIn()">${Icons.plus}</button>
                            <button class="mermaid-btn" onclick="if(panZoomInstance) panZoomInstance.zoomOut()">${Icons.minus}</button>
                            <button class="mermaid-btn" onclick="if(panZoomInstance) panZoomInstance.resetZoom()">${Icons.refresh}</button>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                     <div class="card-header"><h3 class="card-title">Lista de Relacionamentos</h3></div>
                     <div style="overflow-x:auto;">
                        <table class="data-table">
                            <thead><tr><th>De (Tabela.Coluna)</th><th>Para (Tabela.Coluna)</th><th>Cardinalidade / Tipo</th><th>Filtro</th></tr></thead>
                            <tbody>
                                ${model.relationships.map(r => {
                                    const isOneToOne = r.cardinality === 'One';
                                    const cardText = isOneToOne ? '1 : 1 (One to One)' : '* : 1 (Many to One)';
                                    const dirIcon = r.crossFilteringBehavior === 'BothDirections' ? '<->' : '-->';
                                    
                                    return `
                                    <tr>
                                        <td><b>${escapeHtml(r.fromTable)}</b><br><span style="color:#6B7280; font-size:11px;">${escapeHtml(r.fromColumn)}</span></td>
                                        <td><b>${escapeHtml(r.toTable)}</b><br><span style="color:#6B7280; font-size:11px;">${escapeHtml(r.toColumn)}</span></td>
                                        <td>
                                            <div style="display:flex; flex-direction:column; gap:4px;">
                                                <span class="badge badge-blue" style="text-align:center;">${cardText}</span>
                                                <span style="font-size:10px; color:#6B7280; text-align:center;">${dirIcon}</span>
                                            </div>
                                        </td>
                                        <td>${r.crossFilteringBehavior}</td>
                                    </tr>
                                    `
                                }).join('')}
                            </tbody>
                        </table>
                     </div>
                </div>
            </div>

            <!-- 5. SECURITY -->
            <div id="security" class="section">
                ${model.roles.length === 0 ? 
                `<div style="text-align:center; padding:60px 20px; color:#9CA3AF; background:white; border-radius:12px; border:1px dashed #E5E7EB;">
                    <div style="margin-bottom:10px; opacity:0.5;">${Icons.security}</div>
                    Nenhuma regra de segurança (RLS) configurada.
                 </div>` : 
                model.roles.map((r, idx) => `
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">${escapeHtml(r.name)}</h3>
                            <span class="badge badge-primary">Permissão: ${r.modelPermission || 'Read'}</span>
                        </div>
                        <div style="padding:0;">
                             ${r.tablePermissions.map((p, pIdx) => `
                                <div style="padding:20px 24px; border-bottom:1px solid #f3f4f6; display:flex; gap:20px;">
                                    <div style="width:200px; padding-top:10px;">
                                        <div style="font-weight:700; color:#374151;">${escapeHtml(p.table)}</div>
                                        <div style="font-size:11px; color:#9CA3AF; text-transform:uppercase; margin-top:4px;">Tabela</div>
                                    </div>
                                    <div style="flex:1; position:relative;">
                                        <div class="code-block" style="margin:0; background:#111827; color:#10B981; border:none;" id="rls-${idx}-${pIdx}">${escapeHtml(p.expression)}</div>
                                    </div>
                                </div>
                             `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- 6. REPORT -->
            <div id="report" class="section">
                 ${model.bookmarks.length > 0 ? `
                 <div class="card">
                    <div class="card-header"><h3 class="card-title">Bookmarks (Indicadores)</h3></div>
                    <div style="padding:20px 24px; display:flex; flex-wrap:wrap; gap:8px;">
                        ${model.bookmarks.map(b => `
                            <div style="padding:8px 12px; background:#F5F3FF; color:#7C3AED; border:1px solid #DDD6FE; border-radius:8px; font-size:12px; font-weight:600; display:flex; align-items:center; gap:8px;">
                                ${Icons.bookmark} ${escapeHtml(b.displayName)}
                            </div>
                        `).join('')}
                    </div>
                 </div>` : ''}

                 ${model.pages.map(p => `
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <h3 class="card-title">${escapeHtml(p.displayName)}</h3>
                                <div class="card-subtitle">ID: ${p.name}</div>
                            </div>
                            ${p.hiddenFilters && p.hiddenFilters.length ? `<span class="badge badge-primary">${p.hiddenFilters.length} Filtros Ocultos</span>` : ''}
                        </div>
                        
                        ${p.screenshot ? `
                        <div class="screenshot-container">
                            <img src="${p.screenshot}" alt="Screenshot - ${escapeHtml(p.displayName)}" class="screenshot-img" />
                        </div>
                        ` : ''}
                        
                        <div style="padding:24px; display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:20px;">
                            ${p.visuals.map(v => `
                                <div style="border:1px solid #E5E7EB; border-radius:10px; padding:16px; background:#FAFAFA; display:flex; flex-direction:column; position:relative; overflow:hidden;">
                                    ${v.hiddenFilters && v.hiddenFilters.length ? `<div style="position:absolute; top:0; right:0; background:#EF4444; width:16px; height:16px; border-bottom-left-radius:8px; display:flex; align-items:center; justify-content:center;" title="Filtros Ocultos"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>` : ''}
                                    
                                    <div style="font-weight:700; font-size:14px; margin-bottom:4px; color:#1F2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(v.title || '')}">${v.title || 'Visual (' + v.type + ')'}</div>
                                    <div style="font-size:10px; color:#6B7280; text-transform:uppercase; margin-bottom:12px; background:#E5E7EB; display:inline-block; padding:2px 8px; border-radius:4px; align-self:flex-start;">${v.type}</div>
                                    
                                    <div style="flex:1; margin-bottom:12px;">
                                        ${v.measuresUsed.map(m => `<div style="font-size:11px; color:#991B1B; background:#FEF2F2; border:1px solid #FECACA; padding:2px 6px; border-radius:4px; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${Icons.measure} ${escapeHtml(m)}</div>`).join('')}
                                        ${v.columnsUsed.map(c => `<div style="font-size:11px; color:#374151; background:white; border:1px solid #E5E7EB; padding:2px 6px; border-radius:4px; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${Icons.table} ${escapeHtml(c)}</div>`).join('')}
                                        ${(v.measuresUsed.length + v.columnsUsed.length) === 0 && !v.actions?.length ? '<div style="font-size:11px; color:#9CA3AF; font-style:italic;">Sem dados vinculados</div>' : ''}
                                    </div>
                                    
                                    ${v.actions && v.actions.length ? `
                                    <div style="border-top:1px solid #E5E7EB; padding-top:8px; margin-top:auto;">
                                        ${v.actions.map(a => `<div style="font-size:10px; color:#2563EB; font-weight:600;">Action: ${a.type}</div>`).join('')}
                                    </div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                 `).join('')}
            </div>

        </div>
    </main>

    <script>
        var panZoomInstance;
        var mermaidRendered = false;

        mermaid.initialize({ 
            startOnLoad: false,
            theme: 'base',
            securityLevel: 'loose',
            themeVariables: {
                primaryColor: '#ffffff',
                primaryTextColor: '#1F1F1F',
                primaryBorderColor: '#00e8ff',
                lineColor: '#666666'
            }
        });

        // Initialize Mermaid explicitly on tab switch
        function renderMermaid() {
            if (mermaidRendered) return;
            var element = document.querySelector('.mermaid');
            
            // Safety check for content
            if (element && element.textContent.trim() !== '') {
                mermaid.run({
                    nodes: [element]
                }).then(() => {
                    mermaidRendered = true;
                    // Initialize PanZoom AFTER render
                     var svg = element.querySelector('svg');
                     if (svg) {
                        svg.style.maxWidth = 'none';
                        svg.style.height = '100%';
                        svg.style.width = '100%';
                        svg.setAttribute('height', '100%'); 
                        svg.setAttribute('width', '100%');

                        if (typeof svgPanZoom !== 'undefined') {
                            try {
                                panZoomInstance = svgPanZoom(svg, {
                                    zoomEnabled: true,
                                    controlIconsEnabled: false,
                                    fit: true,
                                    center: true,
                                    minZoom: 0.1,
                                    maxZoom: 10
                                });
                            } catch(e) { console.error('PanZoom Init Error', e); }
                        }
                     }
                }).catch(err => {
                    console.error("Mermaid Render Error", err);
                    element.innerHTML = '<div style="color:red; border:1px solid red; padding:10px;">Erro de renderização: ' + err.message + '</div>';
                });
            }
        }

        function switchTab(tabId, element) {
            document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            
            document.getElementById(tabId).classList.add('active');
            element.classList.add('active');
            
            // Render Mermaid ONLY when tab is shown to fix 0x0 size bug in hidden tabs
            if (tabId === 'relationships') {
                setTimeout(renderMermaid, 50);
                
                if (panZoomInstance) {
                    setTimeout(function(){
                        panZoomInstance.resize();
                        panZoomInstance.fit();
                        panZoomInstance.center();
                    }, 100);
                }
            }
        }

        function filterCards(input, className) {
            const filter = input.value.toLowerCase();
            const cards = document.getElementsByClassName(className);
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                const text = card.getAttribute('data-search') || card.textContent;
                card.style.display = text.toLowerCase().includes(filter) ? "" : "none";
            }
        }

        function copyToClipboard(elementId) {
            const text = document.getElementById(elementId).innerText;
            navigator.clipboard.writeText(text).then(() => {
                alert('Código copiado para a área de transferência!');
            });
        }

        function toggleTable(id, btn) {
            const tbody = document.getElementById(id);
            if (tbody.style.display === 'none') {
                tbody.style.display = 'table-row-group';
                btn.innerText = 'Ocultar Colunas';
            } else {
                tbody.style.display = 'none';
                btn.innerText = 'Mostrar Colunas';
            }
        }
    </script>
</body>
</html>`;

  return html;
};