import React, { useState, useMemo } from 'react';
import ImpactAnalyzer from './ImpactAnalyzer';
import { PBIModel, PBIMeasure } from '../types';
import { 
  Search, Calculator, GitBranch, ArrowRight, Filter, Hash, 
  Type, Code, Settings, FileType, Save, X, FileText,
  CheckCircle, AlertTriangle, ChevronDown, ChevronUp 
} from 'lucide-react';

// --- COMPONENTE DE CÓDIGO COM HIGHLIGHT PROFISSIONAL (SINGLE PASS) ---
const DAXCodeBlock = ({ code }: { code: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const highlightedCode = useMemo(() => {
    if (!code) return '';

    // 1. Escapar caracteres HTML para segurança
    const escapedCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    /**
     * REGEX DE VARREDURA ÚNICA (O segredo para não quebrar o HTML)
     * Grupo 1: Comentários (/*...*\/ ou //... ou --...)
     * Grupo 2: Strings ("...")
     * Grupo 3: Referências ('Tabela'[Coluna] ou [Medida])
     * Grupo 4: Palavras-chave (VAR, RETURN, CALCULATE, etc)
     * Grupo 5: Números (Inteiros ou Decimais)
     */
    const regex = /(\/\*[\s\S]*?\*\/|\/\/.*|--.*)|("[^"]*")|('[^']+'|\[[^\]]+\])|(\b(?:VAR|RETURN|CALCULATE|SUM|SUMX|AVERAGE|MIN|MAX|COUNTROWS|DISTINCTCOUNT|DIVIDE|FILTER|ALL|VALUES|SELECTEDVALUE|IF|SWITCH|RELATED|LOOKUPVALUE|HASONEVALUE|ALLSELECTED|KEEPFILTERS|DATEADD|DATESYTD|SAMEPERIODLASTYEAR)\b)|(\b\d+(?:\.\d+)?\b)/gi;

    return escapedCode.replace(regex, (match, comment, string, ref, keyword, number) => {
      if (comment) return `<span class="text-gray-500 italic">${match}</span>`;
      if (string)  return `<span class="text-emerald-400">${match}</span>`;
      if (ref)     return `<span class="text-pink-400 font-medium">${match}</span>`;
      if (keyword) return `<span class="text-sky-400 font-bold">${match}</span>`;
      if (number)  return `<span class="text-amber-300">${match}</span>`;
      return match;
    });
  }, [code]);

  const needsExpansion = code.split('\n').length > 10 || code.length > 500;

  return (
    <div className="relative">
      <div 
        className={`bg-[#1E1E1E] rounded-xl p-5 overflow-hidden border border-gray-800 shadow-2xl transition-all duration-500 ease-in-out ${
          !isExpanded && needsExpansion ? 'max-h-[280px]' : 'max-h-[5000px]'
        }`}
      >
        <pre className="font-mono text-[13px] leading-relaxed tracking-wide overflow-x-auto">
          <code 
            className="text-gray-300"
            dangerouslySetInnerHTML={{ __html: highlightedCode }} 
          />
        </pre>

        {/* Efeito de fade-out para indicar que tem mais código */}
        {!isExpanded && needsExpansion && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#1E1E1E] via-[#1E1E1E]/80 to-transparent pointer-events-none" />
        )}
      </div>

      {needsExpansion && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 flex items-center gap-2 mx-auto text-[10px] font-black text-brand-primary hover:bg-brand-primary hover:text-white bg-white border-2 border-brand-primary/20 px-8 py-2.5 rounded-full transition-all shadow-sm hover:shadow-md uppercase tracking-widest"
        >
          {isExpanded ? (
            <><ChevronUp size={16} /> Recolher Lógica</>
          ) : (
            <><ChevronDown size={16} /> Ver Fórmula Completa</>
          )}
        </button>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const MeasuresView: React.FC<MeasuresViewProps> = ({ model }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused' | 'safe' | 'atRisk'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempDescription, setTempDescription] = useState('');

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

  const handleSave = async (measure: PBIMeasure) => {
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
      
      {/* HEADER E FILTROS REDESENHADOS */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Catálogo de Medidas (DAX)</h2>
              <p className="text-sm text-gray-500 mt-1">
                Auditando {filteredMeasures.length} regras de negócio no seu modelo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-8">
            {/* Filtros de Visão */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Visão Geral</span>
              <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200 shadow-inner">
                {['all', 'used', 'unused'].map((id) => (
                  <button
                    key={id}
                    onClick={() => setUsageFilter(id as any)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      usageFilter === id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {id === 'all' ? 'Todas' : id === 'used' ? 'Em Uso' : 'Inativas'}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden xl:block w-px h-10 bg-gray-200 mt-4"></div>

            {/* Filtros de Auditoria */}
            <div className="flex flex-col gap-1.5">
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

            {/* Busca */}
            <div className="flex-1 min-w-[300px] flex flex-col gap-1.5 xl:ml-auto">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pesquisar</span>
              <div className="relative group">
                <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-brand-primary" size={18} />
                <input 
                  type="text" 
                  placeholder="Nome ou código DAX..." 
                  className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-brand-primary outline-none transition-all"
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
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="flex items-center space-x-4">
                         <div className="p-3 rounded-xl bg-blue-50 text-brand-primary">
                             <Calculator size={24} />
                         </div>
                         <div>
                             <h3 className="font-bold text-xl text-gray-800">{measure.name}</h3>
                             <p className="text-xs font-bold text-brand-primary bg-blue-50 px-2 py-0.5 rounded inline-block mt-1">
                               {measure.parentTable}
                             </p>
                         </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {measure.isUsedInReport ? (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-3 py-1 rounded-full font-black border border-emerald-200 uppercase tracking-tight">Em Uso</span>
                        ) : (
                            <span className="bg-gray-100 text-gray-400 text-[10px] px-3 py-1 rounded-full font-black border border-gray-200 uppercase tracking-tight">Ociosa</span>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    <div className="mb-8">
                        <h4 className="text-[11px] font-black uppercase text-gray-400 mb-3 flex items-center tracking-widest">
                            <Code size={16} className="mr-2 text-brand-primary"/> Lógica da Medida (DAX)
                        </h4>
                        
                        <DAXCodeBlock code={measure.expression} />
                    </div>

                    <div className="mb-8 p-1 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                         <ImpactAnalyzer item={measure} />
                    </div>
                </div>
            </div>
        )})}
      </div>
    </div>
  );
};

export default MeasuresView;