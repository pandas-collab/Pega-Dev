import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container" [class.authenticated]="isAuthenticated">
      <app-header *ngIf="isAuthenticated" (menuToggle)="onMenuToggle()"></app-header>

      <mat-sidenav-container class="app-sidenav-container" [class.authenticated]="isAuthenticated">
        <mat-sidenav
          #sidenav
          mode="side"
          [opened]="sidenavOpened && isAuthenticated"
          class="app-sidenav">
          <app-sidebar *ngIf="isAuthenticated"></app-sidebar>
        </mat-sidenav>

        <mat-sidenav-content class="app-content">
          <router-outlet></router-outlet>
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

    .app-sidenav-container {
      flex: 1;
    }

    .app-sidenav {
      width: 250px;
      background: #fafafa;
      border-right: 1px solid #e0e0e0;
    }

    .app-content {
      padding: 20px;
      background: #f5f5f5;
      min-height: 100%;
    }

    .app-container:not(.authenticated) .app-content {
      padding: 0;
      background: white;
    }
  `]
})
export class AppComponent implements OnInit {
  isAuthenticated = false;
  sidenavOpened = true;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.isAuthenticated$.subscribe(
      authenticated => {
        this.isAuthenticated = authenticated;
        if (!authenticated) {
          this.router.navigate(['/auth/login']);
        }
      }
    );
  }

  onMenuToggle() {
    this.sidenavOpened = !this.sidenavOpened;
  }
}
