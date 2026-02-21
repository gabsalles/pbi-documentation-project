import React, { useState } from 'react';
import { FileText, Database, Calculator, GitMerge, LayoutDashboard, Printer, Download, Shield } from 'lucide-react';
import { generateStaticHtml } from "@/utils/htmlGenerator";
import { PBIModel } from './types'; // Ajustado para apontar para a raiz

interface LayoutProps {
  currentView: string;
  onChangeView: (view: string) => void;
  children: React.ReactNode;
  model?: PBIModel | null; 
}

const Layout: React.FC<LayoutProps> = ({ currentView, onChangeView, children, model }) => {
  // 1. Criamos a "memória" para guardar o título e a cor escolhidos
  const [exportTitle, setExportTitle] = useState('');
  const [exportColor, setExportColor] = useState('#1a6aff');

  const navItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'tables', label: 'Tabelas', icon: Database },
    { id: 'measures', label: 'Medidas DAX', icon: Calculator },
    { id: 'relationships', label: 'Relacionamentos', icon: GitMerge },
    { id: 'security', label: 'Segurança (RLS)', icon: Shield },
    { id: 'report', label: 'Relatório', icon: FileText },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExportHtml = () => {
    if (!model) return;
    // 2. Passamos o título e a cor para o motor gerar o HTML
    const htmlContent = generateStaticHtml(model, exportTitle, exportColor);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Documentacao_${exportTitle || model.datasetName || 'PBIP'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-brand-gray overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-xl flex flex-col z-10 no-print">
        <div className="p-6 border-b border-gray-100 flex items-center justify-center bg-brand-primary">
          <h1 className="text-white text-xl font-bold tracking-wide">DAXILIZER <span className="font-light opacity-80">BI DOCS</span></h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-brand-secondary'
                }`}
              >
                <Icon size={20} className={`mr-3 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-secondary'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 3. A zona inferior da barra lateral com os campos de personalização */}
        <div className="p-4 border-t border-gray-100 space-y-3">
             {model && (
                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3 mb-2">
                     <p className="text-xs font-semibold text-gray-500 uppercase">Personalizar Relatório</p>
                     <div>
                         <label className="text-xs text-gray-600 block mb-1">Título Principal</label>
                         <input 
                             type="text" 
                             placeholder={model.datasetName}
                             value={exportTitle}
                             onChange={(e) => setExportTitle(e.target.value)}
                             className="w-full text-sm p-1.5 border border-gray-300 rounded focus:outline-none focus:border-brand-secondary bg-white"
                         />
                     </div>
                     <div>
                         <label className="text-xs text-gray-600 block mb-1">Cor de Destaque</label>
                         <div className="flex items-center gap-2">
                             <input 
                                 type="color" 
                                 value={exportColor}
                                 onChange={(e) => setExportColor(e.target.value)}
                                 className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                             />
                             <span className="text-xs font-mono text-gray-500 uppercase">{exportColor}</span>
                         </div>
                     </div>
                 </div>
             )}

             <button 
                onClick={handlePrint}
                className="flex items-center justify-center w-full py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
             >
                <Printer size={16} className="mr-2" /> Imprimir / PDF
             </button>
             {model && (
                 <button 
                    onClick={handleExportHtml}
                    className="flex items-center justify-center w-full py-2 bg-brand-secondary text-white rounded-lg hover:bg-brand-primary text-sm font-medium transition-colors"
                 >
                    <Download size={16} className="mr-2" /> Exportar HTML
                 </button>
             )}
             <p className="text-xs text-center text-gray-400 mt-4">v3.0.0 • Daxilizer 2026</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-brand-gray relative">
        {/* 4. Print Header (Visível apenas ao imprimir) usando as novas variáveis */}
        <div className="hidden print:block p-8 border-b border-gray-300 mb-8">
            <h1 className="text-3xl font-bold" style={{ color: exportColor }}>
                {exportTitle || 'Documentação Técnica Power BI'}
            </h1>
            <p className="text-gray-500">Relatório gerado automaticamente para: {model?.datasetName}</p>
        </div>

        <div className="max-w-7xl mx-auto w-full print:max-w-none">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;