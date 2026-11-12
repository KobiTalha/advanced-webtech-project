import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

class RouteFixture {
  @Public()
  publicRoute(this: void) {
    return 'public';
  }

  protectedRoute(this: void) {
    return 'protected';
  }
}

@Public()
class PublicClassFixture {
  route(this: void) {
    return 'class-level public route';
  }
}

describe('Public decorator', () => {
  const reflector = new Reflector();

  it('marks the decorated handler public using the reference metadata key', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
    expect(reflector.get('isPublic', RouteFixture.prototype.publicRoute)).toBe(
      true,
    );
  });

  it('supports public metadata on a controller class', () => {
    expect(reflector.get(IS_PUBLIC_KEY, PublicClassFixture)).toBe(true);
    expect(
      reflector.getAllAndOverride(IS_PUBLIC_KEY, [
        PublicClassFixture.prototype.route,
        PublicClassFixture,
      ]),
    ).toBe(true);
  });

  it('does not mark the enclosing class public when decorating one handler', () => {
    expect(reflector.get(IS_PUBLIC_KEY, RouteFixture)).toBeUndefined();
  });

  it('does not make an undecorated sibling route public', () => {
    expect(
      reflector.getAllAndOverride(IS_PUBLIC_KEY, [
        RouteFixture.prototype.protectedRoute,
        RouteFixture,
      ]),
    ).toBeUndefined();
  });
});
