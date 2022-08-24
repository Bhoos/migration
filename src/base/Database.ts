import { Entity } from "./Entity.js";
import { Database, Table, Index } from "../types.js";
import { TableBase } from "./Table.js";
import { IndexBase } from "./Index.js";
import { seggregate } from "./Item.js";
import { RecordOp } from "./Record.js";
import { EntityObject, Driver } from "../drivers/Driver.js";

export abstract class DatabaseBase implements Database {
  protected abstract createTable(name: string): TableBase;
  protected abstract createIndex(name: string): IndexBase;

  protected entities: Array<Entity> = [];
  protected records: Array<RecordOp> = [];

  protected readonly driver: Driver;
  protected readonly migrationTable: string;

  constructor(driver: Driver, migrationTable: string = 'migration') {
    this.driver = driver;
    this.migrationTable = migrationTable;
  }

  table = (name: string): Table => {
    const table = this.createTable(name);
    this.entities.push(table);
    return table;
  }
  
  index = (name: string): Index => {
    const index = this.createIndex(name);
    this.entities.push(index);
    return index;
  }

  addRecord(op: RecordOp) {
    this.records.push(op);
  }

  async getMigrations(): Promise<{
    version: number,
    queries: Array<string>
  }> {
    const { version, entities: existingEntities, records: existingRecords } = await this.load();
    
    const { create, alter, drop } = seggregate(this.entities, existingEntities);
    
    let queries: string[] = [];

    // First run all create quries
    create.forEach(item => {
      queries = queries.concat(item.createSQL());
    });

    // Perform all the alters
    alter.forEach(item => {
      queries = queries.concat(item.alterSQL(existingEntities.find(obj => obj.name === item.name)));
    })

    // Perform all the drops, allow drops in development mode only
    if (process.env.NODE_ENV === 'development') {
      drop.forEach(obj => {
        queries = queries.concat(this.dropSQL(obj));
      })
    }

    // Perform data operations, we only add new data
    const newRecords = this.records.reduce((res, rec) => {
      const sql = rec.toSQL();
      if (existingRecords.find(ex => ex === sql)) return res;
      res.push(sql);
      return res;
    }, [] as string[]);
    queries.concat(newRecords);
    
    return { version, queries };
  }

  dropSQL(obj: {[name: string]: any}) {
    if (obj.__type === 'table') {
      return `DROP TABLE ${this.quote(obj.name)}`
    } else if (obj.__type === 'index') {
      return `DROP INDEX ${this.quote(obj.name)}`
    }
  }

  async migrate(version: number, migrations: Array<string>) {
    // run all the migrations
    for(const migration of migrations) {
      try {
        await this.run(migration);
      } catch (err) {
        console.log('Error running', migration, err.message);
        throw err;
      }
    }

    // Store migration information
    if (migrations.length > 0) {
      const all = this.entities.map((entity) => {
        const obj = {};
        entity.toObject(obj);
        return obj;
      });

      const records = this.records.map(record => record.toSQL());
      
      await this.store(all, records);
    }
  }

  quote(name: string) {
    return `"${name}"`;
  }

  async begin() {
    if (this.driver.begin) return this.driver.begin();
    await this.run('BEGIN');
  }

  async commit() {
    if (this.driver.commit) return this.driver.commit();
    await this.run('COMMIT');
  }

  async rollback() {
    if (this.driver.rollback) return this.driver.rollback();
    await this.run('ROLLBACK');
  }

  async load() {
    if (this.driver.load) return this.driver.load();

    await this.run(`CREATE TABLE IF NOT EXISTS "${this.migrationTable}"(
      id SERIAL NOT NULL PRIMARY KEY,
      timestamp INT NOT NULL,
      entities TEXT,
      records TEXT
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

  async store(entities: Array<EntityObject>, records: Array<string>) {
    if (this.driver.store) return this.driver.store(entities, records);

    const ts = Math.floor(Date.now()/1000);
    const res = await this.run<{ id: number }>(
      `INSERT INTO "${this.migrationTable}"(timestamp, entities, records) VALUES(${ts}, '${JSON.stringify(entities)}', '${JSON.stringify(records)}') RETURNING id`);
    return res[0].id;
  }
  
  async run<T extends object = {}>(sql: string): Promise<Array<T>> {
    return this.driver.run(sql);
  }
}
