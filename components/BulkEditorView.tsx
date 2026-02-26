import React, { useState } from 'react';
import { PBIModel, PBIMeasure } from '../types';

interface BulkEditorViewProps {
  model: PBIModel;
}

const BulkEditorView: React.FC<BulkEditorViewProps> = ({ model }) => {
  const allMeasures = model.tables.flatMap(t => t.measures);
  const [selectedMeasures, setSelectedMeasures] = useState<PBIMeasure[]>([]);
  const [targetFolder, setTargetFolder] = useState('');

  const toggleSelection = (measure: PBIMeasure) => {
    if (selectedMeasures.includes(measure)) {
      setSelectedMeasures(selectedMeasures.filter(m => m !== measure));
    } else {
      setSelectedMeasures([...selectedMeasures, measure]);
    }
  };

  const handleApply = async () => {
    if (selectedMeasures.length === 0) return alert("Selecione alguma medida!");
    if (!targetFolder) return alert("Digite o nome da pasta (Ex: Vendas\\2026)");

    // Prepara os dados para o Electron
    const updates = selectedMeasures.map(m => ({
      filePath: m.sourceFilePath,
      itemName: m.name,
      // O TMDL exige aspas ao redor do nome da pasta se tiver espaços ou barras
      newFolder: `"${targetFolder}"` 
    }));

    const result = await (window as any).require('electron').ipcRenderer.invoke('bulk-update-folders', { updates });

    if (result.successCount > 0) {
      alert(`${result.successCount} medidas movidas para a pasta ${targetFolder}! Abra o Power BI e veja a mágica.`);
      setSelectedMeasures([]); // Limpa a seleção
    } else {
      alert("Erros: " + result.errors.join(', '));
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-brand-dark">Organizador em Lote (Pastas)</h2>
      
      <div className="flex gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <input 
          type="text" 
          placeholder="Caminho da Pasta (Ex: Financeiro\Receitas)" 
          value={targetFolder}
          onChange={(e) => setTargetFolder(e.target.value)}
          className="border p-2 rounded flex-1 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold shadow transition-colors">
          Aplicar a {selectedMeasures.length} selecionadas
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-2 border border-gray-200 h-[600px] overflow-y-auto">
        {allMeasures.map((m, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => toggleSelection(m)}>
            <input 
              type="checkbox" 
              checked={selectedMeasures.includes(m)}
              onChange={() => {}} // O onClick da div já cuida disso
              className="w-5 h-5 cursor-pointer"
            />
            <div>
              <p className="font-bold text-sm text-gray-800">{m.name}</p>
              <p className="text-xs text-gray-400">Tabela: {m.parentTable}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BulkEditorView;