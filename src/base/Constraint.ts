import { ColumnBase } from "./Column.js";
import { Item } from "./Item.js"
import { TableBase } from "./Table.js";

export abstract class Constraint extends Item {
  dropSQL(): string {
    return `DROP CONSTRAINT ${this.name}`;
  }

  alterSQL() {
    return [`ADD ${this.createSQL()}`];
  }

  abstract toObject(obj: {[name: string]: any}): {[name: string]: any};
}

export class PrimaryKeyContraint extends Constraint {
  protected columns: string[];
  constructor(table: TableBase, column: string, ...columns: string[]) {
    super(table.db, `PK_${table.name}`);

    this.columns = [column].concat(columns);
  }

  createSQL(): string {
    return `CONSTRAINT ${this.db.quote(this.name)} PRIMARY KEY(` +
      this.columns.map(c => this.db.quote(c)).join(', ') + ')';
  }

  toObject(obj: { [name: string]: any; }): { [name: string]: any; } {
    obj.name = this.name;
    obj.columns = this.columns;
    return obj;
  }

  isChanged(obj: { [name: string]: any; }): boolean {
    return obj.columns.length !== this.columns.length || (
      this.columns.some((col, idx) => col !== obj.columns[idx])
    );
  }
}

export class UniqueKeyConstraint extends Constraint {
  protected column: ColumnBase;

  constructor(column: ColumnBase) {
    super(column.table.db, `UK_${column.table.name}_${column.name}`);
    this.column = column;
  }

  createSQL(): string {
    return `CONSTRAINT ${this.db.quote(this.name)} UNIQUE (${this.db.quote(this.column.name)})`;
  }

  toObject(obj: { [name: string]: any; }): { [name: string]: any; } {
    obj.name = this.name;
    obj.column = this.column.name;
    return obj;
  }

  isChanged(obj: { [name: string]: any; }): boolean {
    return this.column.name !== obj.column;
  }
}

export class ForeignKeyConstraint extends Constraint {
  protected column: ColumnBase;
  protected refTable: TableBase;
  protected refColumn: string;

  constructor(column: ColumnBase, refTable: TableBase, refColumn: string) {
    super(column.table.db, `FK_${column.table.name}_${refTable.name}_${column.name}`);
    this.column = column;
    this.refTable = refTable;
    this.refColumn = refColumn;
  }

  createSQL(): string {
    return `CONSTRAINT ${this.db.quote(this.name)} FOREIGN KEY(${this.db.quote(this.column.name)}) `+
       `REFERENCES ${this.db.quote(this.refTable.name)}(${this.db.quote(this.refColumn)})`;
  }

  toObject(obj: { [name: string]: any; }): { [name: string]: any; } {
    obj.name = this.name;
    obj.column = this.column.name;
    obj.refTable = this.refTable.name;
    obj.refColumn = this.refColumn;
    return obj;
  }

  isChanged(obj: { [name: string]: any; }): boolean {
    return this.refTable.name !== obj.refTable || this.refColumn !== obj.refColumn;
  }
}
