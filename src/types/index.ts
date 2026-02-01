// Framework types
export type Framework = 'SOX' | 'SOC2' | 'ISO27001';

export type ControlStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'UNDER_REVIEW'
  | 'INACTIVE';

export type ControlEffectiveness =
  | 'EFFECTIVE'
  | 'INEFFECTIVE'
  | 'NOT_TESTED'
  | 'OPERATING_EFFECTIVELY'
  | 'NEEDS_IMPROVEMENT';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ControlType =
  | 'IT_GENERAL'
  | 'IT_APPLICATION'
  | 'FINANCIAL'
  | 'OPERATIONAL'
  | 'ENTITY_LEVEL';

export type AutomationLevel =
  | 'MANUAL'
  | 'SEMI_AUTOMATED'
  | 'FULLY_AUTOMATED';

export type TestFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUALLY';

export type TestStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETE_PASS'
  | 'COMPLETE_FAIL'
  | 'DEFERRED';

export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IssueStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'DEFERRED';

// Framework Requirement
export interface FrameworkRequirement {
  id: string;
  framework: Framework;
  requirementId: string;
  title: string;
  description: string;
  category: string;
}

// Framework Mapping (relationship between Control and Framework Requirement)
export interface FrameworkMapping {
  requirementId: string; // References FrameworkRequirement.id
  framework: Framework;
  requirementTitle: string;
  mappedDate: string;
  mappedBy: string;
}

// Risk
export interface Risk {
  id: string;
  name: string;
  description: string;
  level: RiskLevel;
  category: string;
  owner: string;
}

// System
export interface System {
  id: string;
  name: string;
  description: string;
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner: string;
  vendor?: string;
}

// Process
export interface Process {
  id: string;
  name: string;
  description: string;
  owner: string;
  category: string;
}

// Financial Statement Line Item
export interface FSLineItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  materiality: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
  reportingPeriod: string;
}

// Control
export interface Control {
  id: string;
  name: string;
  description: string;
  objective: string;
  type: ControlType;
  status: ControlStatus;
  effectiveness: ControlEffectiveness;
  automationLevel: AutomationLevel;
  frequency: TestFrequency;
  owner: string;

  // Multi-framework mapping
  frameworkRequirements: FrameworkMapping[];

  // Relationships
  riskIds: string[];
  systemIds: string[];
  processIds: string[];
  fsLineItemIds: string[];

  // Metadata
  createdDate: string;
  lastUpdated: string;
  lastTestDate?: string;
}

// Test Procedure
export interface TestProcedure {
  id: string;
  controlId: string;
  name: string;
  description: string;
  status: TestStatus;
  testDate?: string;
  testedBy?: string;
  result?: string;
  evidence?: string;
  notes?: string;
  periodCovered: string;
}

// Issue
export interface Issue {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  controlId: string;
  identifiedDate: string;
  identifiedBy: string;
  dueDate?: string;
  assignedTo?: string;
  resolution?: string;
  resolvedDate?: string;
}

// Impact Analysis Result
export interface ImpactAnalysisResult {
  issue: Issue;

  // Direct impact
  affectedControl: Control;
  exposedRisks: Risk[];
  affectedSystems: System[];

  // Cascade impact
  relatedControls: Control[];
  impactedFrameworks: Framework[];
  fsLineItemsAtRisk: FSLineItem[];

  // Suggested actions
  suggestedActions: string[];
}

// Coverage Metrics
export interface CoverageMetrics {
  framework: Framework;
  totalRequirements: number;
  mappedRequirements: number;
  coveragePercentage: number;
  controlCount: number;
}

// Testing Efficiency Metrics
export interface TestingEfficiencyMetrics {
  totalTests: number;
  totalRequirementsSatisfied: number;
  reusabilityRatio: number;
  estimatedHoursSaved: number;
  estimatedCostSavings: number;
}

// FS Line Item Coverage
export interface FSLineItemCoverage {
  fsLineItem: FSLineItem;
  controlCount: number;
  processCount: number;
  systemCount: number;
  riskCount: number;
  coveragePercentage: number;
  controls: Control[];
  processes: Process[];
  systems: System[];
  risks: Risk[];
}
