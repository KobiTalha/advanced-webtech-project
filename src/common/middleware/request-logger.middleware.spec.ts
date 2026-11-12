import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequestLoggerMiddleware } from './request-logger.middleware';

function createRequest(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 'request-123',
    method: 'POST',
    originalUrl: '/api/example?limit=5',
    ip: '127.0.0.1',
    headers: { authorization: 'Bearer private-token' },
    body: { password: 'private-password' },
    ...overrides,
  } as unknown as Request;
}

function createResponse() {
  return Object.assign(new EventEmitter(), { statusCode: 200 });
}

describe('RequestLoggerMiddleware', () => {
  let middleware: RequestLoggerMiddleware;
  let logSpy: jest.SpyInstance;
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
    middleware = new RequestLoggerMiddleware();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the finish listener and calls next immediately without logging', () => {
    const response = createResponse();
    const next = jest.fn(() => {
      expect(response.listenerCount('finish')).toBe(1);
    });

    middleware.use(createRequest(), response as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs the completed response status and elapsed time without headers or body', () => {
    const response = createResponse();
    middleware.use(createRequest(), response as unknown as Response, jest.fn());
    response.statusCode = 201;
    nowSpy.mockReturnValue(1042);

    response.emit('finish');

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith({
      requestId: 'request-123',
      method: 'POST',
      url: '/api/example?limit=5',
      statusCode: 201,
      duration: '42ms',
      ip: '127.0.0.1',
    });
  });

  it('does not log a close event without a finished response', () => {
    const response = createResponse();
    middleware.use(createRequest(), response as unknown as Response, jest.fn());

    response.emit('close');

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs without requiring a request ID from another middleware', () => {
    const response = createResponse();
    middleware.use(
      createRequest({ requestId: undefined }),
      response as unknown as Response,
      jest.fn(),
    );

    response.emit('finish');

    expect(logSpy).toHaveBeenCalledWith({
      requestId: undefined,
      method: 'POST',
      url: '/api/example?limit=5',
      statusCode: 200,
      duration: '0ms',
      ip: '127.0.0.1',
    });
  });

  it('keeps request IDs and timing independent for overlapping requests', () => {
    const firstResponse = createResponse();
    const secondResponse = createResponse();
    middleware.use(
      createRequest({ requestId: 'first' }),
      firstResponse as unknown as Response,
      jest.fn(),
    );
    nowSpy.mockReturnValue(1010);
    middleware.use(
      createRequest({ requestId: 'second' }),
      secondResponse as unknown as Response,
      jest.fn(),
    );
    nowSpy.mockReturnValue(1030);
    secondResponse.emit('finish');
    nowSpy.mockReturnValue(1050);
    firstResponse.emit('finish');

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ requestId: 'second', duration: '20ms' }),
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ requestId: 'first', duration: '50ms' }),
    );
  });

  it('preserves request details captured before downstream handlers run', () => {
    const request = createRequest();
    const response = createResponse();
    middleware.use(request, response as unknown as Response, () => {
      request.method = 'PATCH';
      request.originalUrl = '/rewritten';
      response.statusCode = 500;
    });

    response.emit('finish');

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/api/example?limit=5',
        statusCode: 500,
      }),
    );
  });
});
