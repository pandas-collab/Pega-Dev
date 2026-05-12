import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ReportDefinition } from '../components/report-dashboard.component';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  getAvailableReports(): Observable<ReportDefinition[]> {
    return this.http.get<ReportDefinition[]>
