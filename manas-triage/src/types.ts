export type TriageCategory = 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';

export interface VitalsInput {
  isBreathing: boolean;
  respiratoryRate: number | '';
  radialPulsePresent: boolean;
  mentalStatusFollowsCommands: boolean;
  severeBleeding: boolean;
}

export interface TriageRecord {
  id?: number;
  timestamp: string;
  patientType: 'PHYSICAL' | 'MENTAL';
  reportedSymptoms: string;
  severity: TriageCategory;
  urgencyScore: number;
  summaryAction: string;
}