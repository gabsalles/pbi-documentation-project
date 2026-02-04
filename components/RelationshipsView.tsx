import React, { useState, useEffect, useRef } from 'react';
import { PBIModel } from '../types';
import { LayoutGrid, ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';

interface RelationshipsViewProps {
  model: PBIModel;
}

interface Node {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isFact: boolean;
  columnCount: number;
}

const CARD_WIDTH = 220;
const CARD_HEADER_HEIGHT = 36;
const ROW_HEIGHT = 24;
const MAX_VISIBLE_ROWS = 6;
const CARD_MAX_HEIGHT = CARD_HEADER_HEIGHT + (MAX_VISIBLE_ROWS * ROW_HEIGHT) + 20;

const RelationshipsView: React.FC<RelationshipsViewProps> = ({ model }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Geometric Layout Algorithm
  useEffect(() => {
    // 1. Identify Fact Tables (Heuristic: 'Many' side of relationships)
    const tableScores = new Map<string, number>();
    model.tables.forEach(t => tableScores.set(t.name, 0));

    model.relationships.forEach(rel => {
        // Being on the 'Many' side suggests Fact (Score -1)
        // Being on the 'One' side suggests Dim (Score +1)
        if (rel.cardinality === 'One') {
             // PBI Convention: Dim (1) -> Fact (*)
             tableScores.set(rel.toTable, (tableScores.get(rel.toTable) || 0) + 1);
             tableScores.set(rel.fromTable, (tableScores.get(rel.fromTable) || 0) - 1);
        } else {
             // Many to Many
             tableScores.set(rel.toTable, (tableScores.get(rel.toTable) || 0) - 0.5);
             tableScores.set(rel.fromTable, (tableScores.get(rel.fromTable) || 0) - 0.5);
        }
    });

    // 2. Sort Tables
    const sortedTables = [...model.tables].sort((a, b) => {
        const scoreA = tableScores.get(a.name) || 0;
        const scoreB = tableScores.get(b.name) || 0;
        return scoreB - scoreA; // Dims (High Score) first, Facts (Low Score) last
    });

    const dimTables = sortedTables.filter(t => (tableScores.get(t.name) || 0) > 0);
    const factTables = sortedTables.filter(t => (tableScores.get(t.name) || 0) <= 0);

    // 3. Grid Positioning
    const newNodes: Node[] = [];
    const SPACING_X = 50;
    const SPACING_Y = 150; // Increased spacing for lines
    
    // Helper to place a row
    const placeRow = (tables: typeof sortedTables, startY: number) => {
        let x = 50;
        let y = startY;
        const ROW_WIDTH_LIMIT = 2000; 
        
        tables.forEach(t => {
             newNodes.push({
                 id: t.name,
                 x: x,
                 y: y,
                 width: CARD_WIDTH,
                 height: Math.min(CARD_MAX_HEIGHT, CARD_HEADER_HEIGHT + t.columns.length * ROW_HEIGHT + 10),
                 isFact: false, 
                 columnCount: t.columns.length
             });
             
             x += CARD_WIDTH + SPACING_X;
             if (x > ROW_WIDTH_LIMIT) {
                 x = 50;
                 y += CARD_MAX_HEIGHT + SPACING_Y;
             }
        });
        return y + CARD_MAX_HEIGHT + SPACING_Y;
    };

    // Place Dims
    let nextY = placeRow(dimTables, 50);
    // Place Facts below Dims
    placeRow(factTables, nextY + 50);

    setNodes(newNodes);
  }, [model]);

  // Canvas Dragging
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (draggedNode) return;
    setIsDraggingCanvas(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (draggedNode) {
       const dx = e.movementX / scale;
       const dy = e.movementY / scale;
       
       setNodes(prev => prev.map(n => {
           if (n.id === draggedNode) {
               let nx = n.x + dx;
               let ny = n.y + dy;
               return { ...n, x: nx, y: ny };
           }
           return n;
       }));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggedNode(null);
    if (draggedNode) {
        setNodes(prev => prev.map(n => {
           if (n.id === draggedNode) {
               const SNAP = 10;
               return { ...n, x: Math.round(n.x/SNAP)*SNAP, y: Math.round(n.y/SNAP)*SNAP };
           }
           return n;
       }));
    }
  };

  // Orthogonal Path Calculation
  const getPath = (source: Node, target: Node) => {
      // Source = Many side (Bottom/Fact), Target = One side (Top/Dim)
      const startX = source.x + source.width / 2;
      const startY = source.y; 
      const endX = target.x + target.width / 2;
      const endY = target.y + target.height; 

      if (startY < endY) {
           const midX = (startX + endX) / 2;
           // Fallback for weird positioning
           return `M ${startX} ${startY} V ${startY - 20} H ${midX} V ${endY + 20} H ${endX} V ${endY}`;
      }

      const midY = (startY + endY) / 2;
      return `M ${startX} ${startY} V ${midY} H ${endX} V ${endY}`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="h-14 border-b border-gray-200 bg-white px-4 flex justify-between items-center shadow-sm z-10">
         <div className="flex items-center space-x-2">
            <LayoutGrid size={18} className="text-brand-primary"/>
            <h2 className="font-bold text-gray-700">Modelo de Dados</h2>
         </div>
         <div className="flex items-center space-x-2">
            <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-2 hover:bg-gray-100 rounded text-gray-600"><ZoomOut size={18}/></button>
            <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 hover:bg-gray-100 rounded text-gray-600"><ZoomIn size={18}/></button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            <button onClick={() => setOffset({x:0, y:0})} className="p-2 hover:bg-gray-100 rounded text-gray-600"><Maximize size={18}/></button>
         </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
            backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            backgroundPosition: `${offset.x}px ${offset.y}px`
        }}
      >
        <div 
            style={{ 
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: '0 0',
                position: 'absolute',
                top: 0, 
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
            }}
        >
            <svg className="overflow-visible absolute top-0 left-0 w-full h-full">
                <defs>
                   {/* Arrow heads for relationship direction */}
                   <marker id="arrow-dir-end" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                       <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
                   </marker>
                   <marker id="arrow-dir-start" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto">
                       <path d="M9,0 L9,6 L0,3 z" fill="#64748b" />
                   </marker>
                </defs>
                {model.relationships.map((rel, i) => {
                    const oneSide = nodes.find(n => n.id === rel.toTable);
                    const manySide = nodes.find(n => n.id === rel.fromTable);
                    
                    if (!oneSide || !manySide) return null;

                    // Calculate path
                    const d = getPath(manySide, oneSide);
                    
                    // Center of the path logic (simplified) to place direction indicator
                    // Since we use orthogonal lines: V -> H -> V
                    // We can approximate the middle of the horizontal segment
                    const startX = manySide.x + manySide.width / 2;
                    const endX = oneSide.x + oneSide.width / 2;
                    const midX = (startX + endX) / 2;
                    const midY = (manySide.y + (oneSide.y + oneSide.height)) / 2;

                    // Markers logic
                    let markerStart = undefined;
                    let markerEnd = undefined;
                    
                    if (rel.crossFilteringBehavior === 'BothDirections') {
                        markerStart = "url(#arrow-dir-start)";
                        markerEnd = "url(#arrow-dir-end)";
                    } else {
                        // Single Direction: Usually One filters Many. 
                        // So Arrow points to Many (Start Node in our drawing logic).
                        markerStart = "url(#arrow-dir-start)";
                    }

                    return (
                        <g key={i}>
                            {/* The Line */}
                            <path 
                                d={d}
                                fill="none"
                                stroke={rel.isActive ? "#64748b" : "#cbd5e1"}
                                strokeWidth={rel.isActive ? 2 : 1.5}
                                strokeDasharray={rel.isActive ? "" : "5,5"}
                            />
                            
                            {/* Direction Arrow in the middle */}
                            {rel.crossFilteringBehavior === 'BothDirections' ? (
                                <path d={`M ${midX-5} ${midY} L ${midX+5} ${midY}`} stroke="#64748b" strokeWidth="2" markerStart="url(#arrow-dir-start)" markerEnd="url(#arrow-dir-end)" />
                            ) : (
                                // Arrow pointing to Many side (Down)
                                <path d={`M ${midX} ${midY-5} L ${midX} ${midY+5}`} stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow-dir-end)" />
                            )}

                            {/* Cardinality Labels */}
                            {/* Label at 'Many' Side (Source/Bottom) */}
                            <rect x={startX - 10} y={manySide.y - 20} width="20" height="14" fill="white" stroke="#e2e8f0" rx="2" />
                            <text x={startX} y={manySide.y - 10} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="#64748b">
                                {rel.cardinality === 'One' ? '1' : '*'}
                            </text>

                            {/* Label at 'One' Side (Target/Top) */}
                            <rect x={endX - 10} y={oneSide.y + oneSide.height + 6} width="20" height="14" fill="white" stroke="#e2e8f0" rx="2" />
                            <text x={endX} y={oneSide.y + oneSide.height + 16} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="#64748b">
                                1
                            </text>
                        </g>
                    );
                })}
            </svg>
            
            {nodes.map(node => {
                const tableData = model.tables.find(t => t.name === node.id);
                if (!tableData) return null;

                return (
                    <div
                        key={node.id}
                        className="absolute bg-white border border-gray-300 shadow-sm rounded flex flex-col pointer-events-auto hover:shadow-lg hover:border-brand-primary transition-shadow"
                        style={{
                            left: node.x,
                            top: node.y,
                            width: node.width,
                            height: node.height,
                        }}
                    >
                        {/* Header */}
                        <div 
                            className={`h-9 px-3 flex items-center justify-between border-b border-gray-200 cursor-move ${node.columnCount > 10 ? 'bg-brand-primary text-white' : 'bg-white text-gray-800'}`}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggedNode(node.id);
                            }}
                        >
                            <span className="font-bold text-sm truncate" title={node.id}>{node.id}</span>
                        </div>

                        {/* Columns */}
                        <div className="flex-1 overflow-hidden p-2 text-xs text-gray-600 bg-white">
                            {tableData.columns.slice(0, MAX_VISIBLE_ROWS).map(col => (
                                <div key={col.name} className="flex items-center py-0.5">
                                    {col.isHidden ? <span className="w-2 h-2 rounded-full bg-gray-200 mr-2"/> : <span className="w-2 h-2 rounded-full bg-brand-primary mr-2 opacity-50"/>}
                                    <span className={`truncate ${col.isHidden ? 'text-gray-400 italic' : ''}`}>{col.name}</span>
                                </div>
                            ))}
                            {tableData.columns.length > MAX_VISIBLE_ROWS && (
                                <div className="text-gray-400 italic mt-1 pt-1 border-t border-gray-100">
                                    + {tableData.columns.length - MAX_VISIBLE_ROWS} mais...
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default RelationshipsView;