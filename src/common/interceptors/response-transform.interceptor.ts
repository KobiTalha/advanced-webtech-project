import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';

import { Observable, map } from 'rxjs';
import { Request } from 'express';

interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class ResponseTransformInterceptor
  implements NestInterceptor {

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {

    const request = context
      .switchToHttp()
      .getRequest<RequestWithId>();

    const requestId = request.requestId;

    return next.handle().pipe(
      map((response) => {

        // Avoid wrapping an already standardized response.
        if (
          response &&
          typeof response === 'object' &&
          response.success === true &&
          response.meta
        ) {
          return response;
        }

        const hasPagination =
          response &&
          typeof response === 'object' &&
          response.pagination &&
          Object.prototype.hasOwnProperty.call(response, 'data');

        return {
          success: true,
          message:
            response && typeof response === 'object' && response.message
              ? response.message
              : 'Request successful',
          data: hasPagination ? response.data : response,
          meta: {
            ...(hasPagination ? response.pagination : {}),
            timestamp: new Date().toISOString(),
            requestId,
          },
        };
      }),
    );
  }
}
