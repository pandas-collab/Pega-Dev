import { Component, OnInit } from '@angular/core';
import { ClaimService } from '../services/claim.service';

export interface Claim {
  id: string;
  claimNumber: string;
  policyNumber: string;
  customerName: string;
  claimType: string;
  claimAmount: number;
  dateSubmitted: Date;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Paid';
  assignedTo: string;
}

@Component({
  selector: 'peg-claim-list',
  templateUrl: './claim-list.component.html',
  styleUrls: ['./claim-list.component.scss']
})
export class ClaimListComponent implements OnInit {
  claims: Claim[] = [];
  displayedColumns: string[] = ['claimNumber', 'policyNumber', 'customerName', 'claimAmount', 'status', 'actions'];
  isLoading = true;
  filterStatus = '';

  constructor(private claimService: ClaimService) {}

  ngOnInit(): void {
    this.loadClaims();
  }

  loadClaims(): void {
    this.isLoading = true;
    this.claimService.getClaims().subscribe({
      next: (claims) => {
        this.claims = claims;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading claims:', error);
        this.isLoading = false;
      }
    });
  }

  filterByStatus(): void {
    if (this.filterStatus) {
      this.claimService.getClaimsByStatus(this.filterStatus).subscribe({
        next: (claims) => {
          this.claims = claims;
        },
        error: (error) => {
          console.error('Error filtering claims:', error);
        }
      });
    } else {
      this.loadClaims();
    }
  }

  viewClaim(claim: Claim): void {
    console.log('Viewing claim:', claim.id);
  }

  processClaim(claim: Claim): void {
    console.log('Processing claim:', claim.id);
  }
}
