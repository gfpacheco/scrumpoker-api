import { Response } from 'express';

export default class Guest {
  id = Date.now();

  constructor(public res: Response) {}

  toJSON() {
    return { id: this.id };
  }
}
