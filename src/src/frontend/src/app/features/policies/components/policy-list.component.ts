import { Component, OnInit } from '@angular/core';
import { PolicyService } from '../services/policy.service';

export interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  customerName: string;
  premiumAmount: number;
  startDate: Date;
  endDate: Date;
  status: 'Active' | 'Inactive' | 'Expired' | 'Cancelled';
}

@Component({
  selector: 'peg-policy-list',
  templateUrl: './policy-list.component.html',
  styleUrls: ['./policy-list.component.scss']
})
export class PolicyListComponent implements OnInit {
  policies: Policy[] = [];
  displayedColumns: string[] = ['policyNumber', 'policyType', 'customerName', 'premiumAmount', 'status', 'actions'];
  isLoading = true;
  searchTerm = '';

  constructor(private policyService: PolicyService) {}

  ngOnInit(): void {
    this.loadPolicies();
  }

  loadPolicies(): void {
    this.isLoading = true;
    this.policyService.getPolicies().subscribe({
      next: (policies) => {
        this.policies = policies;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading policies:', error);
        this.isLoading = false;
      }
    });
  }

  searchPolicies(): void {
    if (this.searchTerm.trim()) {
      this.policyService.searchPolicies(this.searchTerm).subscribe({
        next: (policies) => {
          this.policies = policies;
        },
        error: (error) => {
          console.error('Error searching policies:', error);
        }
      });
    } else {
      this.loadPolicies();
    }
  }

  viewPolicy(policy: Policy): void {
    // Navigate to policy details
    console.log('Viewing policy:', policy.id);
  }

  editPolicy(policy: Policy): void {
    // Navigate to policy edit form
    console.log('Editing policy:', policy.id);
  }
}
