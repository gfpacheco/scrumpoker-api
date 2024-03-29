import { Response } from 'express';

export default class Spectator {
  id = Date.now();

  constructor(public res: Response) {}

  toJSON() {
    return { id: this.id };
  }
}
