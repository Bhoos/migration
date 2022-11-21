import { DatabaseBase } from "../base/Database.js";
import { TableBase } from "../base/Table.js";
import { IndexBase } from "../base/Index.js";
import { Driver } from "../drivers/Driver.js";
import { ColumnBase } from "../base/Column.js";

class PostgresTable extends TableBase {
  createColumn(name: string): ColumnBase {
    return new PostgresColumn(this, name);
  }
}

class PostgresColumn extends ColumnBase {
  createSQL(): string {
    let type = this.dataType;
    if (this.autoIncrement) {
      if (this.dataType === 'BIGINT') {
        type = 'BIGSERIAL'
      } else {
        type = 'SERIAL';
      }
    }
    return `${this.db.quote(this.name)} ${type} ${this.nullable ? 'NULL' : 'NOT NULL'} ${this.defaultValue ? `DEFAULT ${this.defaultValue}`: ''}`
  }
}

export class Postgres extends DatabaseBase {
  constructor(driver: Driver, migrationTable: string = 'migration') {
    super(driver, migrationTable);
  }

  createTable(name: string) {
    return new PostgresTable(this, name);
  }

  createIndex(name: string) {
    return new IndexBase(this, name);
  }
}
