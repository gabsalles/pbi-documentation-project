import React from 'react';
import { PBIModel } from '../types';
import { Layout, BarChart2, Filter, MousePointerClick, Bookmark, EyeOff, ExternalLink, ArrowRightCircle, ArrowLeft, XCircle, CheckCircle, Calculator, Database } from 'lucide-react';

interface ReportViewProps {
  model: PBIModel;
}

const ReportView: React.FC<ReportViewProps> = ({ model }) => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-brand-dark">Estrutura do Relatório</h2>
         <div className="flex items-center gap-2">
             <div className="flex items-center px-3 py-1 bg-white border border-gray-200 rounded-full shadow-sm text-sm">
                 <Bookmark size={14} className="text-purple-500 mr-2"/>
                 <span className="font-bold">{model.bookmarks.length}</span>
                 <span className="ml-1 text-gray-500">Bookmarks</span>
             </div>
         </div>
      </div>
      
      {/* Bookmarks Section */}
      {model.bookmarks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                  <Bookmark size={16} className="mr-2 text-purple-500" /> Bookmarks (Indicadores) Criados
              </h3>
              <div className="flex flex-wrap gap-2">
                  {model.bookmarks.map((b, i) => (
                      <span key={i} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-100">
                          {b.displayName}
                      </span>
                  ))}
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {model.pages.map((page, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print-break-before">
                 <div className="p-4 bg-brand-dark text-white flex items-center justify-between">
                    <div className="flex items-center">
                        <Layout size={20} className="mr-3 text-brand-primary" />
                        <div>
                            <h3 className="font-bold text-lg">{page.displayName}</h3>
                            <p className="text-xs text-gray-400">ID: {page.name}</p>
                        </div>
                    </div>
                    {page.hiddenFilters && page.hiddenFilters.length > 0 && (
                        <div className="flex items-center bg-brand-primary/20 px-3 py-1 rounded text-xs text-brand-primary border border-brand-primary/30">
                            <EyeOff size={12} className="mr-1" />
                            {page.hiddenFilters.length} Filtros de Página Ocultos
                        </div>
                    )}
                 </div>
                 
                 <div className="p-5">
                    {/* Page Level Hidden Filters */}
                    {page.hiddenFilters && page.hiddenFilters.length > 0 && (
                        <div className="mb-6 bg-red-50 p-3 rounded-lg border border-red-100">
                             <h4 className="text-xs font-bold text-red-800 uppercase mb-2 flex items-center">
                                 <Filter size={12} className="mr-1"/> Filtros de Página (Ocultos/Fixos)
                             </h4>
                             <div className="flex flex-wrap gap-2">
                                 {page.hiddenFilters.map((f, i) => (
                                     <span key={i} className="text-xs bg-white text-gray-600 px-2 py-1 rounded border border-red-100 shadow-sm font-mono">
                                         {f}
                                     </span>
                                 ))}
                             </div>
                        </div>
                    )}

                    <h4 className="text-sm font-bold text-brand-primary mb-4 border-b border-gray-100 pb-2">
                        Visuais & Componentes
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {page.visuals.map((visual, vIdx) => {
                            const hasData = visual.columnsUsed.length > 0 || visual.measuresUsed.length > 0;
                            
                            return (
                            <div key={vIdx} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-gray-50 flex flex-col h-full relative overflow-hidden group">
                                {visual.hiddenFilters && visual.hiddenFilters.length > 0 && (
                                     <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-bl-lg flex items-center justify-center z-10" title="Possui filtros ocultos">
                                         <EyeOff size={10} className="text-white" />
                                     </div>
                                )}
                                
                                <div className="flex items-center mb-2">
                                    <div className="p-1.5 bg-white rounded border border-gray-200 mr-2 text-gray-500">
                                        {visual.actions && visual.actions.length > 0 ? <MousePointerClick size={16} /> : <BarChart2 size={16} />}
                                    </div>
                                    <span className="font-bold text-sm text-brand-dark truncate w-full" title={visual.title}>
                                        {visual.title || `Visual (${visual.type})`}
                                    </span>
                                </div>
                                <div className="text-[10px] text-gray-500 mb-3 font-mono bg-gray-100 px-1.5 py-0.5 rounded w-fit uppercase tracking-wider">{visual.type}</div>
                                
                                {/* Fields Display */}
                                {hasData ? (
                                    <div className="space-y-1 flex-1 mb-2">
                                        {/* Measures First */}
                                        {visual.measuresUsed.map((meas, i) => (
                                            <div key={`m-${i}`} className="text-xs text-brand-primary bg-red-50 border border-red-100 px-2 py-1 rounded truncate flex items-center">
                                                <Calculator size={10} className="mr-1.5 flex-shrink-0" />
                                                {meas}
                                            </div>
                                        ))}
                                        {/* Columns */}
                                        {visual.columnsUsed.map((col, i) => (
                                            <div key={`c-${i}`} className="text-xs text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded truncate flex items-center">
                                                 <Database size={10} className="mr-1.5 flex-shrink-0 text-gray-400" />
                                                {col}
                                            </div>
                                        ))}
                                        
                                        {(visual.columnsUsed.length + visual.measuresUsed.length) > 6 && (
                                            <div className="text-xs text-gray-400 italic">
                                                ...e mais campos
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    visual.actions?.length === 0 && (
                                        <div className="text-xs text-gray-400 italic flex-1 flex items-center mb-2">
                                            Sem dados vinculados detectados
                                        </div>
                                    )
                                )}

                                {/* ACTIONS / INTERACTIVITY */}
                                {visual.actions && visual.actions.length > 0 && (
                                    <div className="mt-auto pt-2 border-t border-gray-200">
                                         <h5 className="text-[10px] font-bold text-blue-600 uppercase mb-1">Interação</h5>
                                         {visual.actions.map((act, i) => (
                                             <div key={i} className="flex items-center text-xs bg-blue-50 border border-blue-100 p-2 rounded mb-1 last:mb-0">
                                                 <div className="mr-2 text-blue-600">
                                                     {act.type === 'Bookmark' && <Bookmark size={14} />}
                                                     {act.type === 'PageNavigation' && <ArrowRightCircle size={14} />}
                                                     {act.type === 'URL' && <ExternalLink size={14} />}
                                                     {act.type === 'Back' && <ArrowLeft size={14} />}
                                                     {act.type === 'ClearAllSlicers' && <XCircle size={14} />}
                                                     {act.type === 'ApplyAllSlicers' && <CheckCircle size={14} />}
                                                     {act.type === 'Unknown' && <MousePointerClick size={14} />}
                                                 </div>
                                                 <div className="overflow-hidden">
                                                     <div className="font-bold text-blue-900 leading-tight">
                                                         {act.type === 'ClearAllSlicers' ? 'Limpar Todos Filtros' : 
                                                          act.type === 'ApplyAllSlicers' ? 'Aplicar Todos Filtros' : 
                                                          act.type === 'Back' ? 'Voltar' : act.type}
                                                     </div>
                                                     {act.target && (
                                                         <div className="text-[10px] text-blue-700 truncate" title={act.target}>
                                                             {act.target}
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         ))}
                                    </div>
                                )}
                                
                                {/* Visual Level Filters */}
                                {visual.hiddenFilters && visual.hiddenFilters.length > 0 && (
                                    <div className="mt-auto pt-2 border-t border-gray-200">
                                        <div className="text-[10px] font-bold text-red-400 uppercase mb-1 flex items-center">
                                            <Filter size={10} className="mr-1"/> Filtros Ocultos
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {visual.hiddenFilters.slice(0, 2).map(f => (
                                                <span key={f} className="text-[10px] bg-red-50 text-red-800 px-1 rounded border border-red-100 truncate max-w-full">{f}</span>
                                            ))}
                                            {visual.hiddenFilters.length > 2 && <span className="text-[10px] text-gray-400">...</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
                     {page.visuals.length === 0 && (
                         <p className="text-gray-400 text-sm italic">Nenhum visual configurado detectado nesta página.</p>
                     )}
                 </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default ReportView;