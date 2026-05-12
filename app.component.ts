import { Component, OnInit, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snackbar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, interval, filter, takeUntil, catchError, tap, switchMap } from 'rxjs';

// Claims Processing Models
export interface Claim {
  id: string;
  claimNumber: string;
  policyId: string;
  policyNumber: string;
  customerId: string;
  customerName: string;
  incidentDate: Date;
  reportedDate: Date;
  status: ClaimStatus;
  estimatedAmount: number;
  approvedAmount?: number;
  description: string;
  adjusterId?: string;
  adjusterName?: string;
  workflowState: WorkflowState;
  paymentStatus?: PaymentStatus;
  documents: ClaimDocument[];
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaimDocument {
  id: string;
  fileName: string;
  fileType: string;
  category: string;
  uploadedAt: Date;
  url: string;
}

export interface StatusHistoryEntry {
  status: ClaimStatus;
  changedAt: Date;
  changedBy: string;
  notes?: string;
}

export enum ClaimStatus {
  Submitted = 'submitted',
  UnderReview = 'underReview',
  Approved = 'approved',
  Denied = 'denied',
  PaymentProcessing = 'paymentProcessing',
  Closed = 'closed'
}

export enum WorkflowState {
  Initial = 'initial',
  AssignmentPending = 'assignmentPending',
  InvestigationInProgress = 'investigationInProgress',
  ApprovalPending = 'approvalPending',
  PaymentAuthorized = 'paymentAuthorized',
  Completed = 'completed'
}

export enum PaymentStatus {
  Pending = 'pending',
  Authorized = 'authorized',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed'
}

export interface ClaimCreateRequest {
  policyId: string;
  incidentDate: Date;
  description: string;
  estimatedAmount: number;
  claimantInfo: {
    name: string;
    phone: string;
    email: string;
  };
}

export interface ClaimUpdateRequest {
  status?: ClaimStatus;
  adjusterId?: string;
  notes?: string;
  approvedAmount?: number;
}

// Claims Service
export class ClaimsService {
  private readonly baseUrl = '/api/claims';
  private claimsSubject = new BehaviorSubject<Claim[]>([]);
  public readonly claims$ = this.claimsSubject.asObservable();

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {
    this.loadClaims();
    // Auto-refresh claims every 30 seconds
    interval(30000).subscribe(() => this.loadClaims());
  }

  private loadClaims(): void {
    this.http.get<{items: Claim[], totalCount: number}>(`${this.baseUrl}`)
      .pipe(
        catchError(error => {
          console.error('Failed to load claims:', error);
          this.snackBar.open('Failed to load claims', 'Close', { duration: 5000 });
          return [];
        })
      )
      .subscribe(response => {
        if (Array.isArray(response)) {
          this.claimsSubject.next(response);
        } else if (response && response.items) {
          this.claimsSubject.next(response.items);
        }
      });
  }

  createClaim(request: ClaimCreateRequest): Observable<Claim> {
    return this.http.post<Claim>(this.baseUrl, request)
      .pipe(
        tap(() => {
          this.loadClaims();
          this.snackBar.open('Claim created successfully', 'Close', { duration: 3000 });
        }),
        catchError(error => {
          console.error('Failed to create claim:', error);
          this.snackBar.open('Failed to create claim', 'Close', { duration: 5000 });
          throw error;
        })
      );
  }

  updateClaimStatus(claimId: string, update: ClaimUpdateRequest): Observable<Claim> {
    return this.http.put<Claim>(`${this.baseUrl}/${claimId}`, update)
      .pipe(
        tap(() => {
          this.loadClaims();
          this.snackBar.open('Claim updated successfully', 'Close', { duration: 3000 });
        }),
        catchError(error => {
          console.error('Failed to update claim:', error);
          this.snackBar.open('Failed to update claim', 'Close', { duration: 5000 });
          throw error;
        })
      );
  }

  approveClaim(claimId: string, approvedAmount: number, notes: string): Observable<Claim> {
    return this.http.post<Claim>(`${this.baseUrl}/${claimId}/approve`, {
      approvedAmount,
      notes
    }).pipe(
      tap(() => {
        this.loadClaims();
        this.snackBar.open('Claim approved successfully', 'Close', { duration: 3000 });
      })
    );
  }

  denyClaim(claimId: string, notes: string): Observable<Claim> {
    return this.http.post<Claim>(`${this.baseUrl}/${claimId}/deny`, {
      notes
    }).pipe(
      tap(() => {
        this.loadClaims();
        this.snackBar.open('Claim denied', 'Close', { duration: 3000 });
      })
    );
  }

  assignAdjuster(claimId: string, adjusterId: string): Observable<Claim> {
    return this.http.post<Claim>(`${this.baseUrl}/${claimId}/assign`, {
      adjusterId
    }).pipe(
      tap(() => {
        this.loadClaims();
        this.snackBar.open('Adjuster assigned successfully', 'Close', { duration: 3000 });
      })
    );
  }

  processPayment(claimId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${claimId}/process-payment`, {})
      .pipe(
        tap(() => {
          this.loadClaims();
          this.snackBar.open('Payment processing initiated', 'Close', { duration: 3000 });
        })
      );
  }
}

/**
 * Main application component for the Pegasus Insurance Platform
 * Handles global app initialization, routing, and core functionality
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [
    ClaimsService
  ],
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

      <!-- Legacy Claims Processing Interface -->
      <div *ngIf="currentView && !isLoading" class="legacy-claims-interface">
        <!-- Main Application Layout -->
        <mat-toolbar color="primary" class="main-toolbar">
          <button mat-icon-button (click)="sidenav.toggle()" class="menu-button">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="app-title">Pegasus Claims Processing</span>
          <span class="spacer"></span>

          <!-- Claims Statistics -->
          <div class="stats-chips">
            <mat-chip-listbox>
              <mat-chip color="primary" [matBadge]="getClaimsByStatus('submitted').length">
                Submitted
              </mat-chip>
              <mat-chip color="accent" [matBadge]="getClaimsByStatus('underReview').length">
                Under Review
              </mat-chip>
              <mat-chip color="warn" [matBadge]="getClaimsByStatus('paymentProcessing').length">
                Payment Processing
              </mat-chip>
            </mat-chip-listbox>
          </div>

          <button mat-icon-button>
            <mat-icon>notifications</mat-icon>
          </button>
        </mat-toolbar>

        <mat-sidenav-container class="sidenav-container">
          <mat-sidenav #sidenav mode="side" opened class="sidenav">
            <mat-nav-list>
              <a mat-list-item (click)="currentView = 'dashboard'" [class.active]="currentView === 'dashboard'">
                <mat-icon matListItemIcon>dashboard</mat-icon>
                <span matListItemTitle>Dashboard</span>
              </a>
              <a mat-list-item (click)="currentView = 'claims'" [class.active]="currentView === 'claims'">
                <mat-icon matListItemIcon>assignment</mat-icon>
                <span matListItemTitle>Claims Management</span>
              </a>
              <a mat-list-item (click)="currentView = 'workflow'" [class.active]="currentView === 'workflow'">
                <mat-icon matListItemIcon>alt_route</mat-icon>
                <span matListItemTitle>Workflow Engine</span>
              </a>
              <a mat-list-item (click)="currentView = 'approvals'" [class.active]="currentView === 'approvals'">
                <mat-icon matListItemIcon>thumb_up</mat-icon>
                <span matListItemTitle>Approvals</span>
              </a>
              <a mat-list-item (click)="currentView = 'payments'" [class.active]="currentView === 'payments'">
                <mat-icon matListItemIcon>payment</mat-icon>
                <span matListItemTitle>Payment Processing</span>
              </a>
            </mat-nav-list>
          </mat-sidenav>

          <mat-sidenav-content class="main-content">
            <!-- Dashboard View -->
            <div *ngIf="currentView === 'dashboard'" class="view-container">
              <h2>Claims Processing Dashboard</h2>

              <div class="dashboard-cards">
                <!-- Dashboard content continues here -->
              </div>
            </div>
          </mat-sidenav-content>
        </mat-sidenav-container>
      </div>

      <!-- Main Content Area -->
      <main class="app-main" [class.with-header]="isAuthenticated" *ngIf="!currentView">
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

    .legacy-claims-interface {
      flex: 1;
    }

    .main-toolbar {
      position: relative;
      z-index: 999;
    }

    .sidenav-container {
      height: calc(100vh - 128px);
    }

    .sidenav {
      width: 250px;
    }

    .view-container {
      padding: 24px;
    }

    .stats-chips {
      margin-right: 16px;
    }

    .spacer {
      flex: 1;
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
  currentView: string = 'dashboard';

  // User information
  currentUser: { name: string; role: string; email: string } | null = null;

  // Claims data
  claims: Claim[] = [];

  // Subscription management
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private titleService: Title,
    private metaService: Meta,
    private claimsService: ClaimsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.initializeMetadata();
  }

  ngOnInit(): void {
    this.initializeApplication();
    this.setupRouterTracking();
    this.loadClaimsData();
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
   * Initialize the application with necessary setup
   */
  private initializeApplication(): void {
    // Simulate authentication check
    setTimeout(() => {
      this.isAuthenticated = true;
      this.currentUser = {
        name: 'John Administrator',
        role: 'Claims Manager',
        email: 'admin@pegasus.com'
      };
      this.isLoading = false;
    }, 2000);
  }

  /**
   * Setup router event tracking for navigation
   */
  private setupRouterTracking(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        // Update page title based on route
        this.updatePageTitle(event.url);
      });
  }

  /**
   * Load claims data from service
   */
  private loadClaimsData(): void {
    this.claimsService.claims$
      .pipe(takeUntil(this.destroy$))
      .subscribe(claims => {
        this.claims = claims;
      });
  }

  /**
   * Hide initial application loader
   */
  private hideInitialLoader(): void {
    setTimeout(() => {
      const loader = document.querySelector('.initial-loader');
      if (loader) {
        loader.remove();
      }
    }, 1000);
  }

  /**
   * Update page title based on current route
   */
  private updatePageTitle(url: string): void {
    let pageTitle = this.title;
    
    if (url.includes('/dashboard')) {
      pageTitle += ' - Dashboard';
    } else if (url.includes('/claims')) {
      pageTitle += ' - Claims Management';
    } else if (url.includes('/policies')) {
      pageTitle += ' - Policies';
    }
    
    this.titleService.setTitle(pageTitle);
  }

  /**
   * Get claims filtered by status
   */
  getClaimsByStatus(status: string): Claim[] {
    return this.claims.filter(claim => claim.status === status);
  }

  /**
   * Handle user logout
   */
  logout(): void {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.router.navigate(['/login']);
    this.snackBar.open('Logged out successfully', 'Close', { duration: 3000 });
  }

  /**
   * Dismiss global error message
   */
  dismissError(): void {
    this.globalError = null;
  }
}
