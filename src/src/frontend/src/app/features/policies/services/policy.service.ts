import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Policy } from '../components/policy-list.component';

@Injectable({
  providedIn: 'root'
})
export class PolicyService {
  private apiUrl = `${environment.apiUrl}/policies`;

  constructor(private http: HttpClient) {}

  getPolicies(): Observable<Policy[]> {
    return this.http.get<Policy[]>(this.apiUrl);
  }

  getPolicy(id: string): Observable<Policy> {
    return this.http.get<Policy>(`${this.apiUrl}/${id}`);
  }

  createPolicy(policy: Partial<Policy>): Observable<Policy> {
    return this.http.post<Policy>(this.apiUrl, policy);
  }

  updatePolicy(id: string, policy: Partial<Policy>): Observable<Policy> {
    return this.http.put<Policy>(`${this.apiUrl}/${id}`, policy);
  }

  deletePolicy(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  searchPolicies(term: string): Observable<Policy[]> {
    return this.http.get<Policy[]>(`${this.apiUrl}/search?q=${encodeURIComponent(term)}`);
  }
}
