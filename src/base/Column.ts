import { Column } from '../types.js';
import { ForeignKeyConstraint, UniqueKeyConstraint } from './Constraint.js';
import { Item } from './Item.js';
import type { TableBase } from './Table.js';

export class ColumnBase extends Item implements Column {
  readonly table: TableBase;

  protected dataType: string;
  protected nullable = false;
  protected autoIncrement: boolean;
  protected defaultValue: string;

  constructor(table: TableBase, name: string) {
    super(table.db, name);
    this.table = table;
  }

  toObject(obj: {[name: string]: any }) {
    super.toObject(obj);

    obj.dataType = this.dataType;
    obj.nullable = this.nullable;
    obj.defaultValue = this.defaultValue;
    
    return obj;
  }

  type(type: string) {
    this.dataType = type;
    return this;
  }

  get serial() {
    this.autoIncrement = true;
    return this.type('INT');
  }

  get bigSerial() {
    this.autoIncrement = true;
    return this.type('BIGINT');
  }

  default(value: string) {
    this.defaultValue = value;
    return this;
  }

  get int() {
    return this.type('INT');
  }

  get bigInt() {
    return this.type('BIGINT');
  }

  get smallInt() {
    return this.type('SMALLINT');
  }

  get tinyInt() {
    return this.type('TINYINT');
  }

  get float() {
    return this.type('FLOAT');
  }

  get double() {
    return this.type('DOUBLE');
  }

  varchar(size: number) {
    return this.type(`VARCHAR(${size})`);
  }

  get text() {
    return this.type('TEXT');
  }

  get json() {
    return this.type('JSON');
  }
  
  col(name: string) {
    return this.table.col(name);
  }

  key(col: string, ...args: string[]) {
    return this.table.key(col, ...args);
  }

  ref(table: TableBase, column: string = 'id') {
    const refColumn = table.findColumn(column);

    if (!refColumn) {
      throw new Error(`Invalid column reference ${table.name}.${column} from ${this.table.name}.${this.name}`);
    }

    this.type(refColumn.dataType);
    this.table.addConstraint(new ForeignKeyConstraint(this, table, column));
    return this;
  }

  get null() {
    this.nullable = true;
    return this;
  }

  get unique() {
    this.table.addConstraint(new UniqueKeyConstraint(this));
    return this;
  }

  isChanged(obj: { [name: string]: any; }): boolean {
    return this.dataType.toLocaleLowerCase() !== obj.dataType.toLocaleLowerCase()
      || this.nullable !== Boolean(obj.nullable)
      || this.autoIncrement !== Boolean(obj.autoIncrement)
      || this.defaultValue !== obj.defaultValue;
  }

  createSQL(): string {
    return `${this.db.quote(this.name)} ${this.dataType} ${this.nullable ? 'NULL' : 'NOT NULL'} ${this.defaultValue ? `DEFAULT ${this.defaultValue}`: ''}`
  }

  alterSQL(obj: { [name: string]: any }) {
    const res: string[] = [];
    if (this.dataType !== obj.dataType) {
      res.push(`ALTER COLUMN ${this.db.quote(this.name)} TYPE ${this.dataType}`)
    }

    if (this.nullable !== Boolean(obj.nullable)) {
      res.push(`ALTER COLUMN ${this.db.quote(this.name)} ${this.nullable ? 'DROP NOT NULL' : 'SET NOT NULL'}`);
    }

    if (isDefaultValueChanged(this.defaultValue, obj.defaultValue)) {
      res.push(`ALTER COLUMN ${this.db.quote(this.name)} ${!this.defaultValue ? 'DROP DEFAULT' : `SET DEFAULT ${this.defaultValue}`}`);
    }

    return res;
  }
}

// Default value change check is a bit special as we
// don't want to mark it as change for empty values
// (null, undefined , '')
function isDefaultValueChanged(newValue: string, oldValue: string) {
  if (!newValue && !oldValue) return false;
  return newValue !== oldValue; 
}
