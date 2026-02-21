import React, { useState, useEffect, useRef } from 'react';
import { PBIModel } from '../types';
import mermaid from 'mermaid';
import { Loader2, RefreshCw, ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';

interface RelationshipsViewProps {
  model: PBIModel;
}

const RelationshipsView: React.FC<RelationshipsViewProps> = ({ model }) => {
  const [isRendering, setIsRendering] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);
  
  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    mermaid.initialize({ 
        startOnLoad: false, 
        theme: 'base',
        securityLevel: 'loose',
        er: {
            useMaxWidth: false,
            layoutDirection: 'TB',
            minEntityWidth: 150,
            entityPadding: 20,
            stroke: '#666',
            fill: '#fff',
            fontSize: 14
        },
        themeVariables: {
            primaryColor: '#ffffff',
            primaryTextColor: '#1F1F1F',
            primaryBorderColor: '#0d2060',
            lineColor: '#666666',
            secondaryColor: '#f4f4f4',
            tertiaryColor: '#fff'
        }
    });
    // Debounce render
    const timer = setTimeout(renderDiagram, 100);
    return () => clearTimeout(timer);
  }, [model]);

  // Handle Pan Events
  const handleMouseDown = (e: React.MouseEvent) => {
    setPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!panning) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    setPosition(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setPanning(false);
  };

  // Helper to sanitize strings
  const sanitizeForMermaid = (str: string) => {
      let s = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_]/g, "_");
      if (/^\d/.test(s)) s = "_" + s; // Ensure attribute doesn't start with digit
      return s;
  };

  const renderDiagram = async () => {
    if (!mermaidRef.current) return;
    setIsRendering(true);
    
    // 0. Filter Visible Tables to avoid ghost nodes
    const visibleTableNames = new Set(model.tables.map(t => t.name));

    // 1. Prepare Data
    const relColumns = new Map<string, Set<string>>();
    
    model.tables.forEach(t => {
        relColumns.set(t.name, new Set());
    });

    model.relationships.forEach(rel => {
        // Strict Check: Only process relationships between visible tables
        if (visibleTableNames.has(rel.fromTable) && visibleTableNames.has(rel.toTable)) {
            relColumns.get(rel.fromTable)?.add(rel.fromColumn);
            relColumns.get(rel.toTable)?.add(rel.toColumn);
        }
    });

    // 2. Generate Syntax
    // Use an internal ID map to be 100% safe against spaces/special chars in names
    const tableIdMap = new Map<string, string>();
    model.tables.forEach((t, i) => tableIdMap.set(t.name, `T${i}`));

    let graphDefinition = 'erDiagram\n';

    model.tables.forEach(t => {
        const tid = tableIdMap.get(t.name);
        const label = t.name.replace(/"/g, "'"); // Escape double quotes for label
        const keys = relColumns.get(t.name);
        
        if (keys && keys.size > 0) {
            graphDefinition += `  ${tid}["${label}"] {\n`;
            keys.forEach(col => {
                const safeColName = sanitizeForMermaid(col);
                graphDefinition += `    string ${safeColName} FK\n`;
            });
            graphDefinition += `  }\n`;
        } else {
            graphDefinition += `  ${tid}["${label}"] {\n    string _ \n  }\n`;
        }
    });

    model.relationships.forEach(rel => {
        // Strict Check: Don't draw lines to hidden tables (LocalDateTable etc)
        if (!visibleTableNames.has(rel.fromTable) || !visibleTableNames.has(rel.toTable)) {
            return;
        }

        const fromId = tableIdMap.get(rel.fromTable);
        const toId = tableIdMap.get(rel.toTable);
        
        const left = "||"; 
        const right = rel.cardinality === 'One' ? "||" : "o{";
        const line = rel.isActive === false ? ".." : "--";
        // Relationship flows from One -> Many usually in visual
        const arrow = `${toId} ${left}${line}${right} ${fromId}`;
        let label = rel.crossFilteringBehavior === 'BothDirections' ? "Bi-Dir" : "Filtra >";
        graphDefinition += `  ${arrow} : "${label}"\n`;
    });

    // 3. Render
    try {
        const id = `mermaid-graph-${Date.now()}`;
        const { svg } = await mermaid.render(id, graphDefinition);
        
        if (mermaidRef.current) {
            mermaidRef.current.innerHTML = svg;
            
            // Post-process SVG to fix dimensions for zooming
            const svgElement = mermaidRef.current.querySelector('svg');
            if (svgElement) {
                // Get native dimensions from viewBox
                const viewBox = svgElement.getAttribute('viewBox');
                if (viewBox) {
                    const [,, w, h] = viewBox.split(' ').map(Number);
                    // Explicitly set width/height in pixels to prevent auto-scaling (shrinking)
                    svgElement.setAttribute('width', `${w}px`);
                    svgElement.setAttribute('height', `${h}px`);
                    
                    // Initial Center
                    if (containerRef.current) {
                        const cw = containerRef.current.clientWidth;
                        const ch = containerRef.current.clientHeight;
                        // Center logic
                        setPosition({ x: (cw - w)/2, y: (ch - h)/2 > 0 ? (ch - h)/2 : 50 });
                    }
                }
                svgElement.style.maxWidth = 'none';
                svgElement.style.height = 'auto';
            }
        }
    } catch (error) {
        console.error('Mermaid render error:', error);
        if (mermaidRef.current) {
            mermaidRef.current.innerHTML = `<div class="p-4 text-red-500 text-sm font-mono border border-red-200 bg-blue-50 rounded">Erro de sintaxe no diagrama: ${(error as Error).message}</div>`;
        }
    } finally {
        setIsRendering(false);
    }
  };

  const resetView = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="h-14 border-b border-gray-200 bg-white px-6 flex justify-between items-center shadow-sm z-10 shrink-0">
         <div className="flex items-center space-x-2">
            <h2 className="font-bold text-gray-700 text-lg">Diagrama Entidade-Relacionamento</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">Mermaid.js</span>
         </div>
         <div className="flex items-center space-x-2">
             <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
                <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-1.5 hover:bg-white rounded-md text-gray-600 transition-colors" title="Zoom Out">
                    <ZoomOut size={16} />
                </button>
                <span className="text-xs font-mono w-12 text-center text-gray-500">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 hover:bg-white rounded-md text-gray-600 transition-colors" title="Zoom In">
                    <ZoomIn size={16} />
                </button>
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                <button onClick={resetView} className="p-1.5 hover:bg-white rounded-md text-gray-600 transition-colors" title="Resetar Visualização">
                    <Maximize size={16} />
                </button>
             </div>

            <button 
                onClick={renderDiagram} 
                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md text-gray-600 text-sm transition-colors"
                title="Recarregar Diagrama"
                disabled={isRendering}
            >
                <RefreshCw size={14} className={isRendering ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Atualizar</span>
            </button>
         </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden bg-gray-50 relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isRendering && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20 backdrop-blur-sm pointer-events-none">
                <Loader2 size={40} className="text-brand-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Gerando diagrama otimizado...</p>
            </div>
        )}

        {/* Info Overlay */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none opacity-50">
            <div className="flex items-center text-xs text-gray-500 gap-1 bg-white/50 px-2 py-1 rounded">
                <Move size={12} />
                <span>Arraste para mover • Scroll/Botões para Zoom</span>
            </div>
        </div>

        {/* Transform Layer */}
        <div 
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                transition: panning ? 'none' : 'transform 0.1s ease-out'
            }}
            className="inline-block min-w-full min-h-full origin-top-left"
        >
             <div ref={mermaidRef} className="p-8" />
        </div>
      </div>
    </div>
  );
};

export default RelationshipsView;