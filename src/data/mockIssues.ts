import { Issue } from '../types';

export const mockIssues: Issue[] = [
  // Critical (1)
  {
    id: 'ISS-002',
    title: 'Terminated Contractor Admin Access Not Revoked',
    description: 'Discovered 2 admin accounts belonging to contractors terminated in July 2024 that still have active access to production systems',
    severity: 'CRITICAL',
    status: 'RESOLVED',
    controlId: 'IT-004',
    identifiedDate: '2024-08-25',
    identifiedBy: 'David Kim',
    dueDate: '2024-08-26',
    assignedTo: 'Sarah Chen',
    resolution: 'Admin accounts immediately disabled. Updated termination checklist to include contractor verification. Enhanced monthly access review to flag contractor accounts.',
    resolvedDate: '2024-08-25',
    affectedSystemIds: ['SYS-001', 'SYS-003'], // Salesforce, AWS
    failedAttribute: 'Access Termination',
    failedCapability: 'User Offboarding Process',
  },

  // High (2)
  {
    id: 'ISS-001',
    title: 'Excessive Vendor Access Rights',
    description: 'Q3 vendor access review identified 3 vendors with broader access than necessary: VendorA has read access to all financial data when only AR is needed, VendorB has admin rights instead of read-only, VendorC access not reviewed in 18 months',
    severity: 'HIGH',
    status: 'IN_PROGRESS',
    controlId: 'OPS-001',
    identifiedDate: '2024-08-20',
    identifiedBy: 'David Kim',
    dueDate: '2024-09-30',
    assignedTo: 'David Kim',
    resolution: undefined,
    resolvedDate: undefined,
    affectedSystemIds: ['SYS-002', 'SYS-005'], // NetSuite, Stripe
    failedAttribute: 'Access Governance',
    failedCapability: 'Least Privilege Enforcement',
  },
  {
    id: 'ISS-004',
    title: 'Unresolved SOD Conflicts in SAP',
    description: 'June SOD analysis identified 5 users with conflicting access rights in SAP: 3 users can both create and approve journal entries, 2 users have both AR and cash receipt functions',
    severity: 'HIGH',
    status: 'RESOLVED',
    controlId: 'IT-006',
    identifiedDate: '2024-06-20',
    identifiedBy: 'David Kim',
    dueDate: '2024-07-31',
    assignedTo: 'David Kim',
    resolution: 'Removed conflicting access for all 5 users. Implemented monthly automated SOD conflict reporting. Updated role design to prevent future conflicts.',
    resolvedDate: '2024-07-28',
    affectedSystemIds: ['SYS-002'], // NetSuite (SAP-like system)
    failedAttribute: 'Segregation of Duties',
    failedCapability: 'Role-Based Access Control',
  },

  // Medium (2)
  {
    id: 'ISS-003',
    title: 'Cash Reconciliation Variance Not Investigated',
    description: 'Daily cash reconciliation for July 15, 2024 showed $25,000 variance that was not investigated within required 24-hour timeframe. Variance remained unresolved for 5 days.',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    controlId: 'FIN-003',
    identifiedDate: '2024-07-20',
    identifiedBy: 'Michael Torres',
    dueDate: '2024-08-15',
    assignedTo: 'Michael Torres',
    resolution: 'Variance traced to timing difference on wire transfer. Updated reconciliation procedures to include same-day variance investigation requirement. Added automated alerts for variances >$10K.',
    resolvedDate: '2024-08-05',
    affectedSystemIds: ['SYS-005', 'SYS-009'], // Stripe, Banking Portal
    failedAttribute: 'Reconciliation Process',
    failedCapability: 'Timely Variance Investigation',
  },
  {
    id: 'ISS-005',
    title: 'AR Aging Review Completed Late',
    description: 'Weekly AR aging review for May 2024 was completed 3 weeks late due to resource constraints. This delayed identification of collectibility issues on 2 large accounts.',
    severity: 'MEDIUM',
    status: 'OPEN',
    controlId: 'FIN-004',
    identifiedDate: '2024-05-25',
    identifiedBy: 'Michael Torres',
    dueDate: '2025-02-28',
    assignedTo: 'Michael Torres',
    resolution: undefined,
    resolvedDate: undefined,
    affectedSystemIds: ['SYS-002'], // NetSuite (AR system)
    failedAttribute: 'Review Timing',
    failedCapability: 'Periodic Review Process',
  },
];
