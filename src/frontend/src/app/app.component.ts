import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <mat-toolbar color="primary" *ngIf="isAuthenticated">
        <span>Pegasus Insurance</span>
        <span class="spacer"></span>
        <button mat-button routerLink="/dashboard">Dashboard</button>
        <button mat-button routerLink="/policies">Policies</button>
        <button mat-button routerLink="/claims">Claims</button>
        <button mat-button routerLink="/documents">Documents</button>
        <button mat-button (click)="logout()">Logout</button>
      </mat-toolbar>

      <main class="main-content" [class.authenticated]="isAuthenticated">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .main-content {
      flex: 1;
      overflow: auto;
      padding: 20px;
    }
    .main-content.authenticated {
      background-color: #f5f5f5;
    }
  `]
})
export class AppComponent implements OnInit {
  isAuthenticated = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Monitor authentication status securely
    this.authService.isAuthenticated$.subscribe(
      (authenticated) => {
        this.isAuthenticated = authenticated;
        if (!authenticated && this.router.url !== '/login') {
          this.router.navigate(['/login']);
        }
      }
    );
  }

  logout() {
    this.authService.logout();
  }
}
