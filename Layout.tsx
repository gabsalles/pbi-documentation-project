import React, { useState } from 'react';
import { FileText, Database, Calculator, GitMerge, LayoutDashboard, Printer, Download, Shield } from 'lucide-react';
import { generateStaticHtml } from "@/utils/htmlGenerator";
import { PBIModel } from './types'; 

interface LayoutProps {
  currentView: string;
  onChangeView: (view: string) => void;
  children: React.ReactNode;
  model?: PBIModel | null; 
}

const Layout: React.FC<LayoutProps> = ({ currentView, onChangeView, children, model }) => {
  const [exportTitle, setExportTitle] = useState('');
  const [exportColor, setExportColor] = useState('#1a6aff');
  const [exportLogo, setExportLogo] = useState<string | null>(null); // Nova memória para a imagem

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

  // Função para ler a imagem e transformá-la em Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setExportLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setExportLogo(null);
    }
  };

  const handleExportHtml = () => {
    if (!model) return;
    // Passamos também o logo para o motor HTML
    const htmlContent = generateStaticHtml(model, exportTitle, exportColor, exportLogo);
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
        <div className="p-6 border-b border-gray-100 flex items-center justify-center min-h-[88px]" style={{ backgroundColor: exportColor, backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.15) 100%)' }}>
          {exportLogo ? (
              <img src={exportLogo} alt="Logo da Empresa" className="max-h-12 max-w-[200px] object-contain drop-shadow-sm" />
          ) : (
              <h1 className="text-white text-xl font-bold tracking-wide">DAXILIZER <span className="font-light opacity-80">BI DOCS</span></h1>
          )}
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
                    ? 'text-white shadow-md' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-brand-secondary'
                }`}
                style={isActive ? { backgroundColor: exportColor, backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.15) 100%)' } : {}}
              >
                <Icon size={20} className={`mr-3 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-secondary'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-3 overflow-y-auto">
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

                     <div>
                         <label className="text-xs text-gray-600 block mb-1">Logo da Empresa</label>
                         <input 
                             type="file" 
                             accept="image/png, image/jpeg, image/svg+xml"
                             onChange={handleLogoUpload}
                             className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer"
                         />
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
                    className="flex items-center justify-center w-full py-2 text-white rounded-lg text-sm font-medium transition-colors hover:brightness-110 shadow-sm"
                    style={{ backgroundColor: exportColor, backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.15) 100%)' }}
                 >
                    <Download size={16} className="mr-2" /> Exportar HTML
                 </button>
             )}
             <p className="text-xs text-center text-gray-400 mt-4">v3.0.0 • Daxilizer 2026</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-brand-gray relative">
        {/* Print Header (Visível apenas ao imprimir) */}
        <div className="hidden print:flex p-8 border-b border-gray-300 mb-8 justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold" style={{ color: exportColor }}>
                    {exportTitle || 'Documentação Técnica Power BI'}
                </h1>
                <p className="text-gray-500">Relatório gerado automaticamente para: {model?.datasetName}</p>
            </div>
            {exportLogo && (
                <img src={exportLogo} alt="Logo" className="max-h-16 max-w-[200px] object-contain" />
            )}
        </div>

        <div className="max-w-7xl mx-auto w-full print:max-w-none">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;