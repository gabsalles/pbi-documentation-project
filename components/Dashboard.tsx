import React from 'react';
import { PBIModel } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Database, Calculator, FileText, Link, Shield, Settings, FileType } from 'lucide-react';

interface DashboardProps {
  model: PBIModel;
}

const Dashboard: React.FC<DashboardProps> = ({ model }) => {
  const totalTables = model.tables.length;
  const totalMeasures = model.tables.reduce((acc, t) => acc + t.measures.length, 0);
  const totalColumns = model.tables.reduce((acc, t) => acc + t.columns.length, 0);
  const totalPages = model.pages.length;
  const totalRels = model.relationships.length;
  const totalParams = model.parameters.length + model.tables.filter(t => t.isParameter).length;
  const totalRoles = model.roles.length;
  const calcGroups = model.tables.filter(t => t.isCalculationGroup).length;
  
  const unusedMeasures = model.tables.reduce((acc, t) => acc + t.measures.filter(m => !m.isUsedInReport).length, 0);

  const usageData = [
    { name: 'Utilizadas', value: totalMeasures - unusedMeasures },
    { name: 'Não Utilizadas', value: unusedMeasures },
  ];

  const COLORS = ['#0d2060', '#E5E7EB'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
            <h2 className="text-2xl font-bold text-brand-dark">Visão Geral: {model.datasetName}</h2>
            <p className="text-sm text-gray-500">Documentação automática do projeto PBIP V3.0</p>
        </div>
        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
          Gerado em: {new Date(model.timestamp).toLocaleDateString()}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-brand-primary flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                   <p className="text-gray-500 text-xs font-medium uppercase">Tabelas</p>
                   <h3 className="text-2xl font-bold text-brand-dark mt-1">{totalTables}</h3>
                </div>
                <Database className="text-brand-primary opacity-20" size={24} />
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-brand-secondary flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                   <p className="text-gray-500 text-xs font-medium uppercase">Medidas</p>
                   <h3 className="text-2xl font-bold text-brand-dark mt-1">{totalMeasures}</h3>
                </div>
                <Calculator className="text-brand-secondary opacity-20" size={24} />
            </div>
        </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                   <p className="text-gray-500 text-xs font-medium uppercase">Calculation Groups</p>
                   <h3 className="text-2xl font-bold text-brand-dark mt-1">{calcGroups}</h3>
                </div>
                <FileType className="text-purple-500 opacity-20" size={24} />
            </div>
        </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-600 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                   <p className="text-gray-500 text-xs font-medium uppercase">Roles (RLS)</p>
                   <h3 className="text-2xl font-bold text-brand-dark mt-1">{totalRoles}</h3>
                </div>
                <Shield className="text-green-600 opacity-20" size={24} />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Check */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold text-brand-dark mb-4">Saúde do Modelo (Uso de Medidas)</h3>
            <div className="flex items-center h-64">
                <ResponsiveContainer width="50%" height="100%">
                    <PieChart>
                        <Pie
                            data={usageData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {usageData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
                <div className="w-1/2 space-y-4">
                    <div>
                        <p className="text-sm text-gray-500">Total de Medidas</p>
                        <p className="text-2xl font-bold">{totalMeasures}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-500">Não utilizadas no Relatório</p>
                        <p className="text-2xl font-bold text-red-500">{unusedMeasures}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Extended Stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold text-brand-dark mb-4">Estatísticas do Projeto</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg flex items-center">
                    <FileText className="text-gray-400 mr-3" />
                    <div>
                        <p className="text-2xl font-bold">{totalPages}</p>
                        <p className="text-xs text-gray-500 uppercase">Páginas</p>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg flex items-center">
                    <Link className="text-gray-400 mr-3" />
                    <div>
                        <p className="text-2xl font-bold">{totalRels}</p>
                        <p className="text-xs text-gray-500 uppercase">Relacionamentos</p>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg flex items-center">
                    <Settings className="text-gray-400 mr-3" />
                    <div>
                        <p className="text-2xl font-bold">{totalParams}</p>
                        <p className="text-xs text-gray-500 uppercase">Parâmetros de Campo</p>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg flex items-center">
                    <div className="text-gray-400 mr-3 font-bold text-xl">C</div>
                    <div>
                        <p className="text-2xl font-bold">{totalColumns}</p>
                        <p className="text-xs text-gray-500 uppercase">Total de Colunas</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;