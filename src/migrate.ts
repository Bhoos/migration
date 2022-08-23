import { DatabaseBase } from "./base/Database.js";
import { Database } from "./types.js";

export async function migrate(db: DatabaseBase, migration: (db: Database) => void) {
  // Perform the entire migration within a transaction
  await db.begin();

  // Run the migration function
  migration(db);
  
  // Get the migration sql
  const { version, queries } = await db.getMigrations();

  console.log(queries.join('\n\n'));

  // Run all the migrations
  await db.migrate(version, queries);

  await db.commit();


}

function trimSQL(sql: string) {
  return sql.split(/[\r\n]/).map(k => k.trim()).join('');
}
