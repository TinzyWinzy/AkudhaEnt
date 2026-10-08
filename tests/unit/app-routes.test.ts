import { describe, expect, it } from 'vitest';
import { APP_ROUTE_PATH, canAccessRoute, defaultRouteFor, routeFromPath } from '../../src/lib/appRoutes';
import { Role, type UserClaims } from '../../src/types/auth';

const user = (role: Role): UserClaims => ({
  id: 'user-1',
  organizationId: 'akudha',
  staffId: 'AKU-TEST',
  name: 'Akudha User',
  role,
});

describe('application routes', () => {
  it('maps durable paths to application destinations', () => {
    expect(routeFromPath('/app')).toBe('home');
    expect(routeFromPath('/app/inventory')).toBe('inventory');
    expect(routeFromPath('/app/sourcing')).toBe('harvest');
    expect(routeFromPath('/app/operations')).toBe('operations');
    expect(routeFromPath('/app/unknown')).toBeNull();
    expect(APP_ROUTE_PATH.distribute).toBe('/app/distribution');
  });

  it('keeps administrator operations restricted to super administrators', () => {
    expect(canAccessRoute(user(Role.SUPER_ADMIN), 'operations')).toBe(true);
    expect(canAccessRoute(user(Role.PROCESSING_ADMIN), 'operations')).toBe(false);
    expect(canAccessRoute(user(Role.DISTRIBUTION_MANAGER), 'operations')).toBe(false);
    expect(canAccessRoute(user(Role.FIELD_COORDINATOR), 'operations')).toBe(false);
  });

  it('sends field coordinators to sourcing and other roles to their work queue', () => {
    expect(defaultRouteFor(user(Role.FIELD_COORDINATOR))).toBe('harvest');
    expect(defaultRouteFor(user(Role.PROCESSING_ADMIN))).toBe('home');
    expect(defaultRouteFor(user(Role.SUPER_ADMIN))).toBe('home');
  });
});
