import { Driver, EntityObject } from './Driver.js';
import { Database } from 'sqlite';
import { collectUntillNull, consumeAlphabets, consumeEnclosedBy, consumeNameInsideBrackets, consumePgName, consumeTypeName, consumeWord, Cursor, getMatch } from './parsingUtils.js';
import assert from 'assert';

type SqliteSchema = {
  type : string,
  name : string,
  tbl_name : string,
  sql : string
}

function parseConstraint(cur : Cursor) {
  const name = getMatch(cur, consumePgName);
  const type = getMatch(cur, consumeAlphabets).toUpperCase();
  if (type === 'FOREIGN') {
    consumeWord(cur, "KEY")
    const column = consumeNameInsideBrackets(cur);
    consumeWord(cur, "REFERENCES")
    const refTable = getMatch(cur, consumePgName);
    const refColumn = consumeNameInsideBrackets(cur);
    return {
      name, column, refTable, refColumn
    }
  } else if (type === 'PRIMARY'){
    consumeWord(cur, "KEY")
    const enclosedStr = getMatch(cur, (cur) => consumeEnclosedBy(cur, "(", ")"));
    const columns = collectUntillNull(
      {str: enclosedStr, pos : 0 , match : null},
      (cur) => {consumePgName(cur); return cur.match}
    );
    return {
      name, columns
    }
  } else {
    throw new Error('Unknown constraint type');
  }
}

function parseColumn(cur : Cursor, columnName : string) {
  const dataType = getMatch(cur, consumeTypeName);
  // maybe null
  let nullable = true;
  consumeAlphabets(cur);
  if (cur.match) {
    if (cur.match.toLowerCase() === 'null') {
      nullable = true;
    } else {
      assert(cur.match.toLowerCase() === 'not')
      consumeWord(cur, 'NULL');
      nullable = false;
    }
  }
  return {
    name : columnName,
    dataType,
    nullable
  }
}

function parseTableSchema(sql: string) {
  let cur : Cursor = { str : sql , pos : 0 , match : null}

  // Table Name
  consumeWord(cur, 'CREATE')
  consumeWord(cur, 'TABLE')
  const tableName = getMatch(cur, consumePgName);

  // Table Definition
  consumeEnclosedBy(cur, "(", ")");
  assert(cur.match)
  let columns  = [];
  let constraints  = [];
  for (const entry of cur.match.split(",")){
    cur = {str : entry, pos:0 , match: null}
    consumePgName(cur);
    assert(cur.match);
    if (cur.match.toLowerCase() === 'constraint') {
      constraints.push(parseConstraint(cur));
    } else {
      const columnName = cur.match;
      columns.push(parseColumn(cur, columnName));
    }
  }

  return {
    "__type" : "table",
    "name" : tableName,
    "isCheckPoint" : false,
    "columns" : columns,
    "constraints" : constraints
  };
}


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
    let tableSchemaSqls = await this.run<SqliteSchema>(`SELECT * from sqlite_schema where "type" = 'table';`);
    tableSchemaSqls = tableSchemaSqls.filter((t) =>
      t.name != this.migrationTable &&
      t.name != 'sqlite_sequence');

    let version = await this.run<{version : number}>(`SELECT MAX(id) as version FROM "${this.migrationTable}"`);
    const tables = tableSchemaSqls.map((r) => parseTableSchema(r.sql));
    const schema = {
      version : version[0].version,
      entities: tables,
      records : []
    }
    return schema;
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
