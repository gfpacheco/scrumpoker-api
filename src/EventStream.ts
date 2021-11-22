import { Response } from 'express';

export default class EventStream {
  static writeEventStreamHeaders(res: Response) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    });
  }

  static writeData(res: Response, data: any) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
