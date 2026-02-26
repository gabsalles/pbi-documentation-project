import React, { useState } from 'react';
import ImpactAnalyzer from './ImpactAnalyzer';
import { PBIModel, PBIMeasure } from '../types';
import { 
  Search, Calculator, GitBranch, ArrowRight, Filter, Hash, 
  Type, Code, Settings, FileType, Save, X, FileText,
  CheckCircle, AlertTriangle 
} from 'lucide-react';

interface MeasuresViewProps {
  model: PBIModel;
}

const MeasuresView: React.FC<MeasuresViewProps> = ({ model }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused' | 'safe' | 'atRisk'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempDescription, setTempDescription] = useState('');

  // Flatten measures
  const allMeasures = model.tables.flatMap(t => t.measures);
  
  const filteredMeasures = allMeasures.filter(m => {
    const matchesSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.expression || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const isSafe = (!m.dependents || m.dependents.length === 0) && !m.isUsedInReport;
    const isAtRisk = (m.dependents && m.dependents.length > 0) || m.isUsedInReport;

    let matchesFilter = true;
    if (usageFilter === 'used') matchesFilter = m.isUsedInReport;
    if (usageFilter === 'unused') matchesFilter = !m.isUsedInReport;
    if (usageFilter === 'safe') matchesFilter = isSafe;
    if (usageFilter === 'atRisk') matchesFilter = isAtRisk;

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
      
      {/* NOVO HEADER COM DESIGN REFEITO */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Catálogo de Medidas (DAX)</h2>
            <p className="text-sm text-gray-500 mt-1">
              Analise a linhagem e o impacto das suas regras de negócio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-8">
            {/* GRUPO 1: VISÃO GERAL (Segmented Control) */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Visão Geral</span>
              <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200 shadow-inner">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'used', label: 'Em Uso' },
                  { id: 'unused', label: 'Inativas' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setUsageFilter(opt.id as any)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                      usageFilter === opt.id 
                      ? 'bg-white text-gray-800 shadow-sm ring-1 ring-black/5' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DIVISOR VERTICAL */}
            <div className="hidden xl:block w-px h-10 bg-gray-200 mt-4"></div>

            {/* GRUPO 2: MODOS DE AUDITORIA (Action Pills) */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Modos de Auditoria</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setUsageFilter('safe')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl border-2 transition-all duration-300 ${
                    usageFilter === 'safe' 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100 scale-105' 
                    : 'bg-white border-emerald-100 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle size={14} /> LIMPEZA SEGURA
                </button>

                <button 
                  onClick={() => setUsageFilter('atRisk')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl border-2 transition-all duration-300 ${
                    usageFilter === 'atRisk' 
                    ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-100 scale-105' 
                    : 'bg-white border-rose-100 text-rose-600 hover:border-rose-500 hover:bg-rose-50'
                  }`}
                >
                  <AlertTriangle size={14} /> ALTO IMPACTO
                </button>
              </div>
            </div>

            {/* GRUPO 3: BUSCA (Alinhada à direita) */}
            <div className="flex-1 min-w-[300px] flex flex-col gap-2 xl:ml-auto">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pesquisar Medida</span>
              <div className="relative group">
                <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-brand-primary transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Nome ou código DAX..." 
                  className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LISTA DE CARDS */}
      <div className="space-y-6 pb-12">
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
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-3 py-1 rounded-full font-black border border-emerald-200 uppercase tracking-tight">Em Uso no Relatório</span>
                        ) : (
                            <span className="bg-gray-100 text-gray-400 text-[10px] px-3 py-1 rounded-full font-black border border-gray-200 uppercase tracking-tight">Não detectada em visuais</span>
                        )}
                        {measure.dependents && measure.dependents.length > 0 && (
                            <span className="bg-rose-50 text-rose-600 text-[9px] font-bold px-2 py-0.5 rounded border border-rose-100 italic">
                                Alicerce para {measure.dependents.length} medidas
                            </span>
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
                            <code className="text-[#D4D4D4] font-mono text-sm whitespace-pre-wrap leading-relaxed">
                                {measure.expression}
                            </code>
                        </div>
                    </div>

                    {/* --- 4. ANÁLISE DE IMPACTO (CRUZAMENTO COMPLETO) --- */}
                    <div className="mb-8 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                         <ImpactAnalyzer item={measure} />
                    </div>

                    {/* 5. METADADOS TÉCNICOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-orange-200 transition-colors">
                            <h4 className="text-[10px] font-black uppercase text-orange-600 mb-4 flex items-center tracking-widest">
                                <GitBranch size={14} className="mr-2"/> Localização do Objeto
                            </h4>
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Ficheiro TMDL</span>
                                <div className="flex items-center gap-2 p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                                    <span className="text-[11px] font-mono text-orange-800 truncate">
                                        {measure.sourceFilePath?.split('/').pop() || 'Desconhecido'}
                                    </span>
                                </div>
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