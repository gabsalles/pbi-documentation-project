export interface PBIMeasure {
  name: string;
  expression: string;
  description?: string;
  formatString?: string;
  lineageTag?: string;
  annotations?: Record<string, string>;
  dependencies: string[]; // Names of other measures/columns this measure depends on
  isUsedInReport: boolean;
  parentTable: string;
  isCalculationItem?: boolean;
  sourceFilePath?: string; // Caminho completo do arquivo .tmdl no Windows/Mac
  dependents?: string[];  // <-- ADICIONA só esta linha nova.
}

export interface PBIColumn {
  name: string;
  dataType: string;
  isHidden: boolean;
  description?: string;
  isUsedInReport: boolean;
  sourceColumn?: string;
  summarizeBy?: string;
  expression?: string; // For Calculated Columns
  SourceFilePath?: string; // Adicione isto
  dependencies?: string[]; 
  dependents?: string[];
}

export interface PBIParameter {
  name: string;
  type: string;
  currentValue?: string;
  description?: string;
  expression: string; // The M code defining the parameter
}

export interface PBITable {
  name: string;
  columns: PBIColumn[];
  measures: PBIMeasure[];
  partitions: { name: string; source: string; mode: string }[];
  sourceExpression?: string; // Main M Code from partition
  description?: string;
  type: 'Import' | 'DirectQuery' | 'Calculated' | 'Unknown';
  annotation?: string;
  isCalculationGroup?: boolean;
  isParameter?: boolean;
  isUDF?: boolean;
  sourceFilePath?: string; // Caminho completo do arquivo .tmdl no Windows/Mac
}

export interface PBIRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  cardinality: 'One' | 'Many';
  crossFilteringBehavior: 'OneDirection' | 'BothDirections' | 'Automatic';
  isActive?: boolean;
}

export interface PBIVisualAction {
  type: 'Bookmark' | 'PageNavigation' | 'URL' | 'Q&A' | 'DrillThrough' | 'Back' | 'ClearAllSlicers' | 'ApplyAllSlicers' | 'Unknown';
  target?: string; // Name of bookmark, page, or URL
  isEnabled?: boolean;
}

export interface PBIVisual {
  id: string;
  type: string;
  title?: string;
  measuresUsed: string[];
  columnsUsed: string[];
  hiddenFilters?: string[];
  actions?: PBIVisualAction[];
}

export interface PBIPage {
  name: string;
  displayName: string;
  visuals: PBIVisual[];
  hiddenFilters?: string[];
  screenshot?: string; // Base64 image string
}

export interface PBIRole {
  name: string;
  modelPermission?: string;
  tablePermissions: { table: string; expression: string }[];
}

export interface PBIBookmark {
  name: string;
  displayName: string;
}

export interface PBIModel {
  tables: PBITable[];
  parameters: PBIParameter[];
  relationships: PBIRelationship[];
  pages: PBIPage[];
  roles: PBIRole[];
  bookmarks: PBIBookmark[];
  timestamp: string;
  datasetName: string;
}