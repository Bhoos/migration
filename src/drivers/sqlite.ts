import { Driver, EntityObject } from './Driver.js';
import { Database } from 'sqlite';
// Note:
// Support for the RETURNING clause came with version 3.35.0. (https://sqlite.org/releaselog/3_35_0.html)
// so make sure the sqlite library you use supports that. (sqlite3 > 5.0.0 works)

export class SqliteDriver implements Driver {
  private readonly db: Database;
  private readonly migrationTable: string;

  constructor(db: Database, migrationTable: string = 'migration') {
    this.db = db;
    this.migrationTable = migrationTable;
  }

  async load() {
     await this.run(`CREATE TABLE IF NOT EXISTS "${this.migrationTable}"(
      id INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      entities TEXT,
      records TEXT,
      PRIMARY KEY ("id" AUTOINCREMENT)
    )`);
    const res = await this.run<{ version: number }>(
      `SELECT MAX(id) as version FROM "${this.migrationTable}"`
    );
    const version = res[0].version || 0;
    if (version === 0) {
      return { version: 0, entities: [], records: []};
    }

    const data = await this.run<{ entities: string, records: string}>(
      `SELECT entities, records FROM "${this.migrationTable}" WHERE id=${version}`);
    return {
      version,
      entities: JSON.parse(data[0].entities) as Array<EntityObject>,
      records: JSON.parse(data[0].records) as Array<string>,
    };
  }

  async run<T extends object={}>(sql: string): Promise<Array<T>> {
    try {
      return  await this.db.all(sql);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}
