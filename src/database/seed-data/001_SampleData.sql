-- Seed Data Script: Sample Policies, Claims, and Documents
-- Description: Insert sample data for development and testing

BEGIN TRANSACTION;

-- Insert sample policies
IF NOT EXISTS (SELECT 1 FROM Policies WHERE PolicyNumber = 'POL-2024-001')
BEGIN
    INSERT INTO Policies (Id, PolicyNumber, PolicyHolderName, PolicyHolderEmail, PolicyType, PremiumAmount, StartDate, EndDate, Status)
    VALUES
        (NEWID(), 'POL-2024-001', 'John Smith', 'john.smith@email.com', 'Auto', 1200.00, '2024-01-01', '2024-12-31', 'Active'),
        (NEWID(), 'POL-2024-002', 'Jane Doe', 'jane.doe@email.com', 'Home', 800.00, '2024-01-15', '2025-01-14', 'Active'),
        (NEWID(), 'POL-2024-003', 'Bob Johnson', 'bob.johnson@email.com', 'Life', 2400.00, '2024-02-01', '2025-01-31', 'Active');
END

-- Insert sample claims
DECLARE @PolicyId1 UNIQUEIDENTIFIER = (SELECT Id FROM Policies WHERE PolicyNumber = 'POL-2024-001');
DECLARE @PolicyId2 UNIQUEIDENTIFIER = (SELECT Id FROM Policies WHERE PolicyNumber = 'POL-2024-002');

IF NOT EXISTS (SELECT 1 FROM Claims WHERE ClaimNumber = 'CLM-2024-001')
BEGIN
    INSERT INTO Claims (Id, ClaimNumber, PolicyId, ClaimType, Description, ClaimAmount, IncidentDate, Status, AssignedTo)
    VALUES
        (NEWID(), 'CLM-2024-001', @PolicyId1, 'Collision', 'Vehicle collision at intersection', 5000.00, '2024-03-15', 'In Review', 'claims.adjuster@pegasus.com'),
        (NEWID(), 'CLM-2024-002', @PolicyId2, 'Water Damage', 'Pipe burst in basement', 3500.00, '2024-04-10', 'Approved', 'claims.adjuster2@pegasus.com');
END

COMMIT TRANSACTION;
