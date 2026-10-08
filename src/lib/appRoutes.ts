import { Role, type UserClaims } from '../types/auth';
import { VISIBLE_TABS } from './permissions';

export type AppRoute = 'home' | 'inventory' | 'harvest' | 'process' | 'distribute' | 'operations';

export const APP_ROUTE_PATH: Record<AppRoute, string> = {
  home: '/app',
  inventory: '/app/inventory',
  harvest: '/app/sourcing',
  process: '/app/processing',
  distribute: '/app/distribution',
  operations: '/app/operations',
};

const PATH_ROUTE = new Map(Object.entries(APP_ROUTE_PATH).map(([route, path]) => [path, route as AppRoute]));

export function routeFromPath(pathname: string): AppRoute | null {
  return PATH_ROUTE.get(pathname) ?? null;
}

export function canAccessRoute(user: UserClaims, route: AppRoute): boolean {
  if (route === 'home') return true;
  if (route === 'operations') return user.role === Role.SUPER_ADMIN;
  return (VISIBLE_TABS[user.role] ?? []).includes(route);
}

export function defaultRouteFor(user: UserClaims): AppRoute {
  if (user.role === Role.FIELD_COORDINATOR) return 'harvest';
  return 'home';
}
