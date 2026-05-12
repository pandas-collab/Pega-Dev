import { Component, OnInit } from '@angular/core';
import { DocumentService } from '../services/document.service';

export interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
  relatedEntityType: 'Policy' | 'Claim' | 'Customer';
  relatedEntityId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

@Component({
  selector: 'peg-document-list',
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss']
})
export class DocumentListComponent implements OnInit {
  documents: Document[] = [];
  displayedColumns: string[] = ['fileName', 'fileType', 'uploadedBy', 'uploadedAt', 'status', 'actions'];
  isLoading = true;
  selectedFile: File | null = null;

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.documentService.getDocuments().subscribe({
      next: (documents) => {
        this.documents = documents;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  uploadDocument(): void {
    if (this.selectedFile) {
      this.documentService.uploadDocument(this.selectedFile, 'Policy', 'sample-id').subscribe({
        next: (document) => {
          this.documents.unshift(document);
          this.selectedFile = null;
        },
        error: (error) => {
          console.error('Error uploading document:', error);
        }
      });
    }
  }

  downloadDocument(document: Document): void {
    this.documentService.downloadDocument(document.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = document.fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading document:', error);
      }
    });
  }

  deleteDocument(document: Document): void {
    if (confirm(`Are you sure you want to delete ${document.fileName}?`)) {
      this.documentService.deleteDocument(document.id).subscribe({
        next: () => {
          this.documents = this.documents.filter(d => d.id !== document.id);
        },
        error: (error) => {
          console.error('Error deleting document:', error);
        }
      });
    }
  }
}
