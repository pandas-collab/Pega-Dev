import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth(route);
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth(childRoute);
  }

  private checkAuth(route: ActivatedRouteSnapshot): boolean {
    if (this.authService.isAuthenticated()) {
      // Check for required roles
      const requiredRoles = route.data?.['roles'] as string[];
      if (requiredRoles) {
        const hasRequiredRole = requiredRoles.some(role => this.authService.hasRole(role));
        if (!hasRequiredRole) {
          this.router.navigate(['/unauthorized']);
          return false;
        }
      }

      // Check for required permissions
      const requiredPermissions = route.data?.['permissions'] as string[];
      if (requiredPermissions) {
        const hasRequiredPermission = requiredPermissions.some(permission =>
          this.authService.hasPermission(permission)
        );
        if (!hasRequiredPermission) {
          this.router.navigate(['/unauthorized']);
          return false;
        }
      }

      return true;
    }

    this.router.navigate(['/login']);
    return false;
  }
}
