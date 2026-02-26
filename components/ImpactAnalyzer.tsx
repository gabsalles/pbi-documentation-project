import React from 'react';
import { AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight, LayoutTemplate } from 'lucide-react';

const ImpactAnalyzer = ({ item }: { item: any }) => {
  if (!item) return null;

  const hasDependents = item.dependents && item.dependents.length > 0;
  const hasDependencies = item.dependencies && item.dependencies.length > 0;
  const usedInReport = item.isUsedInReport === true;

  // A regra de ouro da segurança:
  const isSafe = !hasDependents && !usedInReport;

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
        Análise de Impacto Total
      </h3>

      {/* CARD DE SEGURANÇA (O SEMÁFORO ATUALIZADO) */}
      <div className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${isSafe ? 'bg-green-50 border-green-100 shadow-sm' : 'bg-red-50 border-red-100 shadow-sm'}`}>
        <div className={`p-2 rounded-full ${isSafe ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {isSafe ? (
              <CheckCircle size={24} />
            ) : (
              <AlertTriangle size={24} />
            )}
        </div>
        <div className="flex-1">
          <p className={`font-black text-sm uppercase tracking-tight ${isSafe ? 'text-green-700' : 'text-red-700'}`}>
            {isSafe ? 'Seguro para Limpeza' : 'Risco Detectado: Item em Uso'}
          </p>
          <div className="text-xs text-gray-500 mt-0.5 font-medium space-y-1">
            {hasDependents && (
              <p className="flex items-center gap-1 text-red-600">
                • Referenciado em <strong>{item.dependents.length}</strong> fórmulas DAX.
              </p>
            )}
            {usedInReport && (
              <p className="flex items-center gap-1 text-red-600">
                • Utilizado ativamente em <strong>visuais do relatório</strong>.
              </p>
            )}
            {isSafe && (
              <p>Este item não possui dependências de DAX nem de visual. Pode ser removido com segurança.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ORIGENS (Dependencies) */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-1.5">
            <ArrowUpRight size={14} className="text-blue-500" /> Origens (DAX utiliza)
          </p>
          {hasDependencies ? (
            <div className="flex flex-wrap gap-2">
              {item.dependencies.map((dep: string) => (
                <span key={dep} className="text-[9px] px-2 py-1 bg-white text-blue-700 rounded-md font-bold border border-blue-50 shadow-sm">
                  {dep}
                </span>
              ))}
            </div>
          ) : <p className="text-[10px] text-gray-400 italic font-mono">Input manual</p>}
        </div>

        {/* DESTINOS DAX (Dependents) */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-1.5">
            <ArrowDownRight size={14} className="text-red-500" /> Impacto em DAX
          </p>
          {hasDependents ? (
            <div className="flex flex-wrap gap-2">
              {item.dependents.map((dep: string) => (
                <span key={dep} className="text-[9px] px-2 py-1 bg-white text-red-700 rounded-md font-bold border border-red-50 shadow-sm">
                  {dep}
                </span>
              ))}
            </div>
          ) : <p className="text-[10px] text-gray-400 italic">Nenhum cálculo depende disto.</p>}
        </div>

        {/* USO NO RELATÓRIO */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-1.5">
            <LayoutTemplate size={14} className="text-green-500" /> Uso no Relatório
          </p>
          {usedInReport ? (
            <div className="flex flex-col gap-2">
               <span className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded-md font-bold border border-green-200 self-start">
                  SIM (Visuais Ativos)
               </span>
               <p className="text-[9px] text-gray-400 leading-tight">
                  Este campo foi mapeado no parser através dos ficheiros JSON de visuais.
               </p>
            </div>
          ) : (
            <p className="text-[10px] text-gray-400 italic">Não utilizado em páginas/visuais.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImpactAnalyzer;