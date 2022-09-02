import { DatabaseBase } from '../base/Database.js';
import { IndexBase } from '../base/Index.js';
import { TableBase } from '../base/Table.js';
import { Driver } from '../drivers/Driver.js';
import { ColumnBase } from '../base/Column.js';
import { seggregate } from '../base/Item.js';

// float, double = real
export class SqliteColumn extends ColumnBase {
  get serial() {
    this.autoIncrement = true;
    return this.type('INTEGER');
  }

  get bigSerial() {
    this.autoIncrement = true;
    return this.type('INTEGER');
  }

  get int() {
    return this.type('INTEGER');
  }

  get bigInt() {
    return this.type('INTEGER');
  }

  get smallInt() {
    return this.type('INTEGER');
  }

  get tinyInt() {
    return this.type('INTEGER');
  }

  get float() {
    return this.type('REAL');
  }

  get double() {
    return this.type('REAL');
  }

  varchar(size: number) {
    return this.type(`TEXT`);
  }

  get json() {
    return this.type('TEXT');
  }

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

  alterSQL(newTable: { [name: string]: any }) {
    const alterTable = `ALTER TABLE ${this.db.quote(this.name)} `;
    const changes: string[] = [];
    // Figure out changes to columns

    // sqlite doesn't allow multiple ADD or DROP in single ALTER TABLE
    // see syntax diagram at: https://www.sqlite.org/lang_altertable.html

    const NAMES = ['COLUMN', 'CONSTRAINT'];
    ['columns', 'constraints'].forEach((cc, idx) => {
      const { create, alter, drop } = seggregate(this[cc], newTable[cc]);

      create.forEach(item => {
        changes.push(alterTable + 'ADD ' + item.createSQL());
      });

      alter.forEach(item => {
        const alters = item.alterSQL(newTable[cc].find(c => c.name === item.name));
        if (Array.isArray(alters)) {
          changes.push(...alters.map(a => alterTable + a));
        } else {
          changes.push(alterTable + alter);
        }
      });

      drop.forEach(item => {
        changes.push(alterTable + 'DROP ' + NAMES[idx] + ' ' + this.db.quote(item.name));
      });
    });

    if (changes.length === 0) return [];

    return changes;
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
