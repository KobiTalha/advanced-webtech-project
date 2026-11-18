import {
  Injectable,
  NestMiddleware,
} from '@nestjs/common';

import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const requestId = randomUUID();

    (req as Request & { requestId: string }).requestId =
      requestId;

    res.setHeader('X-Request-ID', requestId);

    next();
  }
}