import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';

export interface DashboardStats {
  totalPolicies: number;
  activeClaims: number;
  pendingDocuments: number;
  monthlyPremium: number;
}

export interface RecentActivity {
  id: string;
  type: 'policy' | 'claim' | 'document';
  title: string;
  description: string;
  timestamp: Date;
  status: string;
}

@Component({
  selector: 'peg-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  recentActivities: RecentActivity[] = [];
  isLoading = true;
  currentUser: any = null;

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;

    // Load dashboard statistics
    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.isLoading = false;
      }
    });

    // Load recent activities
    this.dashboardService.getRecentActivities(10).subscribe({
      next: (activities) => {
        this.recentActivities = activities;
      },
      error: (error) => {
        console.error('Error loading recent activities:', error);
      }
    });
  }

  refreshData(): void {
    this.loadDashboardData();
  }
}
