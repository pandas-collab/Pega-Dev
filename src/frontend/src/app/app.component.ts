import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container" [class.authenticated]="isAuthenticated">
      <app-header *ngIf="isAuthenticated" (menuToggle)="toggleSidenav()"></app-header>

      <mat-sidenav-container class="sidenav-container" [class.authenticated]="isAuthenticated">
        <mat-sidenav
          #sidenav
          mode="side"
          [opened]="sidenavOpen && isAuthenticated"
          class="app-sidenav">
          <app-sidebar *ngIf="isAuthenticated"></app-sidebar>
        </mat-sidenav>

        <mat-sidenav-content class="main-content">
          <div class="content-wrapper" [class.with-padding]="isAuthenticated">
            <router-outlet></router-outlet>
          </div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .sidenav-container {
      flex: 1;
    }

    .app-sidenav {
      width: 260px;
      border-right: 1px solid #e0e0e0;
    }

    .main-content {
      background-color: #fafafa;
    }

    .content-wrapper.with-padding {
      padding: 20px;
    }

    .content-wrapper {
      min-height: 100%;
    }

    .app-container:not(.authenticated) .content-wrapper {
      padding: 0;
      background: white;
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'Pegasus Insurance Platform';
  isAuthenticated = false;
  sidenavOpen = true;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Monitor authentication status
    this.authService.isAuthenticated$.subscribe(
      authenticated => {
        this.isAuthenticated = authenticated;
        if (!authenticated) {
          this.router.navigate(['/auth/login']);
        }
      }
    );

    // Close sidenav on mobile after navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (window.innerWidth < 768) {
        this.sidenavOpen = false;
      }
    });
  }

  toggleSidenav() {
    this.sidenavOpen = !this.sidenavOpen;
  }

  onMenuToggle() {
    this.sidenavOpen = !this.sidenavOpen;
  }

  logout() {
    this.authService.logout();
  }
}
