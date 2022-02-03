import { NextFunction, Request, Response } from 'express';
import ScrumPoker from './ScrumPoker';

export default class RoomMiddleware {
  constructor(public scrumPoker: ScrumPoker) {}

  addRoomToContext = (req: Request, res: Response, next: NextFunction) => {
    req.room = this.scrumPoker.getOrCreateRoom(req.params.roomId);
    next();
  };
}
