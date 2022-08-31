import { DatabaseBase } from '../base/Database.js';
import { IndexBase } from '../base/Index.js';
import { TableBase } from '../base/Table.js';
import { Driver } from '../drivers/Driver.js';
import { ColumnBase } from '../base/Column.js';

// float, double = real
export class SqliteColumn extends ColumnBase {
  alterSQL(obj: { [name: string]: any }): string[] {
    console.log(
      `altering column:\n\tOld: ${this.name} ${this.dataType} ${
        this.nullable
      }\n\tNew: ${JSON.stringify(obj)}`,
    );
    const res: string[] = [];
    if (this.dataType !== obj.dataType) {
      console.debug(`We cannot change column type in sqlite.
See: https://www.sqlite.org/lang_altertable.html
Also: Don't stress. sqlite tables are dynamically typed. so your code would work with wrong types too.`);
      // TODO: figure out a way anyhow.
      // create temporary table with correct types
      // copy data, delete old table, rename new table
      // recreate(?) triggers, constraints,...
    }

    if (this.nullable !== Boolean(obj.nullable)) {
      console.error('Cannot change NULLability of a column');
    }

    if (this.defaultValue !== obj.defaultValue) {
      // can't change default value
      console.error('Cannot change default value of a column');
    }

    return res;
  }
}

export class SqliteTable extends TableBase {
  createColumn(name: string): SqliteColumn {
    return new SqliteColumn(this, name);
  }
}

export class Sqlite extends DatabaseBase {
  constructor(driver: Driver, migrationTable: string = 'migration') {
    super(driver, migrationTable);
  }

  createTable(name: string) {
    return new SqliteTable(this, name);
  }

  createIndex(name: string) {
    return new IndexBase(this, name);
  }
}
