# Documentador Automático para Power BI (PBIP)

Uma ferramenta web moderna desenvolvida para gerar documentação técnica automática, interativa e exportável para projetos do Power BI salvos no formato **PBIP (Power BI Project)**.

---

## Visão Geral

O Documentador Automático para Power BI elimina o trabalho manual de documentar modelos semânticos e relatórios.  
A aplicação lê os metadados brutos do projeto — **TMDL e JSON** — e gera uma interface navegável com:

- Dicionário de dados  
- Catálogo e linhagem de medidas DAX  
- Diagramas de relacionamento  
- Estrutura completa do relatório  
- Análise de segurança (RLS)  
- Exportação HTML autocontida  

Todo o processamento ocorre **localmente no navegador**, sem envio de dados para servidores externos.

---

## Objetivo

- Automatizar a documentação técnica de projetos Power BI  
- Facilitar auditorias, handovers, governança e entendimento do modelo  
- Reduzir riscos operacionais e dependência de documentação manual  
- Padronizar a entrega técnica para stakeholders, times de dados e compliance  

---

## Como Executar Localmente

### Pré-requisitos
- Node.js (versão recomendada: LTS)

### Instalação das dependências
```bash
npm install
```

### Execução em modo desenvolvimento
```bash
npm run dev
```

### Acesso à aplicação
O terminal exibirá o endereço local, normalmente:
```
http://localhost:3000
```

---

## Como Importar Projetos Power BI

### Importante
Esta ferramenta **não lê arquivos `.pbix` diretamente**.  
Ela funciona exclusivamente com projetos no formato **PBIP**.

### Passo 1: Converter o relatório para PBIP

1. Abra o relatório no **Power BI Desktop**
2. Vá em **Arquivo > Salvar Como**
3. Selecione **Arquivos de projeto do Power BI (*.pbip)**
4. Salve o projeto

### Passo 2: Carregar no Documentador

1. Abra a aplicação
2. Clique em **Selecionar Pasta PBIP**
3. Selecione a **pasta raiz** do projeto
4. Conceda permissão de leitura ao navegador
5. O processamento será iniciado automaticamente

---

## Tecnologias Utilizadas

- Frontend: React 19, TypeScript, Vite  
- Estilização: Tailwind CSS  
- Ícones: Lucide React  
- Gráficos: Recharts  
- Diagramas: Mermaid.js  

---

## Licença

Defina aqui a licença do projeto.
