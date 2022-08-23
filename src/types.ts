export interface Column {
  type(dataType: string): Column;

  readonly serial: Column;
  readonly bigSerial: Column;
  readonly int: Column;
  readonly bigInt: Column;
  readonly smallInt: Column;
  readonly float: Column;
  readonly double: Column;
  varchar(size: number): Column;
  readonly text: Column;
  readonly json: Column;
  
  readonly unique: Column;
  readonly null: Column;

  default(value: string): Column;
  
  col(name: string): Column;
  key(col: string, ...columns: string[]): Table;
  ref(table: Table, column?: string): Column;
}

export interface Table {
  col(name: string): Column;
  key(col: string, ...columns: string[]): Table;

  insert(record: Record<string, any>): Table;
}

export interface Index {
  on(table: Table, col: string, ...columns: string[]): Index;
  readonly unique: Index;
}

export interface Database {
  table: (name: string) => Table;
  index: (name: string) => Index;
}
