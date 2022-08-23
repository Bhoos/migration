import fs from 'fs';
import { migrate, Postgres } from "./index.js";
import { EntityObject } from "./drivers/Driver.js";

const migrationFile = 'migration.json';

const demoDriver = {
  run: async (sql: string) => {
    console.log('Executing SQL');
    console.log(sql);
    return [];
  },
  load: async () => {
    if (!fs.existsSync(migrationFile)) {
      return { version: 0, entities: [], records: []}
    }

    return JSON.parse(fs.readFileSync(migrationFile, 'utf-8')) as {
      version: number,
      entities: Array<EntityObject>,
      records: Array<string>,
    };
  },
  store: async (entities: Array<EntityObject>, records: Array<string>) => {
    const existing = await demoDriver.load();
    const version = existing.version + 1;
    fs.writeFileSync(migrationFile, JSON.stringify({
      version,
      entities,
      records,
    }));
    return version;
  },
}

migrate(new Postgres(demoDriver), ({ table, index }) => {
  const user = table('user')
    .col('id').serial
    .col('username').varchar(16).unique
    .col('password_hash').varchar(32)
    .col('name').varchar(32).null
    .col('timestamp').int.default('CURRENT_TIMESTAMP')
    .key('id');
  
  const userProfile = table('user_profile')
    .col('id').serial
    .col('user_id').ref(user)
    .key('id');

  const book = table('book')
    .col('id').serial
    .col('isbn').varchar(16).unique
    .col('title').varchar(128)
    .key('id');
  
  const book_author = table('book_author')
    .col('book_id').ref(book)
    .col('author_id').ref(user)
    .key('book_id', 'author_id');
});

