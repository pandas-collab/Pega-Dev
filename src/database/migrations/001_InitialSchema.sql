-- Migration: 001_InitialSchema
-- Description: Create initial database schema for Pegasus platform
-- Created: $(date +%Y-%m-%d)

BEGIN TRANSACTION;

-- Create Policies table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Policies')
BEGIN
    CREATE TABLE Policies (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PolicyNumber NVARCHAR(50) NOT NULL UNIQUE,
        PolicyHolderName NVARCHAR(200) NOT NULL,
        PolicyHolderEmail NVARCHAR(100) NOT NULL,
        PolicyType NVARCHAR(50) NOT NULL,
        PremiumAmount DECIMAL(18,2) NOT NULL,
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NOT NULL,
        Status NVARCHAR(20) DEFAULT 'Active',
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CreatedBy NVARCHAR(100) NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT DEFAULT 0
    );

    CREATE INDEX IX_Policies_PolicyNumber ON Policies(PolicyNumber);
    CREATE INDEX IX_Policies_Status ON Policies(Status);
END

-- Create Claims table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Claims')
BEGIN
    CREATE TABLE Claims (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ClaimNumber NVARCHAR(50) NOT NULL UNIQUE,
        PolicyId UNIQUEIDENTIFIER NOT NULL,
        ClaimType NVARCHAR(50) NOT NULL,
        Description NVARCHAR(1000) NULL,
        ClaimAmount DECIMAL(18,2) NOT NULL,
        IncidentDate DATETIME2 NOT NULL,
        Status NVARCHAR(20) DEFAULT 'Submitted',
        AssignedTo NVARCHAR(100) NULL,
        ProcessedDate DATETIME2 NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CreatedBy NVARCHAR(100) NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT DEFAULT 0,
        FOREIGN KEY (PolicyId) REFERENCES Policies(Id)
    );

    CREATE INDEX IX_Claims_PolicyId ON Claims(PolicyId);
    CREATE INDEX IX_Claims_ClaimNumber ON Claims(ClaimNumber);
    CREATE INDEX IX_Claims_Status ON Claims(Status);
END

-- Create Documents table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Documents')
BEGIN
    CREATE TABLE Documents (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        FileName NVARCHAR(255) NOT NULL,
        FilePath NVARCHAR(500) NOT NULL,
        FileType NVARCHAR(50) NULL,
        FileSize BIGINT NOT NULL,
        PolicyId UNIQUEIDENTIFIER NULL,
        ClaimId UNIQUEIDENTIFIER NULL,
        Category NVARCHAR(50) NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CreatedBy NVARCHAR(100) NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT DEFAULT 0,
        FOREIGN KEY (PolicyId) REFERENCES Policies(Id),
        FOREIGN KEY (ClaimId) REFERENCES Claims(Id)
    );

    CREATE INDEX IX_Documents_PolicyId ON Documents(PolicyId);
    CREATE INDEX IX_Documents_ClaimId ON Documents(ClaimId);
END

COMMIT TRANSACTION;
