# migration
Bhoos Database Migration Support Library

### Usage
```typescript
import { migrate, Postgres, PGDriver } from '@bhoos/migration';
import pg from 'pg';

function migration(client: pg.Client) {
  await migrate(new Postgres(new PGDriver(client)), ({ table, index }) => {
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
}

```
