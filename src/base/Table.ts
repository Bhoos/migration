import { Table } from '../types.js';
import { Entity } from './Entity.js';
import { ColumnBase } from './Column.js';
import { Constraint, PrimaryKeyContraint } from './Constraint.js';
import { seggregate } from './Item.js';
import { Insertion, RecordOp } from "./Record.js";

export class TableBase extends Entity implements Table {
  columns: Array<ColumnBase> = [];
  constraints: Array<Constraint> = [];

  findColumn(column: string) {
    return this.columns.find(k => k.name === column);
  }

  addConstraint(constraint: Constraint) {
    this.constraints.push(constraint);
  }

  toObject(obj: {[name: string]: any}) {
    obj.__type = 'table';
    super.toObject(obj);
    obj.columns = this.columns.map(col => col.toObject({}));
    obj.constraints = this.constraints.map(cons => cons.toObject({}));
    return obj;
  }

  col(name: string) {
    const col = this.createColumn(name);
    this.columns.push(col);
    return col;
  }

  key(col: string, ...cols: string[]) {
    this.addConstraint(new PrimaryKeyContraint(this,  col, ...cols));
    return this;
  }

  createColumn(name: string) {
    return new ColumnBase(this, name);
  }

  isChanged(obj: {[name: string]: any}) {
    if (this.columns.length !== obj.columns.length) return true;
    if (this.constraints.length !== obj.constraints.length) return true;
    return this.columns.some(k => k.isChanged(obj.columns.find(o => o.name === k.name)))
      || this.constraints.some(k => k.isChanged(obj.constraints.find(c => c.name === k.name)));
  }

  createSQL() {
    return `CREATE TABLE ${this.db.quote(this.name)}(` +
      this.columns.map(col => col.createSQL()).concat(
	this.constraints.map(cons => {
	  const sql = cons.createSQL();
	  if (Array.isArray(sql)) {
	    return sql.join(', ');
	  }
	  return sql;
	})
      ).join(', ') +
    `)`;
  }

  insert(record: Record<string, any>) {
    this.db.addRecord(new Insertion(this, record));
    return this;
  }

  alterSQL(newTable: {[name: string]: any}) {
    const sql = `ALTER TABLE ${this.db.quote(this.name)}`;
    const changes: string[] = [];
    // Figure out changes to columns

    const NAMES = ['COLUMN', 'CONSTRAINT'];
    ['columns', 'constraints'].forEach((cc, idx) => {
      const { create, alter, drop } = seggregate(this[cc], newTable[cc]);

      create.forEach((item) => {
	changes.push('ADD ' + item.createSQL());
      });

      alter.forEach((item) => {
	const alters = item.alterSQL(newTable[cc].find(c => c.name === item.name));
	changes.push(...alters);
      });

      drop.forEach((item) => {
	changes.push('DROP ' + NAMES[idx] + ' ' + this.db.quote(item.name));
      });
    });

    if (changes.length === 0) return [];

    return `${sql} ${changes.join(',')}`;
  }
}
