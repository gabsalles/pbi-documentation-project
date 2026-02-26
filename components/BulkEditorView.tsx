import React, { useState, useMemo } from 'react';
import { PBIModel, PBIMeasure } from '../types';
import { Search, ArrowUpDown, Save, CheckSquare, Square, Lightbulb } from 'lucide-react';

interface BulkEditorViewProps {
  model: PBIModel;
}

// Motor blindado contra textos vazios
const suggestFolder = (measureName?: string, expression?: string): string => {
  const nameUpper = (measureName || '').toUpperCase();
  const exprUpper = (expression || '').toUpperCase();

  if (!nameUpper && !exprUpper) return '';

  if (exprUpper.includes('SAMEPERIODLASTYEAR') || exprUpper.includes('YTD') || exprUpper.includes('MTD') || nameUpper.includes(' YOY')) return 'Inteligência de Tempo';
  if (nameUpper.includes('%') || nameUpper.includes('PCT') || nameUpper.includes('TAXA') || exprUpper.includes('DIVIDE(')) return 'Percentuais';
  if (exprUpper.includes('COUNT(') || exprUpper.includes('DISTINCTCOUNT') || nameUpper.includes('QTD')) return 'Contagens';
  if (exprUpper.includes('AVERAGE') || nameUpper.includes('MÉDIA')) return 'Médias';
  if (exprUpper.includes('MAX') || nameUpper.startsWith('MAX ')) return 'Máximos';
  if (exprUpper.includes('MIN') || nameUpper.startsWith('MIN ')) return 'Mínimos';
  if (exprUpper.includes('SUM') || nameUpper.includes('TOTAL') || nameUpper.includes('SOMA')) return 'Somas';

  return ''; 
};

interface MeasureRow {
  id: string;
  measure: PBIMeasure;
  targetTable: string;
  targetFolder: string;
  suggestion: string;
  selected: boolean;
  isDirty: boolean;
}

const BulkEditorView: React.FC<BulkEditorViewProps> = ({ model }) => {
  // Blindagem: Garantir que model e tables existem, e que a tabela tem nome
  const availableTables = (model?.tables || []).filter(t => 
    t && t.name && !t.name.startsWith('LocalDateTable') && !t.name.startsWith('DateTableTemplate')
  );
  
  // 1. Inicializar o estado (Totalmente Blindado)
  const [rows, setRows] = useState<MeasureRow[]>(() => {
    if (!model || !model.tables) return [];
    
    return model.tables.flatMap(t => {
      if (!t || !t.measures) return []; // Pula se a tabela não tiver medidas
      
      return t.measures.map((m, index) => ({
        id: `${m.parentTable || t.name || 'Tabela'}-${m.name || index}`, // ID sempre único
        measure: m,
        targetTable: t.sourceFilePath || '',
        targetFolder: '', 
        suggestion: suggestFolder(m.name, m.expression),
        selected: false,
        isDirty: false
      }));
    });
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof MeasureRow | 'measure.name' | 'measure.parentTable'; direction: 'asc' | 'desc' }>({ key: 'measure.parentTable', direction: 'asc' });
  const [bulkTable, setBulkTable] = useState('');
  const [bulkFolder, setBulkFolder] = useState('');

  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(r => 
        (r.measure?.name || '').toLowerCase().includes(lowerSearch) || 
        (r.measure?.expression || '').toLowerCase().includes(lowerSearch) ||
        (r.suggestion || '').toLowerCase().includes(lowerSearch)
      );
    }

    result.sort((a, b) => {
      let aValue: any = a;
      let bValue: any = b;

      if (sortConfig.key === 'measure.name') { aValue = a.measure?.name || ''; bValue = b.measure?.name || ''; }
      else if (sortConfig.key === 'measure.parentTable') { aValue = a.measure?.parentTable || ''; bValue = b.measure?.parentTable || ''; }
      else { aValue = a[sortConfig.key] || ''; bValue = b[sortConfig.key] || ''; }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [rows, searchTerm, sortConfig]);

  const selectedCount = rows.filter(r => r.selected).length;
  const dirtyRows = rows.filter(r => r.isDirty);

  const handleSort = (key: keyof MeasureRow | 'measure.name' | 'measure.parentTable') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleAll = () => {
    const allSelected = filteredAndSortedRows.every(r => r.selected);
    setRows(rows.map(r => {
      if (filteredAndSortedRows.find(f => f.id === r.id)) {
        return { ...r, selected: !allSelected };
      }
      return r;
    }));
  };

  const updateRow = (id: string, updates: Partial<MeasureRow>) => {
    setRows(rows.map(r => {
      if (r.id === id) {
        const updatedRow = { ...r, ...updates };
        updatedRow.isDirty = updatedRow.targetTable !== r.measure.sourceFilePath || updatedRow.targetFolder !== '';
        return updatedRow;
      }
      return r;
    }));
  };

  const applyBulkChanges = () => {
    setRows(rows.map(r => {
      if (r.selected) {
        const updatedRow = { 
          ...r, 
          targetTable: bulkTable || r.targetTable, 
          targetFolder: bulkFolder || r.targetFolder,
          selected: false 
        };
        updatedRow.isDirty = updatedRow.targetTable !== r.measure.sourceFilePath || updatedRow.targetFolder !== '';
        return updatedRow;
      }
      return r;
    }));
    setBulkTable('');
    setBulkFolder('');
  };

  const handleSave = async () => {
    if (dirtyRows.length === 0) return alert("Nenhuma alteração pendente para salvar!");

    const moves = dirtyRows.map(r => ({
      sourcePath: r.measure.sourceFilePath,
      targetPath: r.targetTable,
      itemName: r.measure.name,
      newFolder: r.targetFolder ? `"${r.targetFolder}"` : undefined
    }));

    const result = await (window as any).require('electron').ipcRenderer.invoke('move-measures', { moves });

    if (result.successCount > 0) {
      alert(`Sucesso! ${result.successCount} cirurgias realizadas no modelo.\nPor favor, recarregue a pasta para ver as mudanças.`);
      setRows(rows.map(r => ({ ...r, isDirty: false, measure: { ...r.measure, sourceFilePath: r.targetTable } })));
    } else {
      alert("Erros: " + result.errors.join('\n'));
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
      
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-dark">Data Grid de Mapeamento</h2>
          <p className="text-sm text-gray-500">Organize, mova e categorize as suas medidas em lote.</p>
        </div>
        
        <div className="relative w-96">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, DAX ou sugestão..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary outline-none shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0 relative">
        <div className="overflow-y-auto flex-1">
          
          <div className="sticky top-0 z-20 grid grid-cols-12 gap-4 bg-gray-100/95 backdrop-blur-sm p-3 border-b border-gray-300 font-bold text-[11px] text-gray-500 uppercase tracking-wider shadow-sm">
            <div className="col-span-4 flex items-center gap-3">
               <div onClick={toggleAll} className="cursor-pointer hover:text-brand-primary">
                 {filteredAndSortedRows.length > 0 && filteredAndSortedRows.every(r => r.selected) ? <CheckSquare size={16} /> : <Square size={16} />}
               </div>
               <span className="cursor-pointer hover:text-brand-primary flex items-center gap-1" onClick={() => handleSort('measure.name')}>
                 Origem / Medida (DAX) <ArrowUpDown size={12}/>
               </span>
            </div>
            <div className="col-span-2 cursor-pointer hover:text-brand-primary flex items-center gap-1" onClick={() => handleSort('suggestion')}>
              Sugestão <ArrowUpDown size={12}/>
            </div>
            <div className="col-span-6 grid grid-cols-2 gap-4 bg-blue-50/90 -my-3 p-3 border-l border-blue-200">
               <div>Mover para Tabela</div>
               <div>Mover para Pasta</div>
            </div>
          </div>

          <div className="flex flex-col">
            {filteredAndSortedRows.map((row, index) => (
              <div 
                key={row.id} 
                className={`grid grid-cols-12 gap-4 p-2.5 items-center border-b border-gray-100 text-sm transition-all duration-200 
                  ${row.isDirty ? 'bg-yellow-50/80 hover:bg-yellow-100 border-l-4 border-l-yellow-400' : 
                    (index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/30 hover:bg-gray-100')}`}
              >
                <div className="col-span-4 flex items-start gap-3 truncate">
                  <div onClick={() => updateRow(row.id, { selected: !row.selected })} className="cursor-pointer text-gray-400 hover:text-brand-primary mt-0.5">
                    {row.selected ? <CheckSquare size={16} className="text-brand-primary" /> : <Square size={16} />}
                  </div>
                  <div className="truncate flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 truncate" title={row.measure?.name || 'Sem nome'}>{row.measure?.name || 'Sem nome'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200 truncate max-w-[100px]" title={row.measure?.parentTable || ''}>
                        {row.measure?.parentTable || 'Desconhecido'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-gray-400 truncate mt-1" title={row.measure?.expression || ''}>{row.measure?.expression || 'Sem expressão'}</p>
                  </div>
                </div>

                <div className="col-span-2 flex items-center">
                  {row.suggestion && (
                    <button 
                      onClick={() => updateRow(row.id, { targetFolder: row.suggestion })}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 text-[11px] font-medium rounded-full hover:bg-purple-100 border border-purple-200 transition-colors shadow-sm"
                    >
                      <Lightbulb size={12} /> {row.suggestion}
                    </button>
                  )}
                </div>

                <div className="col-span-6 grid grid-cols-2 gap-4 bg-blue-50/20 -my-2.5 p-2.5 border-l border-blue-50">
                  <div>
                    <select 
                      value={row.targetTable}
                      onChange={(e) => updateRow(row.id, { targetTable: e.target.value })}
                      className={`w-full border rounded-md p-1.5 text-xs outline-none transition-shadow focus:ring-2 focus:ring-brand-primary/50 
                        ${row.targetTable !== row.measure?.sourceFilePath ? 'border-brand-primary text-brand-primary font-bold bg-blue-50 shadow-sm' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'}`}
                    >
                      {availableTables.map(t => <option key={t.name} value={t.sourceFilePath}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <input 
                      type="text" 
                      value={row.targetFolder}
                      onChange={(e) => updateRow(row.id, { targetFolder: e.target.value })}
                      placeholder="Ex: Financeiro\Receitas"
                      className={`w-full border rounded-md p-1.5 text-xs font-mono outline-none transition-shadow focus:ring-2 focus:ring-brand-primary/50 
                        ${row.targetFolder !== '' ? 'border-brand-primary bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    />
                  </div>
                </div>
              </div>
            ))}
            {filteredAndSortedRows.length === 0 && (
              <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                 <Search size={32} className="mb-3 opacity-50" />
                 <p className="font-medium">Nenhuma medida encontrada.</p>
                 <p className="text-sm mt-1">Tente buscar por outro termo ou limpar os filtros.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {selectedCount > 0 && (
          <div className="bg-blue-600 text-white p-3 rounded-lg flex items-center justify-between shadow-md animate-fade-in-up">
            <span className="font-bold text-sm flex items-center gap-2">
              <CheckSquare size={18} /> {selectedCount} medida(s) selecionada(s)
            </span>
            <div className="flex items-center gap-3 flex-1 max-w-2xl ml-6">
              <select 
                value={bulkTable} onChange={(e) => setBulkTable(e.target.value)}
                className="bg-blue-700 border-none text-white p-2 rounded text-sm flex-1 outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
              >
                <option value="">-- Manter Tabela Atual --</option>
                {availableTables.map(t => <option key={t.name} value={t.sourceFilePath}>{t.name}</option>)}
              </select>
              <input 
                type="text" placeholder="Digitar nova pasta em lote..." 
                value={bulkFolder} onChange={(e) => setBulkFolder(e.target.value)}
                className="bg-blue-700 border-none text-white placeholder-blue-300 p-2 rounded text-sm flex-1 outline-none focus:ring-2 focus:ring-white/50 font-mono"
              />
              <button onClick={applyBulkChanges} className="bg-white text-blue-700 hover:bg-gray-100 px-5 py-2 rounded text-sm font-bold transition-colors shadow-sm whitespace-nowrap">
                Aplicar a todas
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div>
             {dirtyRows.length > 0 ? (
               <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
                 <span className="font-bold">⚠️ Atenção:</span> 
                 <span className="text-sm">Você tem <strong>{dirtyRows.length}</strong> alteração(ões) pendente(s).</span>
               </div>
             ) : (
               <p className="text-gray-400 text-sm flex items-center gap-2">
                 <CheckSquare size={16} /> O seu modelo está sincronizado com os ficheiros.
               </p>
             )}
          </div>
          <button 
            onClick={handleSave} 
            disabled={dirtyRows.length === 0}
            className={`flex items-center gap-2 px-8 py-3 rounded-lg font-bold shadow-sm transition-all duration-200 ${dirtyRows.length > 0 ? 'bg-green-600 hover:bg-green-700 text-white hover:shadow-md transform hover:-translate-y-0.5' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            <Save size={18} />
            Gravar Alterações no Power BI
          </button>
        </div>
      </div>

    </div>
  );
};

export default BulkEditorView;