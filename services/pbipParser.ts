import { PBIModel, PBITable, PBIRelationship, PBIPage, PBIVisual, PBIColumn, PBIMeasure, PBIParameter, PBIRole, PBIBookmark, PBIVisualAction } from '../types';

// --- HELPER CLASSES & TYPES ---

class LineReader {
  lines: string[];
  index: number = 0;

  constructor(content: string) {
    this.lines = content.split(/\r?\n/);
  }

  hasNext(): boolean {
    return this.index < this.lines.length;
  }

  peek(): string {
    return this.lines[this.index];
  }

  next(): string {
    return this.lines[this.index++];
  }

  currentLineIndent(): number {
    if (!this.hasNext()) return 0;
    const line = this.peek();
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }
}

const cleanName = (name: string) => {
  if (!name) return '';
  return name.trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '');
};

const extractLiteralValue = (obj: any): string | null => {
    if (!obj) return null;
    const val = obj?.expr?.Literal?.Value ?? obj?.Literal?.Value;
    
    if (val !== undefined) {
        let str = String(val).replace(/^'|'$/g, "").replace(/^"|"$/g, "");
        if (str.match(/^\d+[DL]$/)) {
            str = str.slice(0, -1);
        }
        return str;
    }
    return null;
};

// --- MAIN EXPORT ---

export const parsePBIPData = async (files: FileList): Promise<PBIModel> => {
  const model: PBIModel = {
    tables: [],
    parameters: [],
    relationships: [],
    pages: [],
    roles: [],
    bookmarks: [],
    timestamp: new Date().toISOString(),
    datasetName: 'Desconhecido'
  };

  const fileArray = Array.from(files);
  
  const tableFiles: File[] = [];
  let relationshipsFile: File | undefined;
  let expressionsFile: File | undefined;
  let reportJsonFile: File | undefined;
  let modelTmdlFile: File | undefined;
  let modelBimFile: File | undefined; // Support for legacy/JSON models
  
  const pageFiles = new Map<string, File>(); 
  const visualFiles = new Map<string, File[]>(); 

  for (const f of fileArray) {
    const path = f.webkitRelativePath || f.name;
    const fileName = f.name;

    if (fileName.endsWith('.tmdl')) {
        if (fileName === 'relationships.tmdl') relationshipsFile = f;
        else if (fileName === 'expressions.tmdl') expressionsFile = f;
        else if (fileName === 'model.tmdl') modelTmdlFile = f; 
        else if (fileName === 'database.tmdl' || fileName.includes('culture')) { /* ignore */ }
        else {
            // Initial filename check, but we do strict check in content parser too
            if (!fileName.startsWith('LocalDateTable_') && !fileName.startsWith('DateTableTemplate_')) {
                tableFiles.push(f);
            }
        }
    }
    
    // Catch model.bim
    if (fileName === 'model.bim' || fileName.endsWith('.bim')) {
        modelBimFile = f;
    }

    if (fileName === 'report.json') {
        reportJsonFile = f;
    }
    
    if (fileName === 'page.json' && path.includes('/pages/')) {
        const parts = path.split('/');
        const pageId = parts[parts.length - 2]; 
        pageFiles.set(pageId, f);
    }

    if (fileName === 'visual.json' && path.includes('/visuals/')) {
        const parts = path.split('/');
        if (parts.length >= 4 && parts[parts.length - 3] === 'visuals') {
             const pageId = parts[parts.length - 4];
             if (!visualFiles.has(pageId)) {
                 visualFiles.set(pageId, []);
             }
             visualFiles.get(pageId)?.push(f);
        }
    }
  }

  // --- PARSING STRATEGY ---
  // 1. If model.bim exists, it is the source of truth (JSON format)
  // 2. Else, use TMDL files

  if (modelBimFile) {
      const text = await modelBimFile.text();
      try {
          parseModelBim(text, model);
      } catch (e) {
          console.error("Error parsing model.bim", e);
      }
  } else {
      // TMDL Parsing
      if (tableFiles.length > 0) {
        const pathParts = tableFiles[0].webkitRelativePath.split('/');
        const datasetFolder = pathParts.find(p => p.endsWith('.Dataset') || p.endsWith('.SemanticModel'));
        if (datasetFolder) {
          model.datasetName = datasetFolder.replace('.Dataset', '').replace('.SemanticModel', '');
        }
      }

      for (const file of tableFiles) {
        const text = await file.text();
        if (text.includes('table ')) { // Loose check first
            const table = parseTmdlTableContent(text, (file as any).path); // O (file as any).path pega o caminho real no Electron
            if (table) model.tables.push(table);
        }
      }

      if (expressionsFile) {
        const text = await expressionsFile.text();
        // Passe o path como segundo argumento
        const { parameters, sharedTables } = parseExpressionsTmdl(text, (expressionsFile as any).path); 
        model.parameters.push(...parameters);
        if (sharedTables.length > 0) {
        model.tables.push(...sharedTables);
        }
    }

      if (relationshipsFile) {
        const text = await relationshipsFile.text();
        model.relationships = parseRelationshipsTmdl(text);
      }

      if (modelTmdlFile) {
          const text = await modelTmdlFile.text();
          model.roles = parseRolesTmdl(text);
      }
  }

  // Report Parsing (Universal)
  if (reportJsonFile) {
      try {
          const text = await reportJsonFile.text();
          const reportJson = JSON.parse(text);
          
          if (reportJson.bookmarks) {
              reportJson.bookmarks.forEach((b: any) => {
                  model.bookmarks.push({ name: b.name, displayName: b.displayName });
              });
          } else if (reportJson.config) {
             try {
                const config = JSON.parse(reportJson.config);
                if (config.bookmarks) {
                    config.bookmarks.forEach((b: any) => {
                        model.bookmarks.push({ name: b.name, displayName: b.displayName });
                    });
                }
             } catch {}
          }

          if (pageFiles.size === 0) {
              model.pages = parseLegacyReportJson(text);
          }
      } catch (e) {
          console.error("Failed to parse report.json", e);
      }
  }

  if (pageFiles.size > 0) {
      for (const [pageId, pFile] of pageFiles) {
          try {
            const pageText = await pFile.text();
            const pageJson = JSON.parse(pageText);
            
            const visuals: PBIVisual[] = [];
            const vFiles = visualFiles.get(pageId) || [];
            
            for (const vFile of vFiles) {
                try {
                    const vText = await vFile.text();
                    const vJson = JSON.parse(vText);
                    const visualConfig = vJson.visual || vJson; 
                    const visual = parseSingleVisualJson(visualConfig, vFile.name);
                    if (visual) visuals.push(visual);
                } catch(e) { console.warn("Error parsing visual", vFile.webkitRelativePath); }
            }
            
            const hiddenFilters = extractFilters(pageJson.filter);

            model.pages.push({
                name: pageJson.name || pageId,
                displayName: pageJson.displayName || pageId,
                visuals: visuals,
                hiddenFilters
            });
          } catch(e) { console.error("Error parsing page", pFile.webkitRelativePath); }
      }
  }

  analyzeMeasureDependencies(model);
  analyzeReportUsage(model);

  return model;
};

// --- JSON PARSER (MODEL.BIM) ---

const parseModelBim = (content: string, model: PBIModel) => {
    const json = JSON.parse(content);
    const modelJson = json.model || json;
    
    // Dataset Name
    model.datasetName = modelJson.name || 'Dataset';

    // Tables
    if (modelJson.tables) {
        modelJson.tables.forEach((t: any) => {
            // Ignore System Tables
            if (t.name.startsWith('LocalDateTable_') || t.name.startsWith('DateTableTemplate_')) return;

            // Partitions (Source Code)
            const partitions: any[] = [];
            let sourceExpr = '';
            let mode = 'Import';
            
            if (t.partitions) {
                t.partitions.forEach((p: any) => {
                    let source = '';
                    if (p.source && p.source.expression) {
                        source = Array.isArray(p.source.expression) 
                            ? p.source.expression.join('\n') 
                            : p.source.expression;
                    }
                    partitions.push({
                        name: p.name,
                        source: source,
                        mode: p.mode || 'Import'
                    });
                    if (source) sourceExpr = source;
                    if (p.mode) mode = p.mode;
                });
            }

            // Columns
            const columns: PBIColumn[] = [];
            if (t.columns) {
                t.columns.forEach((c: any) => {
                    columns.push({
                        name: c.name,
                        dataType: c.dataType || 'unknown',
                        isHidden: c.isHidden === true,
                        description: c.description,
                        sourceColumn: c.sourceColumn,
                        expression: c.expression, // For calculated columns
                        summarizeBy: c.summarizeBy,
                        isUsedInReport: false
                    });
                });
            }

            // Measures
            const measures: PBIMeasure[] = [];
            if (t.measures) {
                t.measures.forEach((m: any) => {
                    let expression = m.expression;
                    if (Array.isArray(expression)) expression = expression.join('\n');
                    
                    // Annotations
                    const annotations: Record<string, string> = {};
                    if (m.annotations) {
                        m.annotations.forEach((a: any) => {
                            annotations[a.name] = a.value;
                        });
                    }

                    measures.push({
                        name: m.name,
                        expression: expression || '',
                        description: m.description,
                        formatString: m.formatString,
                        lineageTag: m.lineageTag,
                        annotations: annotations,
                        dependencies: [],
                        isUsedInReport: false,
                        parentTable: t.name
                    });
                });
            }

            // Determine Type
            let tableType: 'Import' | 'DirectQuery' | 'Calculated' | 'Unknown' = 'Import';
            let isParameter = false;
            let isUDF = false;
            
            if (mode === 'DirectQuery') tableType = 'DirectQuery';
            
            // Check for Calculated Table
            const partitionSourceType = t.partitions?.[0]?.source?.type;
            if (partitionSourceType === 'calculated') tableType = 'Calculated';

            // Heuristics for special tables
            if (sourceExpr.includes('NAMEOF') && sourceExpr.includes('IsParameterQuery=true')) isParameter = true;
            if (sourceExpr.trim().startsWith('(') || sourceExpr.includes('=>')) isUDF = true;

            model.tables.push({
                name: t.name,
                columns,
                measures,
                partitions,
                sourceExpression: sourceExpr,
                description: t.description,
                type: tableType,
                isCalculationGroup: t.calculationGroup !== undefined,
                isParameter,
                isUDF
            });
        });
    }

    // Relationships
    if (modelJson.relationships) {
        modelJson.relationships.forEach((r: any) => {
            // Strict Filter for relationships to Auto Date/Time tables
            if (r.fromTable.startsWith('LocalDateTable_') || r.toTable.startsWith('LocalDateTable_') || 
                r.fromTable.startsWith('DateTableTemplate_') || r.toTable.startsWith('DateTableTemplate_')) {
                return;
            }

            model.relationships.push({
                fromTable: r.fromTable,
                fromColumn: r.fromColumn,
                toTable: r.toTable,
                toColumn: r.toColumn,
                cardinality: r.cardinality || 'Many', 
                crossFilteringBehavior: r.crossFilteringBehavior || 'Automatic',
                isActive: r.isActive !== false 
            });
        });
    }

    // Roles (RLS)
    if (modelJson.roles) {
        modelJson.roles.forEach((r: any) => {
            const perms: {table: string, expression: string}[] = [];
            if (r.tablePermissions) {
                r.tablePermissions.forEach((tp: any) => {
                    let expr = tp.filterExpression;
                    if (Array.isArray(expr)) expr = expr.join('\n');
                    perms.push({
                        table: tp.name,
                        expression: expr
                    });
                });
            }
            model.roles.push({
                name: r.name,
                modelPermission: r.modelPermission,
                tablePermissions: perms
            });
        });
    }
};

// --- TMDL PARSERS (UPDATED WITH /// SUPPORT) ---

const parseTmdlTableContent = (content: string, filePath?: string): PBITable | null => {
  const reader = new LineReader(content);
  let table: PBITable = {
    name: '', columns: [], measures: [], partitions: [], type: 'Import', description: '',
    isCalculationGroup: false, isParameter: false, isUDF: false,
    sourceFilePath: filePath // <--- Adicione isso
  };

  // 1. Parse Pre-Table Header (for Table Description)
  let pendingDescription = '';
  
  while (reader.hasNext()) {
      const line = reader.peek().trim();
      
      // Capture Documentation Comments (///)
      if (line.startsWith('///')) {
          const desc = line.substring(3).trim();
          pendingDescription = pendingDescription ? pendingDescription + '\n' + desc : desc;
          reader.next();
      } 
      // Skip Standard Comments (//) but don't break the loop
      else if (line.startsWith('//')) {
          reader.next(); 
      }
      // Empty lines usually break description association, but for table headers we might be lenient
      // or we can stick to C# rules where blank lines break it. Let's break on blank line.
      else if (!line) {
          pendingDescription = ''; // Reset
          reader.next();
      }
      else {
          break; // Hit code (likely 'table ...')
      }
  }

  // 2. Parse Table Definition
  if (!reader.hasNext()) return null;
  const headerLine = reader.next().trim();
  const tableMatch = headerLine.match(/^table\s+(.+)/);
  if (!tableMatch) return null;
  
  table.name = cleanName(tableMatch[1]);
  
  // Strict filter for Auto Date/Time tables
  if (table.name.startsWith('LocalDateTable_') || table.name.startsWith('DateTableTemplate_')) {
      return null;
  }

  if (pendingDescription) {
      table.description = pendingDescription;
      pendingDescription = ''; // Reset for internal items
  }

  let currentSection: 'column' | 'measure' | 'partition' | 'calculationItem' | 'none' = 'none';
  let currentItem: any = null;
  let currentBaseIndent = 0;

  // 3. Parse Body
  while (reader.hasNext()) {
    const line = reader.peek();
    const indent = reader.currentLineIndent();
    const trimmed = line.trim();

    // -- HANDLE DESCRIPTIONS (///) --
    if (trimmed.startsWith('///')) {
        const desc = trimmed.substring(3).trim();
        pendingDescription = pendingDescription ? pendingDescription + '\n' + desc : desc;
        reader.next();
        continue;
    }

    // -- HANDLE COMMENTS (//) --
    if (trimmed.startsWith('//')) {
      reader.next();
      continue;
    }

    // -- HANDLE EMPTY LINES --
    if (!trimmed) {
      pendingDescription = ''; // Blank lines break documentation association
      reader.next();
      continue;
    }
    
    if (trimmed.startsWith('calculationGroup')) {
        table.isCalculationGroup = true;
        reader.next();
        continue;
    }

    if (trimmed.startsWith('column ')) {
        finalizeItem(table, currentSection, currentItem);
        currentSection = 'column';
        currentItem = { 
            name: cleanName(trimmed.substring(7)), 
            dataType: 'string', 
            isHidden: false, 
            isUsedInReport: false,
            description: pendingDescription, // Apply accumulated description
            sourceFilePath: filePath // <--- ADICIONE ESTA LINHA
        };
        pendingDescription = ''; // Consume description
        currentBaseIndent = indent;
        reader.next();
    } 
    else if (trimmed.startsWith('measure ') || trimmed.startsWith('calculationItem ')) {
        finalizeItem(table, currentSection, currentItem);
        const isCalcItem = trimmed.startsWith('calculationItem ');
        currentSection = isCalcItem ? 'calculationItem' : 'measure';
        currentBaseIndent = indent;
        
        const prefixLen = isCalcItem ? 16 : 8;
        const eqIndex = trimmed.indexOf('=');
        let name = '', expr = '';
        if (eqIndex > -1) {
            name = cleanName(trimmed.substring(prefixLen, eqIndex).trim());
            expr = trimmed.substring(eqIndex + 1).trim();
        } else {
            name = cleanName(trimmed.substring(prefixLen));
        }
        currentItem = {
            name, 
            expression: expr, 
            dependencies: [], 
            isUsedInReport: false, 
            parentTable: table.name,
            isCalculationItem: isCalcItem,
            annotations: {},
            description: pendingDescription, // Apply accumulated description
            sourceFilePath: filePath // <--- ADICIONE ESTA LINHA
        };
        pendingDescription = ''; // Consume description
        reader.next();
    }
    else if (trimmed.startsWith('partition ')) {
        finalizeItem(table, currentSection, currentItem);
        currentSection = 'partition';
        currentBaseIndent = indent;
        const eqIndex = trimmed.indexOf('=');
        let name = '';
        if (eqIndex > -1) {
            name = cleanName(trimmed.substring(10, eqIndex).trim());
        } else {
            name = cleanName(trimmed.substring(10));
        }
        currentItem = { name, source: '', mode: 'Import' };
        // Partitions generally don't have user-facing descriptions in the same way, but could support it.
        pendingDescription = ''; 
        reader.next();
    }
    else {
        // Properties Processing
        if (currentSection !== 'none' && currentItem) {
            let processed = false;
            
            // Property Detection (Support both : and = for TMDL/JSON variations)
            const propMatch = trimmed.match(/^(\w+)\s*[:=]\s*(.*)/);
            if (propMatch) {
                const key = propMatch[1];
                const value = propMatch[2];
                
                // Whitelist valid properties
                let isKnownProperty = false;
                const measureProps = ['formatString', 'lineageTag', 'description', 'displayFolder', 'kpi', 'dataCategory', 'state', 'changedProperty', 'extendedProperties'];
                const colProps = ['dataType', 'isHidden', 'sourceColumn', 'summarizeBy', 'formatString', 'lineageTag', 'description', 'displayFolder', 'dataCategory', 'changedProperty'];
                const partitionProps = ['mode']; // 'source' is handled separately below

                if (currentSection === 'measure' || currentSection === 'calculationItem') {
                    if (measureProps.includes(key)) isKnownProperty = true;
                } else if (currentSection === 'column') {
                    if (colProps.includes(key)) isKnownProperty = true;
                } else if (currentSection === 'partition') {
                    if (partitionProps.includes(key)) isKnownProperty = true;
                }

                if (isKnownProperty) {
                    if (key === 'formatString') { currentItem.formatString = value.replace(/^"|"$/g, ''); }
                    else if (key === 'lineageTag') { currentItem.lineageTag = value.replace(/^"|"$/g, ''); }
                    else if (key === 'description') { 
                        currentItem.description = value.replace(/^"|"$/g, ''); 
                    }
                    else if (key === 'dataType' && currentSection === 'column') { currentItem.dataType = value; }
                    else if (key === 'isHidden' && currentSection === 'column') { currentItem.isHidden = value.trim() === 'true'; }
                    else if (key === 'sourceColumn' && currentSection === 'column') { currentItem.sourceColumn = cleanName(value); }
                    else if (key === 'summarizeBy' && currentSection === 'column') { currentItem.summarizeBy = value; }
                    else if (key === 'mode' && currentSection === 'partition') { currentItem.mode = value; }
                    
                    processed = true;
                }
            }
            
            if (processed) {
                reader.next();
                continue;
            }

            // Annotations
            if (trimmed.startsWith('annotation ')) {
                 const annoMatch = trimmed.match(/^annotation\s+['"]?([^'"]+)['"]?\s*=\s*(.*)/);
                 if (annoMatch && (currentSection === 'measure' || currentSection === 'calculationItem') && currentItem) {
                     if (!currentItem.annotations) currentItem.annotations = {};
                     currentItem.annotations[annoMatch[1]] = annoMatch[2].replace(/^"|"$/g, '');
                 }
                 reader.next();
                 continue;
            }

            // Source (Partition) - Fixed Logic
            if (trimmed.startsWith('source =')) {
                if (currentSection === 'partition') {
                    // Extract inline source if available (e.g. source = expression)
                    const sourceMatch = trimmed.match(/^source\s*=\s*(.*)/);
                    let initialSource = '';
                    if (sourceMatch && sourceMatch[1]) {
                        initialSource = sourceMatch[1].trim();
                    }
                    
                    reader.next(); // Consume 'source =' line
                    
                    // Capture following indented block
                    const multiLine = extractMultiLineString(reader, indent + 1);
                    
                    // Combine inline + block
                    if (initialSource && multiLine) {
                        currentItem.source = initialSource + '\n' + multiLine;
                    } else if (initialSource) {
                        currentItem.source = initialSource;
                    } else {
                        currentItem.source = multiLine.trim(); // Trim leading newline from utility
                    }
                } else {
                    reader.next();
                }
                continue;
            }

            // Expression Continuation (Measure/CalcItem)
            if (currentSection === 'measure' || currentSection === 'calculationItem') {
                if (currentItem) {
                    let lineToAdd = trimmed;
                    if (indent > currentBaseIndent) {
                         const relativeIndent = indent - currentBaseIndent;
                         lineToAdd = ' '.repeat(relativeIndent) + trimmed;
                    }
                    
                    if (currentItem.expression) {
                        currentItem.expression += '\n' + lineToAdd;
                    } else {
                        currentItem.expression = lineToAdd;
                    }
                }
                reader.next();
                continue;
            }

            reader.next();
        } else {
            // Not in a section, just consume
            reader.next();
        }
    }
  }
  
  finalizeItem(table, currentSection, currentItem);
  
  if (table.partitions.length > 0) {
      table.sourceExpression = table.partitions[0].source;
      const mode = table.partitions[0].mode?.toLowerCase();
      
      if (mode === 'calculated' && table.sourceExpression.includes('NAMEOF')) {
          table.isParameter = true;
          table.type = 'Calculated';
      }
      else if (mode === 'import' && (table.sourceExpression.trim().startsWith('(') || table.sourceExpression.includes('=>'))) {
          table.isUDF = true;
          table.type = 'Import';
      }
      else if (mode === 'calculated') {
          table.type = 'Calculated';
      }
      else {
          table.type = mode === 'directquery' ? 'DirectQuery' : 'Import';
      }
  }
  
  return table;
};

const parseRolesTmdl = (content: string): PBIRole[] => {
    const roles: PBIRole[] = [];
    const reader = new LineReader(content);
    
    let currentRole: PBIRole | null = null;
    
    while(reader.hasNext()) {
        const line = reader.peek().trim();
        const indent = reader.currentLineIndent();
        
        if (line.startsWith('role ')) {
            if (currentRole) roles.push(currentRole);
            const name = cleanName(line.substring(5));
            currentRole = { name, tablePermissions: [] };
            reader.next();
        } else if (currentRole && line.startsWith('tablePermission ')) {
            const eqIndex = line.indexOf('=');
            if (eqIndex > -1) {
                const tableName = cleanName(line.substring(16, eqIndex).trim());
                let expression = line.substring(eqIndex + 1).trim();
                reader.next();
                expression += extractMultiLineString(reader, indent + 1);
                currentRole.tablePermissions.push({ table: tableName, expression });
            } else {
                reader.next();
            }
        } else if (currentRole && line.startsWith('modelPermission:')) {
            currentRole.modelPermission = line.split(':')[1].trim();
            reader.next();
        } else {
            reader.next();
        }
    }
    if (currentRole) roles.push(currentRole);
    return roles;
};

const extractMultiLineString = (reader: LineReader, minIndent: number): string => {
    let buffer: string[] = [];
    while (reader.hasNext()) {
        const indent = reader.currentLineIndent();
        const line = reader.peek();
        if (line.trim().length > 0 && indent < minIndent) break;
        buffer.push(reader.next().trim()); // Keep indentation? Usually trimming is safer for display, but for code structure... 
        // TMDL blocks usually strip base indentation. The LineReader.next() returns raw line.
        // We trim here for simplicity, but strictly we should keep relative indent.
    }
    return buffer.length > 0 ? '\n' + buffer.join('\n') : '';
};

const finalizeItem = (table: PBITable, section: string, item: any) => {
    if (!item) return;
    if (section === 'column') table.columns.push(item);
    if (section === 'measure' || section === 'calculationItem') table.measures.push(item);
    if (section === 'partition') table.partitions.push(item);
};

const parseExpressionsTmdl = (content: string, filePath?: string): { parameters: PBIParameter[], sharedTables: PBITable[] } => {    const parameters: PBIParameter[] = [];
    const sharedTables: PBITable[] = [];
    const blocks = content.split(/\n(?=table\s)/); 
    
    blocks.forEach(block => {
        const tbl = parseTmdlTableContent(block, filePath); // <--- PASSE O filePath AQUI
        if (tbl) {
            const isParameter = tbl.sourceExpression?.includes('IsParameterQuery=true');
            if (isParameter) {
                parameters.push({
                    name: tbl.name,
                    type: 'Any',
                    expression: tbl.sourceExpression || '',
                    description: tbl.description
                });
            } else {
                tbl.type = 'Import';
                sharedTables.push(tbl);
            }
        }
    });
    return { parameters, sharedTables };
};

const parseRelationshipsTmdl = (content: string): PBIRelationship[] => {
    const rels: PBIRelationship[] = [];
    const reader = new LineReader(content);

    while(reader.hasNext()) {
        const line = reader.next().trim();
        if (line.startsWith('relationship ')) {
            let fromCol = '', toCol = '', cardinality = 'Many', crossFilter = 'OneDirection', isActive = true;

            while(reader.hasNext()) {
                const nextLine = reader.peek().trim();
                if (reader.currentLineIndent() === 0 && nextLine) break;
                if (!nextLine && !reader.hasNext()) break;

                const propLine = reader.next().trim();
                const fromMatch = propLine.match(/fromColumn:\s*(?:'([^']+)'|(\S+))\.(\[.+?\]|.+)/);
                if (fromMatch) fromCol = `${cleanName(fromMatch[1] || fromMatch[2])}.${fromMatch[3].replace(/^\[|\]$/g, '')}`;
                const toMatch = propLine.match(/toColumn:\s*(?:'([^']+)'|(\S+))\.(\[.+?\]|.+)/);
                if (toMatch) toCol = `${cleanName(toMatch[1] || toMatch[2])}.${toMatch[3].replace(/^\[|\]$/g, '')}`;

                if (propLine.includes('isActive: false')) isActive = false;
                if (propLine.includes('cardinality: one')) cardinality = 'One';
                if (propLine.includes('crossFilteringBehavior: bothDirections')) crossFilter = 'BothDirections';
            }

            if (fromCol && toCol) {
                const [fTable, fCol] = fromCol.split(/\.(.+)/);
                const [tTable, tCol] = toCol.split(/\.(.+)/);
                
                // Strict Check for Auto Date/Time tables
                const isSystemTable = fTable.startsWith('LocalDateTable_') || tTable.startsWith('LocalDateTable_') || 
                                    fTable.startsWith('DateTableTemplate_') || tTable.startsWith('DateTableTemplate_');

                if (!isSystemTable) {
                    rels.push({
                        fromTable: fTable, fromColumn: fCol, toTable: tTable, toColumn: tCol,
                        cardinality: cardinality as any, crossFilteringBehavior: crossFilter as any, isActive
                    });
                }
            }
        } else {
            reader.next();
        }
    }
    return rels;
};

// --- VISUAL PARSING ---

const extractFilters = (filterObj: any): string[] => {
    const filters: string[] = [];
    if (!filterObj) return filters;
    
    // Recursive search for Entity/Property to identify what is being filtered
    const findRefs = (obj: any) => {
        if (!obj) return;
        if (typeof obj === 'object') {
            if (obj.Entity && obj.Property) {
                filters.push(`${cleanName(obj.Entity)}.${cleanName(obj.Property)}`);
            }
            if (obj.Hierarchy && obj.Level) {
                 filters.push(`${obj.Hierarchy} [${obj.Level}]`);
            }
            Object.values(obj).forEach(val => findRefs(val));
        }
    };
    findRefs(filterObj);
    return Array.from(new Set(filters));
};

const parseSingleVisualJson = (json: any, id: string): PBIVisual | null => {
    if (!json) return null;
    const root = json.visual || json; // PBIR wraps in visual, Legacy uses flat config object
    
    const visualType = root.visualType || 'unknown';
    
    let title: string | undefined = undefined;
    if (json.title) title = json.title;
    if (!title) {
        title = root.visualContainerObjects?.title?.[0]?.properties?.text?.expr?.Literal?.Value;
    }
    if (title) title = title.replace(/^'|'$/g, "");

    const columnsUsed: string[] = [];
    const actions: PBIVisualAction[] = [];
    
    // Helper to add column reference
    const addCol = (entity: string, prop: string) => {
        columnsUsed.push(`${cleanName(entity)}.${cleanName(prop)}`);
    };

    const findRefsAndActions = (obj: any, keyName?: string) => {
        if (!obj) return;
        if (typeof obj === 'object') {
            
            // 1. Data Binding (Standard)
            if (obj.Entity && obj.Property) {
                addCol(obj.Entity, obj.Property);
            }
            // 2. Data Binding (Variations/SourceRef)
            if (obj.Property && obj.Expression?.SourceRef?.Entity) {
                addCol(obj.Expression.SourceRef.Entity, obj.Property);
            }
            
            // 3. Query Refs fallback (for when field decomposition fails but queryRef exists)
            // Example: "fTabela.Soma Gastos"
            if (obj.queryRef && typeof obj.queryRef === 'string') {
                 if (obj.queryRef.includes('.')) {
                     // We add it to ensure we don't miss fields in complex visuals
                     // Note: cleanName might need to handle the dot if we passed full string, but here we expect dot separation
                     // We rely on standard parsing first, but this is a safety net.
                     // To avoid duplicates with standard parsing, we might check if already added, 
                     // but Set() at the end handles duplicates.
                     const parts = obj.queryRef.split('.');
                     if(parts.length >= 2) addCol(parts[0], parts[1]);
                 }
            }

            // 4. Actions (Standard 'objects' based)
            // Structure: objects -> [action] -> [0] -> properties -> actionType, bookmark, url, page
            if (keyName === 'action' && Array.isArray(obj) && obj.length > 0) {
                 const props = obj[0].properties;
                 if (props) {
                     const actionTypeRaw = extractLiteralValue(props.actionType);
                     const bookmarkRaw = extractLiteralValue(props.bookmark);
                     const pageRaw = extractLiteralValue(props.page);
                     const urlRaw = extractLiteralValue(props.url);
                     
                     let type: PBIVisualAction['type'] = 'Unknown';
                     let target: string | undefined = undefined;

                     if (actionTypeRaw === 'Bookmark') {
                         type = 'Bookmark';
                         target = bookmarkRaw || 'Unspecified';
                     } else if (actionTypeRaw === 'PageNavigation') {
                         type = 'PageNavigation';
                         target = pageRaw || 'Unspecified';
                     } else if (actionTypeRaw === 'WebUrl') {
                         type = 'URL';
                         target = urlRaw || 'Unspecified';
                     } else if (actionTypeRaw === 'Q&A') {
                         type = 'Q&A';
                     } else if (actionTypeRaw === 'DrillThrough') {
                         type = 'DrillThrough';
                     } else if (actionTypeRaw === 'Back') {
                         type = 'Back';
                     }

                     actions.push({ type, target, isEnabled: true });
                 }
            }
            
            // 5. Visual Links (Native Buttons - Insert > Button)
            // Structure: visualContainerObjects -> visualLink -> [0] -> properties -> type
            if (keyName === 'visualLink' && Array.isArray(obj) && obj.length > 0) {
                const props = obj[0].properties;
                if (props) {
                    const typeRaw = extractLiteralValue(props.type); // e.g. 'ClearAllSlicers', 'Bookmark'
                    const bookmarkRaw = extractLiteralValue(props.bookmark);
                    const pageRaw = extractLiteralValue(props.page);
                    const urlRaw = extractLiteralValue(props.url);

                    let type: PBIVisualAction['type'] = 'Unknown';
                    let target: string | undefined = undefined;

                    if (typeRaw === 'Bookmark') {
                         type = 'Bookmark';
                         target = bookmarkRaw || undefined;
                    } else if (typeRaw === 'PageNavigation') {
                         type = 'PageNavigation';
                         target = pageRaw || undefined;
                    } else if (typeRaw === 'WebUrl') {
                         type = 'URL';
                         target = urlRaw || undefined;
                    } else if (typeRaw === 'Back') {
                        type = 'Back';
                    } else if (typeRaw === 'ClearAllSlicers') {
                        type = 'ClearAllSlicers';
                    } else if (typeRaw === 'ApplyAllSlicers') {
                        type = 'ApplyAllSlicers';
                    } else if (typeRaw === 'Q&A') {
                        type = 'Q&A';
                    }
                    
                    actions.push({ type, target, isEnabled: true });
                }
            }

            Object.keys(obj).forEach(key => findRefsAndActions(obj[key], key));
        }
    };
    
    findRefsAndActions(root);

    // SPECIAL HANDLING: New Card Visuals (Deeply Nested & Reference Labels)
    // Sometimes recursion skips/misses logic if arrays are mixed with complex objects.
    // We explicitly dig into visual.query.queryState.Data.projections
    if (root.query?.queryState?.Data?.projections && Array.isArray(root.query.queryState.Data.projections)) {
        root.query.queryState.Data.projections.forEach((proj: any) => findRefsAndActions(proj));
    }
    // Explicitly dig into Reference Labels (New Card)
    if (root.objects?.referenceLabel && Array.isArray(root.objects.referenceLabel)) {
        root.objects.referenceLabel.forEach((lbl: any) => findRefsAndActions(lbl));
    }
    
    const hiddenFilters = extractFilters(root.filter);
    
    return {
        id,
        type: visualType,
        title: title || undefined,
        measuresUsed: [],
        columnsUsed: Array.from(new Set(columnsUsed)),
        hiddenFilters,
        actions
    };
}

const parseLegacyReportJson = (content: string): PBIPage[] => {
  try {
    const json = JSON.parse(content);
    const pages: PBIPage[] = [];
    const sections = json.sections || json.layout?.sections;
    if (!sections) return [];

    sections.forEach((section: any) => {
      const visuals: PBIVisual[] = [];
      if (section.visualContainers) {
        section.visualContainers.forEach((vc: any) => {
          try {
            // Config is a JSON string in Legacy format
            const config = JSON.parse(vc.config);
            
            // Check for Visual Group
            if (config.visualGroup) {
                // If it's a group, we should ideally parse its children. 
                // However, the children are siblings in the 'visualContainers' array, referenced by ID.
                // For this parser, we skip the Group container itself as it holds no data, 
                // and process the children when their turn comes in the loop.
                return; 
            }
            
            // Single Visual
            if (config.singleVisual) {
                // In legacy, visualContainerObjects might be at root of config, adjacent to singleVisual
                // We combine them to ensure parser sees both
                const combinedRoot = {
                    ...config.singleVisual,
                    visualContainerObjects: config.visualContainerObjects
                };
                const visual = parseSingleVisualJson(combinedRoot, vc.id);
                if (visual) visuals.push(visual);
            }
          } catch (e) { /* ignore */ }
        });
      }
      pages.push({
        name: section.name,
        displayName: section.displayName,
        visuals,
        hiddenFilters: extractFilters(JSON.parse(section.filters || "[]"))
      });
    });
    return pages;
  } catch (e) {
    console.error("Report parse error", e);
    return [];
  }
};

const analyzeMeasureDependencies = (model: PBIModel) => {
  const measureMap = new Set<string>();
  model.tables.forEach(t => t.measures.forEach(m => measureMap.add(m.name)));

  model.tables.forEach(t => {
    t.measures.forEach(m => {
        const bracketMatches = m.expression.matchAll(/\[([^\]]+)\]/g);
        for (const match of bracketMatches) {
            const ref = match[1].trim();
            if (measureMap.has(ref) && ref !== m.name) {
                if (!m.dependencies.includes(ref)) m.dependencies.push(ref);
            }
        }
    });
  });
};

const analyzeReportUsage = (model: PBIModel) => {
    const usedCols = new Set<string>();
    const usedMeas = new Set<string>();
    const shortMeasures = new Set<string>();
    model.tables.forEach(t => t.measures.forEach(m => shortMeasures.add(m.name)));

    model.pages.forEach(p => {
        p.visuals.forEach(v => {
            const realCols: string[] = [];
            const realMeas: string[] = [];
            v.columnsUsed.forEach(ref => {
                const parts = ref.split('.');
                const col = parts.length > 1 ? parts[1] : parts[0];
                if (shortMeasures.has(col)) {
                    realMeas.push(col);
                    usedMeas.add(col);
                } else {
                    realCols.push(ref);
                    usedCols.add(ref);
                }
            });
            v.columnsUsed = realCols;
            v.measuresUsed = realMeas;
        });
    });

    model.tables.forEach(t => {
        t.columns.forEach(c => {
            if (usedCols.has(`${t.name}.${c.name}`)) c.isUsedInReport = true;
        });
        t.measures.forEach(m => {
            if (usedMeas.has(m.name)) m.isUsedInReport = true;
        });
    });
};