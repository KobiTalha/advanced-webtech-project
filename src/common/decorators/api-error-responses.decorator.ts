import {
  applyDecorators,
} from '@nestjs/common';

import {
  ApiResponse,
} from '@nestjs/swagger';

export function ApiCommonErrors() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Bad request or validation failure',
    }),
    ApiResponse({
      status: 401,
      description: 'Authentication required',
    }),
    ApiResponse({
      status: 403,
      description: 'Insufficient permissions',
    }),
    ApiResponse({
      status: 404,
      description: 'Resource not found',
    }),
    ApiResponse({
      status: 409,
      description: 'Database or business-rule conflict',
    }),
    ApiResponse({
      status: 500,
      description: 'Unexpected server error',
    }),
  );
}