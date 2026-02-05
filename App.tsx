import React, { useState } from 'react';
import { PBIModel, PBIPage } from './types';
import { parsePBIPData } from './services/pbipParser';
import Layout from './Layout';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import TablesView from './components/TablesView';
import MeasuresView from './components/MeasuresView';
import RelationshipsView from './components/RelationshipsView';
import ReportView from './components/ReportView';
import SecurityView from './components/SecurityView';

const App: React.FC = () => {
  const [model, setModel] = useState<PBIModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  const handleUpload = async (files: FileList) => {
    setLoading(true);
    try {
      const result = await parsePBIPData(files);
      setTimeout(() => {
        setModel(result);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error("Error parsing files", error);
      alert("Erro ao processar os arquivos. Certifique-se de que é uma pasta PBIP válida contendo arquivos TMDL e report.json.");
      setLoading(false);
    }
  };

  const handlePageUpdate = (index: number, updatedPage: PBIPage) => {
    setModel((prevModel) => {
      if (!prevModel) return null;
      const newPages = [...prevModel.pages];
      newPages[index] = updatedPage;
      return { ...prevModel, pages: newPages };
    });
  };

  if (!model) {
    return <FileUpload onUpload={handleUpload} loading={loading} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard model={model} />;
      case 'tables': return <TablesView tables={model.tables} />;
      case 'measures': return <MeasuresView model={model} />;
      case 'relationships': return <RelationshipsView model={model} />;
      case 'security': return <SecurityView model={model} />;
      case 'report': return <ReportView model={model} onUpdatePage={handlePageUpdate} />;
      default: return <Dashboard model={model} />;
    }
  };

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView} model={model}>
      {/* Print View: Renders ALL components stacked when printing */}
      <div className="hidden print:block space-y-8">
         <Dashboard model={model} />
         <div className="break-before-page"><TablesView tables={model.tables} /></div>
         <div className="break-before-page"><MeasuresView model={model} /></div>
         <div className="break-before-page"><RelationshipsView model={model} /></div>
         <div className="break-before-page"><SecurityView model={model} /></div>
         <div className="break-before-page"><ReportView model={model} onUpdatePage={() => {}} /></div>
      </div>
      
      {/* Screen View */}
      <div className="print:hidden h-full">
        {renderView()}
      </div>
    </Layout>
  );
};

export default App;