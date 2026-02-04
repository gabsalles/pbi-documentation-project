import React from 'react';
import { PBIModel } from '../types';
import { Shield, Lock, Users, Code } from 'lucide-react';

interface SecurityViewProps {
  model: PBIModel;
}

const SecurityView: React.FC<SecurityViewProps> = ({ model }) => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-brand-dark">Segurança (RLS)</h2>
            <p className="text-sm text-gray-500">Funções e Regras de Nível de Linha</p>
        </div>
        <div className="flex items-center px-3 py-1 bg-white border border-gray-200 rounded-full shadow-sm">
             <Shield size={16} className="text-green-600 mr-2"/>
             <span className="font-bold">{model.roles.length}</span>
             <span className="ml-1 text-gray-500">Roles Configurados</span>
        </div>
      </div>

      {model.roles.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="bg-gray-50 p-4 rounded-full w-fit mx-auto mb-4">
                    <Shield size={48} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-600">Nenhuma regra de segurança detectada</h3>
                <p className="text-gray-400 max-w-md mx-auto mt-2">
                    Este modelo não possui Row Level Security (RLS) configurado ou as regras estão definidas externamente.
                </p>
           </div>
      ) : (
          <div className="grid grid-cols-1 gap-6">
              {model.roles.map((role, idx) => (
                  <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print-break-before">
                      <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                                  <Users size={20} />
                              </div>
                              <div>
                                  <h3 className="font-bold text-lg text-brand-dark">{role.name}</h3>
                                  <p className="text-xs text-gray-500">Permissão de Modelo: <span className="font-mono">{role.modelPermission || 'Read'}</span></p>
                              </div>
                          </div>
                      </div>
                      
                      <div className="p-0">
                          {role.tablePermissions.length > 0 ? (
                              <div className="divide-y divide-gray-100">
                                  {role.tablePermissions.map((perm, pIdx) => (
                                      <div key={pIdx} className="p-4 hover:bg-gray-50 transition-colors">
                                          <div className="flex items-start gap-4">
                                              <div className="min-w-[150px] pt-1">
                                                  <div className="flex items-center text-sm font-bold text-gray-700">
                                                      <Lock size={14} className="mr-2 text-gray-400" />
                                                      {perm.table}
                                                  </div>
                                              </div>
                                              <div className="flex-1">
                                                  <div className="bg-gray-900 rounded-lg p-3 relative group">
                                                      <div className="absolute top-2 right-2 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                          <Code size={14} />
                                                      </div>
                                                      <code className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                                                          {perm.expression}
                                                      </code>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="p-6 text-center text-gray-400 italic text-sm">
                                  Esta role não possui filtros de tabela explícitos.
                              </div>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default SecurityView;