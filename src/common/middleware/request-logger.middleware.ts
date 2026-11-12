import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = (req as Request & { requestId?: string }).requestId;
    const method = req.method;
    const url = req.originalUrl;
    const ip = req.ip;

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      this.logger.log({
        requestId,
        method,
        url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip,
      });
    });

    next();
  }
}
