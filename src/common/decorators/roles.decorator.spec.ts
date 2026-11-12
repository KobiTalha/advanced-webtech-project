import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { Roles, ROLES_KEY } from './roles.decorator';

@Roles(UserRole.ADMIN)
class RoleFixture {
  @Roles(UserRole.INSTRUCTOR, UserRole.TA)
  teaching(this: void) {
    return 'teaching';
  }

  inherited(this: void) {
    return 'inherited';
  }

  @Roles()
  unrestricted(this: void) {
    return 'unrestricted';
  }
}

describe('Roles decorator', () => {
  const reflector = new Reflector();

  it('stores a single role on the class under the reference metadata key', () => {
    expect(ROLES_KEY).toBe('roles');
    expect(reflector.get('roles', RoleFixture)).toEqual([UserRole.ADMIN]);
  });

  it('stores all allowed roles on the decorated handler', () => {
    expect(reflector.get(ROLES_KEY, RoleFixture.prototype.teaching)).toEqual([
      UserRole.INSTRUCTOR,
      UserRole.TA,
    ]);
  });

  it('allows handler metadata to override class metadata during lookup', () => {
    expect(
      reflector.getAllAndOverride(ROLES_KEY, [
        RoleFixture.prototype.teaching,
        RoleFixture,
      ]),
    ).toEqual([UserRole.INSTRUCTOR, UserRole.TA]);
  });

  it('falls back to class roles for a handler without its own metadata', () => {
    expect(
      reflector.getAllAndOverride(ROLES_KEY, [
        RoleFixture.prototype.inherited,
        RoleFixture,
      ]),
    ).toEqual([UserRole.ADMIN]);
  });

  it('does not copy handler roles to a sibling handler', () => {
    expect(
      reflector.get(ROLES_KEY, RoleFixture.prototype.inherited),
    ).toBeUndefined();
  });

  it('preserves an explicitly empty role list instead of inheriting class roles', () => {
    expect(
      reflector.getAllAndOverride(ROLES_KEY, [
        RoleFixture.prototype.unrestricted,
        RoleFixture,
      ]),
    ).toEqual([]);
  });
});
