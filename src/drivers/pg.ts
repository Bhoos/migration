import type { PoolClient } from 'pg';
import { Driver } from './Driver.js';

export class PGDriver implements Driver {
  private readonly db: PoolClient;
  private readonly migrationTable: string;

  constructor(db: PoolClient, migrationTable: string = 'migration') {
    this.db = db;
    this.migrationTable = migrationTable;
  }

  async run<T extends object={}>(sql: string): Promise<Array<T>> {
    try {
      const res = await this.db.query(sql);
      return res.rows;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}
