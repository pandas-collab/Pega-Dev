import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Claim } from '../components/claim-list.component';

@Injectable({
  providedIn: 'root'
})
export class ClaimService {
  private apiUrl = `${environment.apiUrl}/claims`;

  constructor(private http: HttpClient) {}

  getClaims(): Observable<Claim[]> {
    return this.http.get<Claim[]>(this.apiUrl);
  }

  getClaim(id: string): Observable<Claim> {
    return this.http.get<Claim>(`${this.apiUrl}/${id}`);
  }

  getClaimsByStatus(status: string): Observable<Claim[]> {
    return this.http.get<Claim[]>(`${this.apiUrl}?status=${status}`);
  }

  createClaim(claim: Partial<Claim>): Observable<Claim> {
    return this.http.post<Claim>(this.apiUrl, claim);
  }

  updateClaim(id: string, claim: Partial<Claim>): Observable<Claim> {
    return this.http.put<Claim>(`${this.apiUrl}/${id}`, claim);
  }

  processClaim(id: string, decision: string, notes: string): Observable<Claim> {
    return this.http.patch<Claim>(`${this.apiUrl}/${id}/process`, { decision, notes });
  }
}
