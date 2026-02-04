import React, { useState } from 'react';
import { PBIModel } from '../types';
import { Search, Calculator, GitBranch, ArrowRight, Filter, Info, Hash, Tag, FileType, Code, Type, FileText, AlertCircle, Settings } from 'lucide-react';

interface MeasuresViewProps {
  model: PBIModel;
}

const MeasuresView: React.FC<MeasuresViewProps> = ({ model }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused'>('all');
  
  // Flatten measures
  const allMeasures = model.tables.flatMap(t => t.measures);
  const filteredMeasures = allMeasures.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.expression.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = usageFilter === 'all' 
        ? true 
        : usageFilter === 'used' ? m.isUsedInReport : !m.isUsedInReport;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 space-y-6">
       <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-brand-dark">Catálogo de Medidas (DAX)</h2>
        
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
            <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm self-start">
                <button 
                    onClick={() => setUsageFilter('all')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${usageFilter === 'all' ? 'bg-brand-gray text-brand-dark' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Todas
                </button>
                <button 
                    onClick={() => setUsageFilter('used')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${usageFilter === 'used' ? 'bg-green-50 text-green-700 border border-green-200' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Em Uso
                </button>
                <button 
                    onClick={() => setUsageFilter('unused')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${usageFilter === 'unused' ? 'bg-red-50 text-red-700 border border-red-200' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Não Utilizadas
                </button>
            </div>

            <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar medida ou código DAX..." 
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredMeasures.map((measure, idx) => {
            const uniqueId = `${measure.parentTable}-${measure.name}-${idx}`;
            return (
            <div key={uniqueId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print-break-before hover:shadow-md transition-shadow">
                {/* HEADER */}
                <div className="p-4 border-b border-gray-100 bg-white flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                         <div className={`p-2 rounded-lg mt-1 ${measure.isCalculationItem ? 'bg-purple-100 text-purple-600' : 'bg-red-50 text-brand-primary'}`}>
                             {measure.isCalculationItem ? <FileType size={20} /> : <Calculator size={20} />}
                         </div>
                         <div>
                             <h3 className="font-bold text-lg text-brand-dark flex items-center gap-2">
                                 {measure.name}
                                 {measure.isCalculationItem && <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200">Calc Item</span>}
                             </h3>
                             <p className="text-xs text-gray-500 mt-1">Tabela Pai: <span className="font-medium text-gray-700">{measure.parentTable}</span></p>
                         </div>
                    </div>
                    <div>
                        {measure.isUsedInReport ? (
                            <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold border border-green-200 uppercase tracking-wide">
                                Em Uso
                            </span>
                        ) : (
                            <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wide">
                                Não Utilizada
                            </span>
                        )}
                    </div>
                </div>

                {/* DESCRIPTION BANNER */}
                <div className="px-5 pt-4">
                     {measure.description ? (
                         <div className="flex items-start bg-blue-50 border border-blue-100 rounded-lg p-3">
                             <FileText size={16} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                             <div>
                                 <h4 className="text-xs font-bold text-blue-700 uppercase mb-1">Documentação</h4>
                                 <p className="text-sm text-blue-900 leading-relaxed">{measure.description}</p>
                             </div>
                         </div>
                     ) : (
                         <div className="flex items-center text-gray-400 text-xs italic bg-gray-50 p-2 rounded border border-gray-100 border-dashed">
                             <AlertCircle size={14} className="mr-2" />
                             Sem documentação (descrição) disponível no modelo.
                         </div>
                     )}
                </div>

                {/* BODY */}
                <div className="p-5">
                    
                    {/* DAX Code */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                             <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center">
                                 <Code size={14} className="mr-1.5"/> Expressão DAX
                             </h4>
                        </div>
                        <div className="bg-[#1E1E1E] rounded-lg p-4 overflow-x-auto border border-gray-700 shadow-inner">
                            <code className="text-[#D4D4D4] font-mono text-sm whitespace-pre-wrap">
                                {measure.expression}
                            </code>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Column 1: Format & Annotations */}
                        <div className="space-y-4">
                            {/* Format String Card */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <h4 className="text-[10px] font-bold uppercase text-blue-600 mb-2 flex items-center">
                                    <Type size={12} className="mr-1.5"/> Formatação (Format String)
                                </h4>
                                {measure.formatString ? (
                                    <div className="font-mono text-xs bg-blue-50 text-blue-800 p-2 rounded border border-blue-100 break-all">
                                        {measure.formatString}
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-400 italic">Padrão (Geral)</div>
                                )}
                            </div>

                            {/* Annotations List */}
                            {measure.annotations && Object.keys(measure.annotations).length > 0 && (
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2 flex items-center">
                                        <Settings size={12} className="mr-1.5"/> Configurações (Annotations)
                                    </h4>
                                    <div className="space-y-2">
                                        {Object.entries(measure.annotations).map(([k, v]) => (
                                            <div key={k} className="flex flex-col text-xs border-b border-gray-50 last:border-0 pb-1 last:pb-0">
                                                <span className="text-gray-500 font-medium mb-0.5">{k}</span>
                                                <span className="font-mono text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Column 2: Dependencies */}
                        <div>
                            {measure.dependencies.length > 0 ? (
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm h-full">
                                    <h4 className="text-[10px] font-bold uppercase text-orange-600 mb-2 flex items-center">
                                        <GitBranch size={12} className="mr-1.5"/> Dependências
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {measure.dependencies.map(dep => (
                                            <span key={dep} className="flex items-center text-xs bg-orange-50 text-orange-800 px-2 py-1 rounded border border-orange-100">
                                                <ArrowRight size={10} className="mr-1 opacity-50" /> {dep}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm h-full flex items-center justify-center text-xs text-gray-400 italic">
                                    Sem dependências diretas detectadas
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* FOOTER: Technical IDs */}
                {measure.lineageTag && (
                    <div className="bg-gray-100 px-5 py-2 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Hash size={12} className="text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Lineage Tag</span>
                        </div>
                        <code className="text-[10px] font-mono text-gray-500">{measure.lineageTag}</code>
                    </div>
                )}
            </div>
        )})}

        {filteredMeasures.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <Filter size={48} className="mx-auto text-gray-200 mb-4"/>
                <p className="text-gray-500 font-medium">Nenhuma medida encontrada.</p>
                <p className="text-sm text-gray-400">Tente ajustar os filtros ou o termo de busca.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default MeasuresView;