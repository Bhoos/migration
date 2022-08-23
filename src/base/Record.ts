import { TableBase } from "./Table.js";

export interface RecordOp {
  toSQL(): string;
}

export class Insertion implements RecordOp {
  readonly table: TableBase;
  readonly cols: Array<string>;
  readonly values: Array<Array<any>>;

  constructor(table: TableBase, record: Record<string, any> | Array<Record<string, any>>) {
    this.table = table;

    const records = Array.isArray(record) ? record : [record];

    for (let i = 0; i < records.length; i += 1) {
      const rec = records[i];
      if (i === 0) {
        this.cols = Object.keys(rec);
        this.values = [Object.values(rec)];
      } else {
        // TODO: Make sure every record has the same structure
        this.values.push(Object.values(rec));
      }
    }
  }

  toSQL() {
    const quote = this.table.db.quote.bind(this.table.db);
    return `INSERT INTO ${quote(this.table.name)}`
      + `(${this.cols.map(c => quote(c)).join(',')}) `
      + 'VALUES' + this.values.map(val => `(${val.join(',')})`).join(',');
  }
}
