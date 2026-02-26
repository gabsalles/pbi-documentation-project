import React from 'react';
import { AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const ImpactAnalyzer = ({ item }: { item: any }) => {
  // Verificação de segurança para não quebrar se o item for nulo
  if (!item) return null;

  const hasDependents = item.dependents && item.dependents.length > 0;
  const hasDependencies = item.dependencies && item.dependencies.length > 0;

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
        Linhagem e Impacto
      </h3>

      {/* CARD DE SEGURANÇA (O SEMÁFORO) */}
      <div className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${hasDependents ? 'bg-red-50 border-red-100 shadow-sm' : 'bg-green-50 border-green-100 shadow-sm'}`}>
        <div className={`p-2 rounded-full ${hasDependents ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            {hasDependents ? (
            <AlertTriangle size={24} />
            ) : (
            <CheckCircle size={24} />
            )}
        </div>
        <div>
          <p className={`font-black text-sm uppercase tracking-tight ${hasDependents ? 'text-red-700' : 'text-green-700'}`}>
            {hasDependents ? `Risco de Quebra: ${item.dependents.length} itens dependentes` : 'Seguro para Limpeza'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            {hasDependents 
              ? 'Esta medida é usada por outros cálculos. Apagá-la causará erro no modelo.' 
              : 'Nenhuma outra medida ou coluna utiliza este cálculo como base.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ORIGENS (Dependencies) */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-1.5">
            <ArrowUpRight size={14} className="text-blue-500" /> Origens (DAX utiliza)
          </p>
          {hasDependencies ? (
            <div className="flex flex-wrap gap-2">
              {item.dependencies.map((dep: string) => (
                <span key={dep} className="text-[10px] px-2 py-1 bg-white text-blue-700 rounded-md font-bold border border-blue-50 shadow-sm">
                  {dep}
                </span>
              ))}
            </div>
          ) : <p className="text-[10px] text-gray-400 italic">Esta medida não chama outros itens.</p>}
        </div>

        {/* DESTINOS (Dependents) */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-1.5">
            <ArrowDownRight size={14} className="text-red-500" /> Destinos (Cálculos Impactados)
          </p>
          {hasDependents ? (
            <div className="flex flex-wrap gap-2">
              {item.dependents.map((dep: string) => (
                <span key={dep} className="text-[10px] px-2 py-1 bg-white text-red-700 rounded-md font-bold border border-red-50 shadow-sm">
                  {dep}
                </span>
              ))}
            </div>
          ) : <p className="text-[10px] text-gray-400 italic">Nenhum impacto direto detectado.</p>}
        </div>
      </div>
    </div>
  );
};

// A LINHA QUE FALTAVA:
export default ImpactAnalyzer;