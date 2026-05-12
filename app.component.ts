import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Subject, filter, takeUntil } from 'rxjs';

/**
 * Main application component for the Pegasus Insurance Platform
 * Handles global app initialization, routing, and core functionality
 */
@Component({
  selector: 'peg-root',
  template: `
    <div class="pegasus-app" [class.loading]="isLoading">
      <!-- Application Header -->
      <header class="app-header" *ngIf="!isLoading">
        <nav class="nav-container">
          <div class="nav-brand">
            <img src="assets/images/pegasus-logo.png" alt="Pegasus Insurance" class="brand-logo">
            <span class="brand-text">Pegasus Platform</span>
          </div>

          <div class="nav-menu" *ngIf="isAuthenticated">
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
              <mat-icon>dashboard</mat-icon>
              Dashboard
            </a>
            <a routerLink="/policies" routerLinkActive="active" class="nav-link">
              <mat-icon>policy</mat-icon>
              Policies
            </a>
            <a routerLink="/claims" routerLinkActive="active" class="nav-link">
              <mat-icon>assignment</mat-icon>
              Claims
            </a>
            <a routerLink="/documents" routerLinkActive="active" class="nav-link">
              <mat-icon>folder</mat-icon>
              Documents
            </a>
            <a routerLink="/reports" routerLinkActive="active" class="nav-link">
              <mat-icon>analytics</mat-icon>
              Reports
            </a>
          </div>

          <div class="nav-actions" *ngIf="isAuthenticated">
            <button mat-icon-button [matMenuTriggerFor]="userMenu" class="user-menu-trigger">
              <mat-icon>account_circle</mat-icon>
            </button>
            <mat-menu #userMenu="matMenu">
              <div class="user-info">
                <span class="user-name">{{ currentUser?.name }}</span>
                <span class="user-role">{{ currentUser?.role }}</span>
              </div>
              <mat-divider></mat-divider>
              <button mat-menu-item routerLink="/profile">
                <mat-icon>person</mat-icon>
                Profile
              </button>
              <button mat-menu-item routerLink="/settings">
                <mat-icon>settings</mat-icon>
                Settings
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="logout()" class="logout-item">
                <mat-icon>logout</mat-icon>
                Logout
              </button>
            </mat-menu>
          </div>
        </nav>
      </header>

      <!-- Main Content Area -->
      <main class="app-main" [class.with-header]="isAuthenticated">
        <!-- Loading Indicator -->
        <div class="loading-overlay" *ngIf="isLoading">
          <mat-spinner diameter="60" color="primary"></mat-spinner>
          <p class="loading-text">{{ loadingMessage }}</p>
        </div>

        <!-- Router Outlet for Page Content -->
        <router-outlet *ngIf="!isLoading"></router-outlet>

        <!-- Global Error Messages -->
        <div class="global-error" *ngIf="globalError" [@slideIn]>
          <mat-card class="error-card">
            <mat-card-content>
              <div class="error-content">
                <mat-icon class="error-icon">error</mat-icon>
                <div class="error-details">
                  <h3>Something went wrong</h3>
                  <p>{{ globalError.message }}</p>
                  <button mat-raised-button color="primary" (click)="dismissError()">
                    Dismiss
                  </button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </main>

      <!-- Footer -->
      <footer class="app-footer" *ngIf="!isLoading">
        <div class="footer-content">
          <span class="footer-text">
             {{ currentYear }} Pegasus Insurance Platform v{{ appVersion }}
          </span>
          <div class="footer-links">
            <a href="/privacy" class="footer-link">Privacy Policy</a>
            <a href="/terms" class="footer-link">Terms of Service</a>
            <a href="/support" class="footer-link">Support</a>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .pegasus-app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #fafafa;
    }

    .app-header {
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .nav-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      height: 64px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      color: white;
    }

    .brand-logo {
      height: 40px;
      width: auto;
    }

    .brand-text {
      font-size: 20px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    .nav-menu {
      display: flex;
      gap: 8px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      color: rgba(255,255,255,0.87);
      text-decoration: none;
      border-radius: 4px;
      transition: all 0.2s ease;
      font-size: 14px;
      font-weight: 500;
    }

    .nav-link:hover {
      background-color: rgba(255,255,255,0.1);
      color: white;
    }

    .nav-link.active {
      background-color: rgba(255,255,255,0.15);
      color: white;
    }

    .nav-actions {
      display: flex;
      align-items: center;
    }

    .user-menu-trigger {
      color: white;
    }

    .user-info {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-weight: 500;
      font-size: 14px;
    }

    .user-role {
      font-size: 12px;
      color: rgba(0,0,0,0.6);
    }

    .logout-item {
      color: #d32f2f;
    }

    .app-main {
      flex: 1;
      position: relative;
    }

    .app-main.with-header {
      padding-top: 0;
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255,255,255,0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    .loading-text {
      margin-top: 16px;
      font-size: 16px;
      color: rgba(0,0,0,0.7);
    }

    .global-error {
      position: fixed;
      top: 80px;
      right: 24px;
      z-index: 1000;
      max-width: 400px;
    }

    .error-card {
      background: #ffebee;
      border-left: 4px solid #d32f2f;
    }

    .error-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .error-icon {
      color: #d32f2f;
      margin-top: 2px;
    }

    .error-details h3 {
      margin: 0 0 8px 0;
      color: #d32f2f;
      font-size: 16px;
    }

    .error-details p {
      margin: 0 0 12px 0;
      color: rgba(0,0,0,0.7);
      font-size: 14px;
    }

    .app-footer {
      background-color: #f5f5f5;
      border-top: 1px solid #e0e0e0;
      padding: 16px 24px;
      margin-top: auto;
    }

    .footer-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-text {
      color: rgba(0,0,0,0.6);
      font-size: 14px;
    }

    .footer-links {
      display: flex;
      gap: 24px;
    }

    .footer-link {
      color: rgba(0,0,0,0.6);
      text-decoration: none;
      font-size: 14px;
      transition: color 0.2s ease;
    }

    .footer-link:hover {
      color: #1976d2;
    }

    @media (max-width: 768px) {
      .nav-menu {
        display: none;
      }

      .footer-content {
        flex-direction: column;
        gap: 12px;
      }

      .global-error {
        left: 16px;
        right: 16px;
        top: 16px;
        max-width: none;
      }
    }
  `],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit, OnDestroy {
  // Component properties
  readonly title = 'Pegasus Insurance Platform';
  readonly appVersion = '1.0.0';
  readonly currentYear = new Date().getFullYear();

  // State management
  isLoading = true;
  isAuthenticated = false;
  loadingMessage = 'Initializing application...';
  globalError: { message: string; details?: any } | null = null;

  // User information
  currentUser: { name: string; role: string; email: string } | null = null;

  // Subscription management
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private titleService: Title,
    private metaService: Meta
  ) {
    this.initializeMetadata();
  }

  ngOnInit(): void {
    this.initializeApplication();
    this.setupRouterTracking();
    this.hideInitialLoader();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize application metadata and SEO tags
   */
  private initializeMetadata(): void {
    this.titleService.setTitle(this.title);

    this.metaService.updateTag({
      name: 'description',
      content: 'Comprehensive insurance platform for policy and claims management'
    });

    this.metaService.updateTag({
      name: 'keywords',
      content: 'insurance, policies, claims, management, platform'
    });

    this.metaService.updateTag({
      property: 'og:title',
      content: this.title
    });

    this.metaService.updateTag({
      property: 'og:type',
      content: 'website'
    });
  }

  /**
   * Initialize the application with necessary services and authentication check
   */
  private async initializeApplication(): Promise<void> {
    try {
      this.loadingMessage = 'Checking authentication...';

      // Simulate authentication check
      await this.checkAuthentication();

      this.loadingMessage = 'Loading user preferences...';

      // Simulate loading user data
      await this.loadUserData();

      this.loadingMessage = 'Finalizing setup...';

      // Final initialization delay
      await this.delay(800);

      this.isLoading = false;

    } catch (error) {
      console.error('Application initialization failed:', error);
      this.globalError = {
        message: 'Failed to initialize application. Please refresh the page.',
        details: error
      };
      this.isLoading = false;
    }
  }

  /**
   * Check user authentication status
   */
  private async checkAuthentication(): Promise<void> {
    // Simulate API call delay
    await this.delay(1000);

    // For demo purposes, simulate authentication
    const token = localStorage.getItem('pegasus-auth-token');
    this.isAuthenticated = !!token || false;

    // Redirect to login if not authenticated and not on public route
    if (!this.isAuthenticated && !this.isPublicRoute()) {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Load current user data
   */
  private async loadUserData(): Promise<void> {
    if (!this.isAuthenticated) return;

    // Simulate API call delay
    await this.delay(600);

    // For demo purposes, set mock user data
    this.currentUser = {
      name: 'John Doe',
      role: 'Insurance Agent',
      email: 'john.doe@pegasus-insurance.com'
    };
  }

  /**
   * Setup router event tracking for analytics and page titles
   */
  private setupRouterTracking(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        // Update page title based on route
        this.updatePageTitle(event.urlAfterRedirects);

        // Track page views (integrate with analytics service)
        this.trackPageView(event.urlAfterRedirects);
      });
  }

  /**
   * Update page title based on current route
   */
  private updatePageTitle(url: string): void {
    let pageTitle = this.title;

    if (url.includes('/dashboard')) {
      pageTitle = 'Dashboard - ' + this.title;
    } else if (url.includes('/policies')) {
      pageTitle = 'Policies - ' + this.title;
    } else if (url.includes('/claims')) {
      pageTitle = 'Claims - ' + this.title;
    } else if (url.includes('/documents')) {
      pageTitle = 'Documents - ' + this.title;
    } else if (url.includes('/reports')) {
      pageTitle = 'Reports - ' + this.title;
    }

    this.titleService.setTitle(pageTitle);
  }

  /**
   * Track page views for analytics
   */
  private trackPageView(url: string): void {
    // Implement analytics tracking here
    console.log('Page view tracked:', url);
  }

  /**
   * Check if current route is public (doesn't require authentication)
   */
  private isPublicRoute(): boolean {
    const publicRoutes = ['/auth', '/forgot-password', '/privacy', '/terms'];
    const currentUrl = this.router.url;
    return publicRoutes.some(route => currentUrl.startsWith(route));
  }

  /**
   * Hide the initial loading screen
   */
  private hideInitialLoader(): void {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      setTimeout(() => {
        loader.style.display = 'none';
        document.body.classList.add('app-loaded');
      }, 100);
    }
  }

  /**
   * Handle user logout
   */
  logout(): void {
    // Clear authentication data
    localStorage.removeItem('pegasus-auth-token');
    localStorage.removeItem('pegasus-refresh-token');

    // Reset application state
    this.isAuthenticated = false;
    this.currentUser = null;

    // Navigate to login
    this.router.navigate(['/auth/login']);
  }

  /**
   * Dismiss global error message
   */
  dismissError(): void {
    this.globalError = null;
  }

  /**
   * Utility method to create delays for demo purposes
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
