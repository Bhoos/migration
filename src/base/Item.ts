import { DatabaseBase } from "./Database.js";

export abstract class Item {
  readonly db: DatabaseBase;
  readonly name: string;
  renameFrom: string;

  constructor(db: DatabaseBase, name: string) {
    this.db = db;
    this.name = name;
  }

  rename(from: string) {
    this.renameFrom = from;
  }

  abstract createSQL(): string | string[];
  abstract alterSQL(obj: { [name: string]: any }): string | string[];
  
  toObject(obj: { [name: string]: any }) {
    obj.name = this.name;
    return obj;
  }

  toString() {
    return this.name;
  }

  abstract isChanged(obj: { [name: string]: any }): boolean;
}

export function seggregate(items: Item[], objects: Array<{ [name: string]: any }>) {
  const newItems = items.filter(item => !objects.find(obj => obj.name === item.name));

  const alteredItems: Item[] = [];
  const removedItems = objects.filter(obj => {
    const matched = items.find(item => item.name === obj.name);
    if (matched) {
      if (matched.isChanged(obj)) {
        alteredItems.push(matched);
      }
    }
    return !matched;
  });

  return {
    create: newItems,
    alter: alteredItems,
    drop: removedItems,
  }
}
