import { Response } from 'express';

export default class Spectator {
  constructor(public id: number, public res: Response) {}
}
