export type EntityObject = {
  [name: string]: any,
};

export interface Driver {
  run<T extends object={}>(sql: string): Promise<Array<T>>;

  begin?: () => Promise<void>;
  commit?: () => Promise<void>;
  rollback?: () => Promise<void>;

  load?: () => Promise<{ version: number, entities: Array<EntityObject>, records: Array<string>}>,
  store?: (entities: Array<EntityObject>, records: Array<string>) => Promise<number>,
}
