import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { Observable, BehaviorSubject, Subject, interval } from 'rxjs';
import { takeUntil, catchError, tap, switchMap } from 'rxjs/operators';

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

// Main Application Component
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
            <mat-card class="stat-card">
              <mat-card-header>
                <mat-card-title>Total Claims</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="stat-number">{{claims.length}}</div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-header>
                <mat-card-title>Pending Approval</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="stat-number">{{getClaimsByStatus('underReview').length}}</div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-header>
                <mat-card-title>Processing Payments</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="stat-number">{{getClaimsByStatus('paymentProcessing').length}}</div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-header>
                <mat-card-title>Total Value</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="stat-number">\${{getTotalClaimsValue() | number:'1.0-2'}}</div>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Recent Claims -->
          <mat-card class="recent-claims">
            <mat-card-header>
              <mat-card-title>Recent Claims Activity</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-list>
                <mat-list-item *ngFor="let claim of getRecentClaims()">
                  <mat-icon matListItemIcon [class]="'status-' + claim.status">assignment</mat-icon>
                  <div matListItemTitle>{{claim.claimNumber}} - {{claim.customerName}}</div>
                  <div matListItemLine>\${{claim.estimatedAmount | number:'1.0-2'}} - {{claim.status | titlecase}}</div>
                  <button mat-icon-button (click)="selectClaim(claim)">
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </mat-list-item>
              </mat-list>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Claims Management View -->
        <div *ngIf="currentView === 'claims'" class="view-container">
          <div class="view-header">
            <h2>Claims Management</h2>
            <button mat-raised-button color="primary" (click)="openCreateClaimDialog()">
              <mat-icon>add</mat-icon>
              New Claim
            </button>
          </div>

          <!-- Claims Table -->
          <mat-card class="claims-table-card">
            <mat-card-content>
              <mat-table [dataSource]="claims" class="claims-table" matSort>
                <ng-container matColumnDef="claimNumber">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Claim Number</mat-header-cell>
                  <mat-cell *matCellDef="let claim">{{claim.claimNumber}}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="customerName">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Customer</mat-header-cell>
                  <mat-cell *matCellDef="let claim">{{claim.customerName}}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="status">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Status</mat-header-cell>
                  <mat-cell *matCellDef="let claim">
                    <mat-chip [class]="'status-chip status-' + claim.status">
                      {{claim.status | titlecase}}
                    </mat-chip>
                  </mat-cell>
                </ng-container>

                <ng-container matColumnDef="estimatedAmount">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Amount</mat-header-cell>
                  <mat-cell *matCellDef="let claim">\${{claim.estimatedAmount | number:'1.0-2'}}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="adjusterName">
                  <mat-header-cell *matHeaderCellDef>Adjuster</mat-header-cell>
                  <mat-cell *matCellDef="let claim">{{claim.adjusterName || 'Unassigned'}}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <mat-header-cell *matHeaderCellDef>Actions</mat-header-cell>
                  <mat-cell *matCellDef="let claim">
                    <button mat-icon-button (click)="selectClaim(claim)" matTooltip="View Details">
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button mat-icon-button (click)="editClaim(claim)" matTooltip="Edit Claim">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button
                            *ngIf="claim.status === 'underReview'"
                            (click)="approveClaim(claim)"
                            matTooltip="Approve Claim">
                      <mat-icon>check_circle</mat-icon>
                    </button>
                  </mat-cell>
                </ng-container>

                <mat-header-row *matHeaderRowDef="['claimNumber', 'customerName', 'status', 'estimatedAmount', 'adjusterName', 'actions']"></mat-header-row>
                <mat-row *matRowDef="let row; columns: ['claimNumber', 'customerName', 'status', 'estimatedAmount', 'adjusterName', 'actions']"></mat-row>
              </mat-table>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Workflow Engine View -->
        <div *ngIf="currentView === 'workflow'" class="view-container">
          <h2>Workflow Engine</h2>

          <mat-card class="workflow-card">
            <mat-card-header>
              <mat-card-title>Claims Processing Workflow</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="workflow-diagram">
                <div class="workflow-step" [class.active]="true">
                  <mat-icon>assignment</mat-icon>
                  <span>Submitted</span>
                </div>
                <div class="workflow-arrow">-></div>
                <div class="workflow-step">
                  <mat-icon>search</mat-icon>
                  <span>Under Review</span>
                </div>
                <div class="workflow-arrow">-></div>
                <div class="workflow-step">
                  <mat-icon>check_circle</mat-icon>
                  <span>Approved</span>
                </div>
                <div class="workflow-arrow">-></div>
                <div class="workflow-step">
                  <mat-icon>payment</mat-icon>
                  <span>Payment Processing</span>
                </div>
                <div class="workflow-arrow">-></div>
                <div class="workflow-step">
                  <mat-icon>done_all</mat-icon>
                  <span>Closed</span>
                </div>
              </div>

              <div class="workflow-stats">
                <div class="workflow-stat" *ngFor="let status of claimStatuses">
                  <div class="stat-label">{{status | titlecase}}</div>
                  <div class="stat-value">{{getClaimsByStatus(status).length}}</div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Selected Claim Details -->
        <div *ngIf="selectedClaim" class="claim-details">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Claim Details - {{selectedClaim.claimNumber}}</mat-card-title>
              <button mat-icon-button (click)="selectedClaim = null">
                <mat-icon>close</mat-icon>
              </button>
            </mat-card-header>
            <mat-card-content>
              <div class="claim-info">
                <p><strong>Customer:</strong> {{selectedClaim.customerName}}</p>
                <p><strong>Policy:</strong> {{selectedClaim.policyNumber}}</p>
                <p><strong>Status:</strong> {{selectedClaim.status | titlecase}}</p>
                <p><strong>Amount:</strong> \${{selectedClaim.estimatedAmount | number:'1.0-2'}}</p>
                <p><strong>Description:</strong> {{selectedClaim.description}}</p>
                <p><strong>Adjuster:</strong> {{selectedClaim.adjusterName || 'Unassigned'}}</p>
              </div>

              <div class="claim-actions">
                <button mat-raised-button
                        color="primary"
                        *ngIf="selectedClaim.status === 'underReview'"
                        (click)="approveClaim(selectedClaim)">
                  Approve Claim
                </button>
                <button mat-raised-button
                        color="warn"
                        *ngIf="selectedClaim.status === 'underReview'"
                        (click)="denyClaim(selectedClaim)">
                  Deny Claim
                </button>
                <button mat-raised-button
                        color="accent"
                        *ngIf="selectedClaim.status === 'approved'"
                        (click)="processPayment(selectedClaim)">
                  Process Payment
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .main-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .sidenav-container {
      height: calc(100vh - 64px);
    }

    .sidenav {
      width: 250px;
    }

    .main-content {
      padding: 20px;
    }

    .view-container {
      max-width: 1200px;
    }

    .view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .dashboard-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      text-align: center;
    }

    .stat-number {
      font-size: 2.5rem;
      font-weight: bold;
      color: #1976d2;
    }

    .recent-claims {
      margin-top: 20px;
    }

    .claims-table-card {
      margin-top: 20px;
    }

    .claims-table {
      width: 100%;
    }

    .status-chip {
      color: white;
      font-weight: bold;
    }

    .status-submitted {
      background-color: var(--status-submitted, #2196f3);
    }

    .status-underReview {
      background-color: var(--status-review, #ff9800);
    }

    .status-approved {
      background-color: var(--status-approved, #4caf50);
    }

    .status-denied {
      background-color: var(--status-denied, #f44336);
    }

    .status-paymentProcessing {
      background-color: var(--status-payment, #9c27b0);
    }

    .status-closed {
      background-color: var(--status-closed, #607d8b);
    }

    .workflow-card {
      margin: 20px 0;
    }

    .workflow-diagram {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 30px 0;
      flex-wrap: wrap;
    }

    .workflow-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      border-radius: 8px;
      background: #f5f5f5;
      min-width: 100px;
    }

    .workflow-step.active {
      background: #e3f2fd;
      color: #1976d2;
    }

    .workflow-arrow {
      font-size: 24px;
      color: #666;
    }

    .workflow-stats {
      display: flex;
      justify-content: space-around;
      margin-top: 30px;
    }

    .workflow-stat {
      text-align: center;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
    }

    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #1976d2;
    }

    .claim-details {
      position
