import { Item } from './Item.js';

export abstract class Entity extends Item {
  protected isCheckPoint: boolean = false;

  get checkPoint() {
    this.isCheckPoint = true;
    return this;
  }

  toObject(obj: {[name: string]: any}) {
    super.toObject(obj);

    obj.isCheckPoint = this.isCheckPoint;
    return obj;
  }
}
