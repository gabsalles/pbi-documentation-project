import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onUpload: (files: FileList) => void;
  loading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, loading }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Note: Drag and drop folders is restricted in some browsers without webkitGetAsEntry
      // We recommend using the button for folders
      alert("Para melhor compatibilidade com estruturas de pasta complexas, por favor utilize o botão 'Selecionar Pasta PBIP'.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-brand-gray">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold text-brand-primary mb-2 font-sans tracking-tight">
          Documentador Power BI
        </h1>
        <p className="text-gray-600 mb-8">
          Selecione a pasta raiz do seu projeto <strong>.PBIP</strong> para gerar a documentação completa.
        </p>

        <div
          className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${
            dragActive ? "border-brand-primary bg-blue-50" : "border-gray-300 bg-white"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {loading ? (
             <div className="flex flex-col items-center animate-pulse">
                <Loader2 size={48} className="text-brand-primary animate-spin mb-4" />
                <p className="text-brand-dark font-medium">Processando arquivos TMDL...</p>
             </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="bg-blue-100 p-4 rounded-full mb-4">
                 <Upload size={32} className="text-brand-primary" />
              </div>
              <p className="text-lg font-semibold text-brand-dark mb-2">
                Arraste ou clique para carregar
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Selecione a pasta raiz contendo o arquivo .pbip
              </p>
              
              <button
                onClick={() => inputRef.current?.click()}
                className="bg-brand-primary hover:bg-brand-secondary text-white font-medium py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105"
              >
                Selecionar Pasta PBIP
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleChange}
            // @ts-ignore
            webkitdirectory="" 
            directory="" 
            multiple
          />
        </div>
        
        <div className="mt-8 grid grid-cols-3 gap-4 text-left">
           <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-brand-primary font-bold text-xl mb-1">Medidas</div>
              <p className="text-xs text-gray-500">Extração de código DAX e linhagem de dependências.</p>
           </div>
           <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-brand-primary font-bold text-xl mb-1">Tabelas</div>
              <p className="text-xs text-gray-500">Documentação de fonte M, colunas e relacionamentos.</p>
           </div>
           <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-brand-primary font-bold text-xl mb-1">Páginas</div>
              <p className="text-xs text-gray-500">Mapeamento de visuais e campos utilizados.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;