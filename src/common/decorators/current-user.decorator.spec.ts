import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

class CurrentUserFixture {
  route(
    @CurrentUser() user: unknown,
    @CurrentUser('id') id: unknown,
    @CurrentUser('is_active') active: unknown,
    @CurrentUser('missing') missing: unknown,
  ) {
    return { user, id, active, missing };
  }
}

interface ParameterMetadata {
  index: number;
  data: string | undefined;
  factory: (data: string | undefined, context: ExecutionContext) => unknown;
}

function resolveParameter(
  index: number,
  request: { user?: Record<string, unknown> | null },
) {
  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    CurrentUserFixture,
    'route',
  ) as Record<string, ParameterMetadata>;
  const parameter = Object.values(metadata).find(
    (entry) => entry.index === index,
  );
  if (!parameter) {
    throw new Error(`Missing decorator metadata for parameter ${index}`);
  }

  const getRequest = jest.fn().mockReturnValue(request);
  const switchToHttp = jest.fn().mockReturnValue({ getRequest });
  const context = { switchToHttp } as unknown as ExecutionContext;
  const result = parameter.factory(parameter.data, context);

  expect(switchToHttp).toHaveBeenCalledTimes(1);
  expect(getRequest).toHaveBeenCalledTimes(1);
  return result;
}

describe('CurrentUser decorator', () => {
  const user = { id: 'user-123', role: 'ADMIN', is_active: false };

  it('returns the original request user when no property is requested', () => {
    expect(resolveParameter(0, { user })).toBe(user);
  });

  it('returns the selected user property', () => {
    expect(resolveParameter(1, { user })).toBe('user-123');
  });

  it('preserves a false property value', () => {
    expect(resolveParameter(2, { user })).toBe(false);
  });

  it('returns undefined for an absent user property', () => {
    expect(resolveParameter(3, { user })).toBeUndefined();
  });

  it('returns undefined when the request has no user', () => {
    expect(resolveParameter(0, {})).toBeUndefined();
  });

  it('safely handles property selection when the request has no user', () => {
    expect(resolveParameter(1, {})).toBeUndefined();
  });

  it('safely handles property selection when the user is null', () => {
    expect(resolveParameter(1, { user: null })).toBeUndefined();
  });

  it('reads each request independently without retaining a previous user', () => {
    expect(resolveParameter(1, { user })).toBe('user-123');
    expect(resolveParameter(1, { user: { id: 'user-456' } })).toBe('user-456');
    expect(resolveParameter(1, {})).toBeUndefined();
  });
});
