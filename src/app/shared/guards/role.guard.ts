import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { map, filter, take } from 'rxjs/operators';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = route.data['roles'] as string[];

  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }

  return authService.currentUserProfile$.pipe(
    filter(profile => profile !== null),
    take(1),
    map((userProfile) => {
      if (!userProfile) {
        router.navigate(['/auth/login']);
        return false;
      }

      const hasRole = userProfile.roles.some((role) =>
        expectedRoles.includes(role)
      );

      if (hasRole) {
        return true;
      }

      const defaultRoleRoute = getDefaultRouteForRoles(userProfile.roles);
      router.navigate([defaultRoleRoute]);
      return false;
    })
  );
};

function getDefaultRouteForRoles(roles: string[]): string {
  if (roles.includes('administrador')) return '/metricas';
  if (roles.includes('guardia')) return '/escanear-qr';
  if (roles.includes('conductor') || roles.includes('usuario')) return '/';
  
  return '/auth/login';
}