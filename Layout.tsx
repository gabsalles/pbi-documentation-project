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
  // Variáveis de Estado
  const [exportTitle, setExportTitle] = useState('');
  const [exportColor, setExportColor] = useState('#1a6aff');
  const [exportLogo, setExportLogo] = useState<string | null>(null);
  const [exportSubtitle, setExportSubtitle] = useState('');
  const [exportAuthor, setExportAuthor] = useState('');
  const [exportSummary, setExportSummary] = useState('');
  const [hideBranding, setHideBranding] = useState(false);
  const [exportClassification, setExportClassification] = useState('Uso Interno');
  const [exportSupport, setExportSupport] = useState('');

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
    const htmlContent = generateStaticHtml(model, exportTitle, exportColor, exportLogo, exportSubtitle, exportAuthor, exportSummary, exportClassification, exportSupport);
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
      <aside className="w-72 bg-white shadow-xl flex flex-col z-10 no-print"> {/* w-72 alargou um pouco a barra para caber os textos */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-center min-h-[88px]" style={{ backgroundColor: exportColor, backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.15) 100%)' }}>
          {exportLogo ? (
              <img src={exportLogo} alt="Logo da Empresa" className="max-h-12 max-w-[200px] object-contain drop-shadow-sm" />
          ) : (
              <h1 className="text-white text-xl font-bold tracking-wide">DAXILIZER <span className="font-light opacity-80">BI DOCS</span></h1>
          )}
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'text-white shadow-md font-semibold' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-brand-secondary font-medium'
                }`}
                style={isActive ? { backgroundColor: exportColor, backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.15) 100%)' } : {}}
              >
                <Icon size={20} className={`mr-3 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-secondary'}`} />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zona de Personalização (Com Scroll Próprio) */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 scrollbar-thin scrollbar-thumb-gray-200">
             {model && (
                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Personalização</p>
                     
                     <div>
                         <label className="text-xs text-gray-600 block mb-1">Título do Painel</label>
                         <input type="text" placeholder={model.datasetName} value={exportTitle} onChange={(e) => setExportTitle(e.target.value)} className="w-full text-sm p-1.5 border border-gray-300 rounded focus:outline-none focus:border-brand-secondary bg-white" />
                     </div>

                     <div>
                         <label className="text-xs text-gray-600 block mb-1">Subtítulo / Versão</label>
                         <input type="text" placeholder="Documentação Técnica" value={exportSubtitle} onChange={(e) => setExportSubtitle(e.target.value)} className="w-full text-sm p-1.5 border border-gray-300 rounded focus:outline-none focus:border-brand-secondary bg-white" />
                     </div>

                     <div>
                         <label className="text-xs text-gray-600 block mb-1">Autor / Responsável</label>
                         <input type="text" placeholder="Ex: João Silva" value={exportAuthor} onChange={(e) => setExportAuthor(e.target.value)} className="w-full text-sm p-1.5 border border-gray-300 rounded focus:outline-none focus:border-brand-secondary bg-white" />
                     </div>
                     <div>
                         <label className="text-xs text-gray-600 block mb-1">Contacto de Suporte</label>
                         <input type="text" placeholder="E-mail ou link de portal" value={exportSupport} onChange={(e) => setExportSupport(e.target.value)} className="w-full text-sm p-1.5 border border-gray-300 rounded focus:outline-none focus:border-brand-secondary bg-white" />
                     </div>
                     <div>
                         <label className="text-xs text-gray-600 block mb-1">Resumo Executivo</label>
                         <textarea rows={3} placeholder="Objetivo de negócio deste modelo..." value={exportSummary} onChange={(e) => setExportSummary(e.target.value)} className="w-full text-sm p-1.5 border border-gray-300 rounded focus:outline-none focus:border-brand-secondary bg-white resize-none"></textarea>
                     </div>
                     <div>
                         <label className="text-xs text-gray-600 block mb-1">Classificação de Dados</label>
                         <select 
                             value={exportClassification} 
                             onChange={(e) => setExportClassification(e.target.value)} 
                             className="w-full text-sm p-1.5 border border-gray-300 rounded focus:outline-none focus:border-brand-secondary bg-white cursor-pointer"
                         >
                             <option value="Público">🟢 Público</option>
                             <option value="Uso Interno">🔵 Uso Interno</option>
                             <option value="Confidencial">🟠 Confidencial</option>
                             <option value="Restrito">🔴 Restrito</option>
                         </select>
                     </div>
          
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-600 block mb-1">Cor</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={exportColor} onChange={(e) => setExportColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
                                <span className="text-[10px] font-mono text-gray-500 uppercase">{exportColor}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 block mb-1">Logo</label>
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-[10px] text-gray-500 file:mr-1 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer" />
                        </div>
                     </div>

                     <div className="pt-2 border-t border-gray-200 flex items-center gap-2">
                         <input type="checkbox" id="hideBranding" checked={hideBranding} onChange={(e) => setHideBranding(e.target.checked)} className="cursor-pointer rounded text-brand-secondary" />
                         <label htmlFor="hideBranding" className="text-xs text-gray-600 cursor-pointer">Ocultar marca Daxilizer</label>
                     </div>
                 </div>
             )}
        </div>

        {/* Botões de Ação Fixos no Fundo */}
        <div className="p-4 border-t border-gray-100 bg-white space-y-2">
             <button onClick={handlePrint} className="flex items-center justify-center w-full py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
                <Printer size={16} className="mr-2" /> Imprimir / PDF
             </button>
             {model && (
                 <button onClick={handleExportHtml} className="flex items-center justify-center w-full py-2 text-white rounded-lg text-sm font-medium transition-colors hover:brightness-110 shadow-sm" style={{ backgroundColor: exportColor, backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.15) 100%)' }}>
                    <Download size={16} className="mr-2" /> Exportar HTML
                 </button>
             )}
             {/* O rodapé de versão agora respeita a caixa de seleção */}
             {!hideBranding && <p className="text-[10px] text-center text-gray-400 mt-2 uppercase tracking-wide">v3.0.0 • Daxilizer 2026</p>}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-brand-gray relative">
        {/* Print Header atualizado com as novas informações */}
        {/* Print Header atualizado com as novas informações */}
        <div className="hidden print:flex p-8 border-b border-gray-300 mb-8 justify-between items-start bg-white">
            <div>
                <h1 className="text-3xl font-bold" style={{ color: exportColor }}>
                    {exportTitle || 'Documentação Técnica Power BI'}
                </h1>
                <p className="text-gray-600 text-lg mt-1 font-medium">{exportSubtitle || 'Documentação Técnica de Modelo Semântico'}</p>
                <div className="text-gray-400 mt-3 text-sm flex gap-4">
                    <span>Gerado para: <b>{model?.datasetName}</b></span>
                    {exportAuthor && <span>| &nbsp; Responsável: <b>{exportAuthor}</b></span>}
                    {exportSupport && <span>| &nbsp; Suporte: <b>{exportSupport}</b></span>}
                </div>
            </div>
            <div className="flex flex-col items-end gap-3">
                {exportLogo && (
                    <img src={exportLogo} alt="Logo" className="max-h-16 max-w-[200px] object-contain" />
                )}
                {exportClassification && (
                    <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border shadow-sm ${
                        exportClassification === 'Público' ? 'bg-green-50 text-green-700 border-green-200' :
                        exportClassification === 'Confidencial' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        exportClassification === 'Restrito' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                        {exportClassification}
                    </div>
                )}
            </div>
        </div>

        {/* Resumo Executivo para a Impressão em PDF */}
        <div className="hidden print:block max-w-7xl mx-auto w-full px-8 mb-6">
            {exportSummary && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Resumo Executivo</h3>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{exportSummary}</p>
                </div>
            )}
        </div>

        <div className="max-w-7xl mx-auto w-full print:max-w-none print:px-0">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;