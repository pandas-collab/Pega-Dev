import { Component, OnInit } from '@angular/core';
import { ReportService } from '../services/report.service';

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: ReportParameter[];
}

export interface ReportParameter {
  name: string;
  type: 'date' | 'text' | 'select';
  required: boolean;
  options?: string[];
}

@Component({
  selector: 'peg-report-dashboard',
  templateUrl: './report-dashboard.component.html',
  styleUrls: ['./report-dashboard.component.scss']
})
export class ReportDashboardComponent implements OnInit {
  availableReports: ReportDefinition[] = [];
  selectedReport: ReportDefinition | null = null;
  reportParameters: any = {};
  isGenerating = false;

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    this.loadAvailableReports();
  }

  loadAvailableReports(): void {
    this.reportService.getAvailableReports().subscribe({
      next: (reports) => {
        this.availableReports = reports;
      },
      error: (error) => {
        console.error('Error loading reports:', error);
      }
    });
  }

  selectReport(report: ReportDefinition): void {
    this.selectedReport = report;
    this.reportParameters = {};

    // Initialize parameters with default values
    report.parameters.forEach(param => {
      this.reportParameters[param.name] = '';
    });
  }

  generateReport(): void {
    if (!this.selectedReport) return;

    this.isGenerating = true;
    this.reportService.generateReport(this.selectedReport.id, this.reportParameters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.selectedReport!.name}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.isGenerating = false;
      },
      error: (error) => {
        console.error('Error generating report:', error);
        this.isGenerating = false;
      }
    });
  }

  isFormValid(): boolean {
    if (!this.selectedReport) return false;

    return this.selectedReport.parameters.every(param => {
      if (param.required) {
        return this.reportParameters[param.name] && this.reportParameters[param.name].trim() !== '';
      }
      return true;
    });
  }
}
