import { Response } from 'express';

export default class Participant {
  id = Date.now();
  estimate?: number;

  constructor(public name: string, public res: Response) {}

  toJSON() {
    return { id: this.id, name: this.name, estimate: this.estimate };
  }
}
