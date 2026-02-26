import React, { useState, useMemo } from 'react';
import ImpactAnalyzer from './ImpactAnalyzer';
import { PBIModel, PBITable, PBIColumn } from '../types';
import { 
  ChevronDown, ChevronRight, Table, Code, EyeOff, Settings, 
  Filter, FunctionSquare, Calculator, Layers, FileType, 
  FileText, Sigma, Search, CheckCircle, AlertTriangle,
  ChevronUp, Type, GitBranch, Hash
} from 'lucide-react';

// --- COMPONENTE DE HIGHLIGHT PARA COLUNAS CALCULADAS ---
const DAXCodeBlock = ({ code }: { code: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const highlightedCode = useMemo(() => {
    if (!code) return '';
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const regex = /(\/\*[\s\S]*?\*\/|\/\/.*|--.*)|("[^"]*")|('[^']+'|\[[^\]]+\])|(\b(?:VAR|RETURN|CALCULATE|SUM|SUMX|AVERAGE|MIN|MAX|COUNTROWS|DISTINCTCOUNT|DIVIDE|FILTER|ALL|VALUES|SELECTEDVALUE|IF|SWITCH|RELATED|LOOKUPVALUE|HASONEVALUE|ALLSELECTED|KEEPFILTERS|DATEADD|DATESYTD|SAMEPERIODLASTYEAR)\b)|(\b\d+(?:\.\d+)?\b)/gi;
    return escaped.replace(regex, (match, comment, string, ref, keyword, number) => {
      if (comment) return `<span class="text-gray-500 italic">${match}</span>`;
      if (string)  return `<span class="text-emerald-400">${match}</span>`;
      if (ref)     return `<span class="text-pink-400 font-medium">${match}</span>`;
      if (keyword) return `<span class="text-sky-400 font-bold">${match}</span>`;
      if (number)  return `<span class="text-amber-300">${match}</span>`;
      return match;
    });
  }, [code]);

  const needsExpansion = code.split('\n').length > 6;

  return (
    <div className="relative mt-2">
      <div className={`bg-[#1E1E1E] rounded-xl p-4 overflow-hidden border border-gray-800 transition-all duration-500 ${!isExpanded && needsExpansion ? 'max-h-[150px]' : 'max-h-[2000px]'}`}>
        <pre className="font-mono text-[12px] leading-relaxed"><code className="text-gray-300" dangerouslySetInnerHTML={{ __html: highlightedCode }} /></pre>
        {!isExpanded && needsExpansion && <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#1E1E1E] to-transparent pointer-events-none" />}
      </div>
      {needsExpansion && (
        <button onClick={() => setIsExpanded(!isExpanded)} className="mt-2 text-[9px] font-black text-brand-primary uppercase tracking-tighter flex items-center gap-1 mx-auto bg-white px-3 py-1 rounded-full border shadow-sm">
          {isExpanded ? <><ChevronUp size={12}/> Recolher</> : <><ChevronDown size={12}/> Ver DAX Completo</>}
        </button>
      )}
    </div>
  );
};

interface TablesViewProps {
  tables: PBITable[];
}

const TablesView: React.FC<TablesViewProps> = ({ tables }) => {
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [expandedCol, setExpandedCol] = useState<string | null>(null); // Novo: Expansão de detalhes da coluna
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused' | 'safe' | 'atRisk'>('all');
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [tempColDesc, setTempColDesc] = useState('');

  const handleSaveColumn = async (table: PBITable, colName: string) => {
    if (!table.sourceFilePath) return alert("Caminho do arquivo não encontrado!");
    const result = await (window as any).require('electron').ipcRenderer.invoke('save-description', {
      filePath: table.sourceFilePath, itemName: colName, newDescription: tempColDesc, type: 'column'
    });
    if (result.success) {
      const col = table.columns.find(c => c.name === colName);
      if (col) col.description = tempColDesc;
      setEditingColId(null);
    } else {
      alert("Erro: " + result.error);
    }
  };

  const isTableUsed = (table: PBITable) => {
      return table.columns.some(c => c.isUsedInReport) || table.measures.some(m => m.isUsedInReport);
  };

  const filteredTables = tables.filter(table => {
      const used = isTableUsed(table);
      const isSafe = table.columns.every(c => !c.isUsedInReport && (!c.dependents || c.dependents.length === 0)) && 
                     table.measures.every(m => !m.isUsedInReport && (!m.dependents || m.dependents.length === 0));
      
      if (usageFilter === 'all') return true;
      if (usageFilter === 'used') return used;
      if (usageFilter === 'unused') return !used;
      if (usageFilter === 'safe') return isSafe;
      if (usageFilter === 'atRisk') return used || !isSafe;
      return true;
  });

  const getTableIcon = (table: PBITable) => {
      if (table.isCalculationGroup) return <FileType size={20} className="text-purple-500" />;
      if (table.isParameter) return <Settings size={20} className="text-blue-500" />;
      if (table.isUDF) return <FunctionSquare size={20} className="text-orange-500" />;
      return <Table size={20} className="text-brand-primary" />;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      
      {/* HEADER E FILTROS REDESENHADOS */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Dicionário de Tabelas</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie a linhagem de {filteredTables.length} objetos.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200 shadow-inner">
            {['all', 'used', 'unused'].map((id) => (
              <button
                key={id}
                onClick={() => setUsageFilter(id as any)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${usageFilter === id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {id === 'all' ? 'Todas' : id === 'used' ? 'Em Uso' : 'Inativas'}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setUsageFilter('safe')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl border-2 transition-all ${usageFilter === 'safe' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border-emerald-100 text-emerald-600'}`}
            >
              <CheckCircle size={14} /> LIMPEZA SEGURA
            </button>
            <button 
              onClick={() => setUsageFilter('atRisk')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl border-2 transition-all ${usageFilter === 'atRisk' ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-white border-rose-100 text-rose-600'}`}
            >
              <AlertTriangle size={14} /> ALTO IMPACTO
            </button>
          </div>
        </div>
      </div>
      
      {/* LISTA DE TABELAS */}
      <div className="space-y-4">
        {filteredTables.map(table => (
            <div key={table.name} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200 transition-all hover:shadow-md">
                <div 
                    className="p-5 bg-white flex items-center justify-between cursor-pointer group"
                    onClick={() => setExpandedTable(expandedTable === table.name ? null : table.name)}
                >
                    <div className="flex items-center space-x-4">
                        <div className={`transition-transform duration-300 ${expandedTable === table.name ? 'rotate-90 text-brand-primary' : 'text-gray-300'}`}>
                            <ChevronRight size={24} />
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 group-hover:scale-110 transition-transform">
                            {getTableIcon(table)}
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                {table.name}
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">{table.type}</span>
                            </h3>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">{table.columns.length} Colunas • {table.measures.length} Medidas</p>
                        </div>
                    </div>
                    {isTableUsed(table) ? (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] px-3 py-1 rounded-full font-black uppercase border border-emerald-200">Em Uso</span>
                    ) : (
                        <span className="bg-gray-100 text-gray-400 text-[10px] px-3 py-1 rounded-full font-black uppercase border border-gray-200">Não Usada</span>
                    )}
                </div>

                {expandedTable === table.name && (
                    <div className="border-t border-gray-100 bg-gray-50/50 p-6 animate-fade-in">
                        
                        {/* 1. POWER QUERY SOURCE */}
                        {table.sourceExpression && (
                            <div className="mb-8">
                                <h4 className="text-[11px] font-black uppercase text-gray-400 mb-3 flex items-center tracking-widest">
                                    <Code size={16} className="mr-2 text-brand-primary"/> Fonte de Dados (M)
                                </h4>
                                <div className="bg-[#1E1E1E] text-gray-300 p-5 rounded-xl text-xs font-mono shadow-2xl border border-gray-800">
                                    <pre className="whitespace-pre-wrap leading-relaxed">{table.sourceExpression}</pre>
                                </div>
                            </div>
                        )}

                        {/* 2. TABELA DE COLUNAS */}
                        <div>
                            <h4 className="text-[11px] font-black uppercase text-gray-400 mb-3 flex items-center tracking-widest">
                                <Layers size={16} className="mr-2 text-brand-primary"/> Estrutura de Colunas
                            </h4>
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-400 font-black text-[10px] uppercase border-b border-gray-200">
                                        <tr>
                                            <th className="p-4">Campo / Documentação</th>
                                            <th className="p-4">Tipo</th>
                                            <th className="p-4 text-center">Status</th>
                                            <th className="p-4 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {table.columns.map(col => {
                                            const isSelected = expandedCol === `${table.name}-${col.name}`;
                                            return (
                                            <React.Fragment key={col.name}>
                                                <tr className={`transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            {col.expression && <Sigma size={14} className="text-orange-500" />}
                                                            <span className="font-bold text-gray-700">{col.name}</span>
                                                        </div>
                                                        {editingColId === `${table.name}-${col.name}` ? (
                                                            <div className="mt-2 flex gap-2">
                                                                <input className="flex-1 p-1.5 text-xs border-2 border-brand-primary rounded-lg outline-none" value={tempColDesc} onChange={(e) => setTempColDesc(e.target.value)} />
                                                                <button onClick={() => handleSaveColumn(table, col.name)} className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold">SALVAR</button>
                                                                <button onClick={() => setEditingColId(null)} className="bg-gray-400 text-white px-3 py-1 rounded-lg text-[10px] font-bold">X</button>
                                                            </div>
                                                        ) : (
                                                            <p onClick={() => { setEditingColId(`${table.name}-${col.name}`); setTempColDesc(col.description || ''); }} className="text-[11px] text-blue-500 cursor-pointer mt-1 hover:underline">
                                                                {col.description || "+ Adicionar descrição de negócio..."}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="p-4 font-mono text-[11px] text-gray-400">{col.dataType}</td>
                                                    <td className="p-4 text-center">
                                                        {col.isUsedInReport ? 
                                                            <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">Em Uso</span> : 
                                                            <span className="bg-rose-50 text-rose-600 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">Não Usada</span>
                                                        }
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button 
                                                            onClick={() => setExpandedCol(isSelected ? null : `${table.name}-${col.name}`)}
                                                            className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-brand-primary text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                                        >
                                                            <GitBranch size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                                
                                                {/* 3. DETALHES DE IMPACTO DA COLUNA (EXPANSÃO) */}
                                                {isSelected && (
                                                    <tr>
                                                        <td colSpan={4} className="bg-gray-50 p-6 border-b border-gray-200 animate-fade-in">
                                                            <div className="max-w-4xl mx-auto space-y-6">
                                                                {col.expression && (
                                                                    <div>
                                                                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cálculo da Coluna (DAX)</h5>
                                                                        <DAXCodeBlock code={col.expression} />
                                                                    </div>
                                                                )}
                                                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                                                    <ImpactAnalyzer item={col} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                </div>
            ))
        }
      </div>
    </div>
  );
};

export default TablesView;