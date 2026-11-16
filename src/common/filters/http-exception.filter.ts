import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface RequestWithId extends Request {
  requestId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();

    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';

    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const body = exceptionResponse as Record<string, any>;

        message = body.message ?? message;
        error = body.error ?? error;
      }
    } else if (exception instanceof QueryFailedError) {
      const driverError = (exception as any).driverError;
      const code = driverError?.code;

      switch (code) {
        case '23505':
          status = HttpStatus.CONFLICT;
          error = 'Conflict';
          message = 'A record with this information already exists';
          break;

        case '23503':
          status = HttpStatus.CONFLICT;
          error = 'Conflict';
          message = 'This operation conflicts with an existing relationship';
          break;

        case '23502':
        case '23514':
        case '22P02':
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'The supplied data is invalid';
          break;

        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          error = 'Internal Server Error';
          message = 'Internal server error';
      }
    }

    if (status >= 500) {
      this.logger.error(
        `Request failed: ${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );

      // Do not expose internal exception details to clients.
      message = 'Internal server error';
      error = 'Internal Server Error';
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        path: request.originalUrl,
        requestId: request.requestId ?? null,
      },
    });
  }
}
