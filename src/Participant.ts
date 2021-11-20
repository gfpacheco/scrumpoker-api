import { Response } from 'express';

export default class Participant {
  constructor(public id: number, public name: string, public res: Response) {}
}
