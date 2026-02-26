import React, { useState } from 'react';
import ImpactAnalyzer from './ImpactAnalyzer';
import { PBIModel, PBIMeasure } from '../types';
import { 
  Search, Calculator, GitBranch, ArrowRight, Filter, Hash, 
  Type, Code, Settings, FileType, Save, X, FileText // <-- ADICIONE O FILETEXT AQUI!
} from 'lucide-react';
interface MeasuresViewProps {
  model: PBIModel;
}

const MeasuresView: React.FC<MeasuresViewProps> = ({ model }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempDescription, setTempDescription] = useState('');

  // Flatten measures
  const allMeasures = model.tables.flatMap(t => t.measures);
  
  const filteredMeasures = allMeasures.filter(m => {
    const matchesSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.expression || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = usageFilter === 'all' 
        ? true 
        : usageFilter === 'used' ? m.isUsedInReport : !m.isUsedInReport;

    return matchesSearch && matchesFilter;
  });

  const handleSave = async (measure: PBIMeasure, uniqueId: string) => {
    if (!measure.sourceFilePath) return alert("Caminho do arquivo não encontrado!");

    const result = await (window as any).require('electron').ipcRenderer.invoke('save-description', {
      filePath: measure.sourceFilePath,
      itemName: measure.name,
      newDescription: tempDescription,
      type: 'measure'
    });

    if (result.success) {
      measure.description = tempDescription; 
      setEditingId(null);
    } else {
      alert("Erro ao salvar: " + result.error);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* HEADER E FILTROS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-brand-dark">Catálogo de Medidas (DAX)</h2>
          <p className="text-sm text-gray-500">Total de {filteredMeasures.length} medidas encontradas</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button 
                    onClick={() => setUsageFilter('all')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${usageFilter === 'all' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    TODAS
                </button>
                <button 
                    onClick={() => setUsageFilter('used')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${usageFilter === 'used' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    EM USO
                </button>
                <button 
                    onClick={() => setUsageFilter('unused')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${usageFilter === 'unused' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    NÃO UTILIZADAS
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar medida ou código DAX..." 
                    className="w-full md:w-80 pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </div>

      {/* LISTA DE CARDS */}
      <div className="space-y-6">
        {filteredMeasures.map((measure, idx) => {
            const uniqueId = `${measure.parentTable}-${measure.name}-${idx}`;
            
            return (
            <div key={uniqueId} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300">
                
                {/* 1. TOPO DO CARD */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="flex items-center space-x-4">
                         <div className={`p-3 rounded-xl ${measure.isCalculationItem ? 'bg-purple-100 text-purple-600' : 'bg-blue-50 text-brand-primary'}`}>
                             {measure.isCalculationItem ? <FileType size={24} /> : <Calculator size={24} />}
                         </div>
                         <div>
                             <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                 {measure.name}
                                 {measure.isCalculationItem && <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200">Calc Item</span>}
                             </h3>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tabela:</span>
                                <span className="text-xs font-bold text-brand-primary bg-blue-50 px-2 py-0.5 rounded">{measure.parentTable}</span>
                             </div>
                         </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {measure.isUsedInReport ? (
                            <span className="bg-green-100 text-green-700 text-[10px] px-3 py-1 rounded-full font-black border border-green-200 uppercase">Em Uso no Relatório</span>
                        ) : (
                            <span className="bg-gray-100 text-gray-400 text-[10px] px-3 py-1 rounded-full font-black border border-gray-200 uppercase">Não detectada em visuais</span>
                        )}
                    </div>
                </div>

                {/* 2. DOCUMENTAÇÃO (EDITÁVEL) */}
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                    {editingId === uniqueId ? (
                        <div className="space-y-3 animate-fade-in">
                            <textarea 
                                className="w-full p-3 text-sm border-2 border-brand-primary rounded-xl focus:outline-none bg-white shadow-inner"
                                value={tempDescription}
                                onChange={(e) => setTempDescription(e.target.value)}
                                rows={3}
                                placeholder="Descreva a regra de negócio desta medida..."
                            />
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors">
                                    <X size={14}/> Cancelar
                                </button>
                                <button onClick={() => handleSave(measure, uniqueId)} className="flex items-center gap-1 bg-brand-primary text-white px-5 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-brand-dark transition-colors">
                                    <Save size={14}/> Salvar no TMDL
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div 
                            className="group cursor-pointer p-3 rounded-xl border border-dashed border-gray-300 hover:border-brand-primary hover:bg-white transition-all"
                            onClick={() => { setEditingId(uniqueId); setTempDescription(measure.description || ''); }}
                        >
                            {measure.description ? (
                                <p className="text-sm text-gray-700 leading-relaxed">{measure.description}</p>
                            ) : (
                                <p className="text-xs text-gray-400 italic flex items-center gap-2">
                                    <FileText size={14}/> + Adicionar documentação de negócio (salva como /// no TMDL)
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6">
                    {/* 3. CÓDIGO DAX */}
                    <div className="mb-8">
                        <h4 className="text-[11px] font-black uppercase text-gray-400 mb-3 flex items-center tracking-widest">
                            <Code size={16} className="mr-2 text-brand-primary"/> Lógica da Medida (DAX)
                        </h4>
                        <div className="bg-[#1E1E1E] rounded-xl p-5 overflow-x-auto border border-gray-800 shadow-2xl relative group">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-gray-500 font-mono">DAX Language</span>
                            </div>
                            <code className="text-[#D4D4D4] font-mono text-sm whitespace-pre-wrap leading-relaxed">
                                {measure.expression}
                            </code>
                        </div>
                    </div>

                    {/* --- 4. ANÁLISE DE IMPACTO (O NOVO COMPONENTE) --- */}
                    <div className="mb-8 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                         <ImpactAnalyzer item={measure} />
                    </div>

                    {/* 5. METADADOS TÉCNICOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Coluna Esquerda: Formatação */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
                            <h4 className="text-[10px] font-black uppercase text-blue-600 mb-4 flex items-center tracking-widest">
                                <Type size={14} className="mr-2"/> Formatação e Tipagem
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Format String</span>
                                    {measure.formatString ? (
                                        <code className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 font-bold">
                                            {measure.formatString}
                                        </code>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Padrão do Power BI</span>
                                    )}
                                </div>
                                {measure.annotations && Object.keys(measure.annotations).length > 0 && (
                                    <div className="pt-4 border-t border-gray-50">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase block mb-3">Anotações do Modelo</span>
                                        <div className="grid grid-cols-1 gap-2">
                                            {Object.entries(measure.annotations).map(([k, v]) => (
                                                <div key={k} className="flex flex-col p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                    <span className="text-[9px] text-gray-400 font-black uppercase">{k}</span>
                                                    <span className="text-[11px] font-mono text-gray-600 truncate">{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Coluna Direita: Informações de Arquivo */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-orange-200 transition-colors">
                            <h4 className="text-[10px] font-black uppercase text-orange-600 mb-4 flex items-center tracking-widest">
                                <GitBranch size={14} className="mr-2"/> Localização do Objeto
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Origem do Metadado</span>
                                    <div className="flex items-center gap-2 p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                                        <div className="p-1.5 bg-orange-100 text-orange-600 rounded-md">
                                            <FileType size={14} />
                                        </div>
                                        <span className="text-[11px] font-mono text-orange-800 truncate" title={measure.sourceFilePath}>
                                            {measure.sourceFilePath?.split('/').pop() || 'Arquivo não mapeado'}
                                        </span>
                                    </div>
                                </div>
                                {measure.lineageTag && (
                                    <div className="pt-4 border-t border-gray-50">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Lineage Tag (GUID)</span>
                                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                                            <Hash size={12} className="text-gray-400" />
                                            <code className="text-[10px] font-mono text-gray-500">{measure.lineageTag}</code>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )})}

        {/* EMPTY STATE */}
        {filteredMeasures.length === 0 && (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter size={32} className="text-gray-300"/>
                </div>
                <p className="text-gray-500 font-bold text-lg">Nenhuma medida encontrada</p>
                <p className="text-sm text-gray-400 mt-1">Tente remover os filtros ou mudar o termo de busca.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default MeasuresView;