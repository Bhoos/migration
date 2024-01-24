import { DatabaseBase } from "./base/Database.js";
import { Database } from "./types.js";

export async function migrate(db: DatabaseBase,
                              migration: (db: Database) => void,
                              preMigration? : () => Promise<void>,
                              postMigration? : () => Promise<void>) {
  // Perform the entire migration within a transaction
  await db.begin();
  try {
  if (preMigration)
    await preMigration();
  // Run the migration function
  //   migration function defines the db schema required.
  migration(db);
  
  // Get the migration sql
  const { version, queries } = await db.getMigrations();

  console.log(queries.join('\n\n'));

  // Run all the migrations
  await db.migrate(version, queries);

  if (postMigration)
    await postMigration();
  await db.commit();
  } catch (e) {
    console.log('Migration failed rolling back', e);
    await db.rollback();
    throw e;
  }
}
