import React, { useState } from 'react';
import { PBIModel, PBITable } from '../types';
import { ChevronDown, ChevronRight, Table, Code, EyeOff, Settings, Filter, FunctionSquare, Calculator, Layers, FileType, FileText, Sigma } from 'lucide-react';

interface TablesViewProps {
  tables: PBITable[];
}

const TablesView: React.FC<TablesViewProps> = ({ tables }) => {
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'unused'>('all');

  const toggleTable = (name: string) => {
    setExpandedTable(expandedTable === name ? null : name);
  };

  const isTableUsed = (table: PBITable) => {
      const hasUsedColumn = table.columns.some(c => c.isUsedInReport);
      const hasUsedMeasure = table.measures.some(m => m.isUsedInReport);
      return hasUsedColumn || hasUsedMeasure;
  };

  const filteredTables = tables.filter(table => {
      if (usageFilter === 'all') return true;
      const used = isTableUsed(table);
      return usageFilter === 'used' ? used : !used;
  });

  const getTableIcon = (table: PBITable) => {
      if (table.isCalculationGroup) return <FileType size={20} className="text-purple-500" />;
      if (table.isParameter) return <Settings size={20} className="text-blue-500" />;
      if (table.isUDF) return <FunctionSquare size={20} className="text-orange-500" />;
      if (table.columns.length === 0 && table.measures.length > 0) return <Calculator size={20} className="text-green-500" />;
      if (table.columns.length === 0) return <Layers size={20} className="text-gray-400" />;
      return <Table size={20} className="text-brand-primary" />;
  };

  const getTableTypeLabel = (table: PBITable) => {
      if (table.isCalculationGroup) return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Calculation Group</span>;
      if (table.isParameter) return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Field Parameter</span>;
      if (table.isUDF) return <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Power Query Function</span>;
      return <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{table.type}</span>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-brand-dark">Dicionário de Tabelas</h2>
        
        <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
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
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${usageFilter === 'unused' ? 'bg-blue-50 text-red-700 border border-red-200' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                Não Utilizadas
            </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredTables.length > 0 ? (
            filteredTables.map(table => (
                <div key={table.name} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 print-break-before">
                {/* Header */}
                <div 
                    className="p-4 bg-white flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleTable(table.name)}
                >
                    <div className="flex items-center space-x-3">
                    {expandedTable === table.name ? <ChevronDown size={20} className="text-brand-primary"/> : <ChevronRight size={20} className="text-gray-400"/>}
                    <div className={`p-2 rounded-lg bg-gray-50 border border-gray-100`}>
                        {getTableIcon(table)}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-brand-dark flex items-center gap-2">
                            {table.name}
                            {getTableTypeLabel(table)}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                        {table.columns.length} Colunas • {table.measures.length} Medidas
                        </p>
                    </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {isTableUsed(table) ? (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium">Em Uso</span>
                        ) : (
                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded font-medium">Não Usada</span>
                        )}
                    </div>
                </div>

                {/* Content */}
                {expandedTable === table.name && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                    {table.description && (
                         <div className="mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100 flex items-start">
                             <FileText size={16} className="text-yellow-600 mr-2 mt-0.5" />
                             <span className="text-sm text-yellow-800 italic">{table.description}</span>
                         </div>
                    )}

                    {table.sourceExpression && (
                        <div className="mb-6">
                            <h4 className="text-sm font-bold uppercase text-gray-500 mb-2 flex items-center">
                                <Code size={14} className="mr-2"/> Fonte (Power Query / M)
                            </h4>
                            <div className="bg-brand-dark text-gray-300 p-4 rounded-lg text-xs overflow-x-auto shadow-inner">
                                <pre className="font-mono whitespace-pre-wrap leading-relaxed">
                                    {table.sourceExpression}
                                </pre>
                            </div>
                        </div>
                    )}

                    <div className="mb-6">
                        <h4 className="text-sm font-bold uppercase text-gray-500 mb-2 flex items-center justify-between">
                            <span>Colunas</span>
                            <span className="text-xs font-normal bg-gray-200 px-2 py-0.5 rounded-full">{table.columns.length}</span>
                        </h4>
                        {table.columns.length > 0 ? (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="p-3">Nome / Descrição</th>
                                            <th className="p-3">Tipo de Dado</th>
                                            <th className="p-3 text-center">Oculta?</th>
                                            <th className="p-3 text-center">Em Uso?</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {table.columns.map(col => {
                                            const isCalculated = table.type === 'Calculated' || col.expression; // Basic heuristic
                                            return (
                                            <tr key={col.name} className="hover:bg-gray-50">
                                                <td className="p-3">
                                                    <div className="flex items-center">
                                                        {isCalculated && (
                                                            <span title="Coluna Calculada">
                                                                <Sigma size={14} className="text-orange-500 mr-1.5" />
                                                            </span>
                                                        )}
                                                        <span className="font-medium text-brand-dark">{col.name}</span>
                                                    </div>
                                                    {col.description ? (
                                                        <div className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-1 mt-1.5 inline-block">
                                                            {col.description}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] text-gray-300 italic mt-0.5">Sem descrição</div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-gray-500 font-mono text-xs align-top pt-3.5">{col.dataType}</td>
                                                <td className="p-3 text-center align-top pt-3.5">
                                                    {col.isHidden && <EyeOff size={16} className="mx-auto text-gray-400"/>}
                                                </td>
                                                <td className="p-3 text-center align-top pt-3.5">
                                                    {col.isUsedInReport ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                            Sim
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-red-800">
                                                            Não
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-400 italic bg-white p-4 rounded border border-gray-100">Sem colunas físicas (Tabela de Medidas ou Calc Group).</div>
                        )}
                    </div>
                    </div>
                )}
                </div>
            ))
        ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <Filter size={48} className="mx-auto text-gray-200 mb-4"/>
                <p className="text-gray-500 font-medium">Nenhuma tabela encontrada com este filtro.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default TablesView;