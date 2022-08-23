import { Entity } from "./Entity.js";
import { Index } from '../types.js';
import { TableBase } from "./Table.js";
import { ColumnBase } from "./Column.js";

export class IndexBase extends Entity implements Index {
  protected isUnique: boolean = false;
  protected table: TableBase;
  protected columns: Array<ColumnBase>;

  toObject(obj: {[name: string]: any}) {
    obj.__type = 'index';
    super.toObject(obj);
    obj.isUnique = this.isUnique;
    obj.table = this.table.name;
    obj.columns = this.columns.map(col => col.name);
    return obj;
  }

  get unique() {
    this.isUnique = true;
    return this;
  }

  on(table: TableBase, column: string, ...columns: string[]) {
    this.table = table;
    this.columns = [column].concat(columns).map(c => table.findColumn(c));
    return this;
  }

  isChanged(obj: { [name: string]: any; }): boolean {
    return (Boolean(this.isUnique) !== Boolean(obj.isUnique)) ||
      this.columns.length !== obj.columns.length ||
      this.columns.some(col => !obj.columns.find(c => col.name === c));
  }

  createSQL() {
    return `CREATE${this.isUnique ? ' UNIQUE' : ''} INDEX ${this.db.quote(this.name)}` 
      + `ON ${this.db.quote(this.table.name)}(${this.columns.map(col => this.db.quote(col.name)).join(',')})`
  }

  alterSQL(obj: { [name: string]: any; }): string | string[] {
    return [
      `DROP INDEX ${this.db.quote(this.name)}`
    ]
  }
}
