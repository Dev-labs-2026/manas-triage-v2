import type { VitalsInput, TriageCategory } from './types';

export function evaluatePhysicalTriage(vitals: VitalsInput): { 
  category: TriageCategory; 
  reason: string; 
  urgencyScore: number;
} {
  // Apnea check: immediate fatal arrest
  if (!vitals.isBreathing) {
    return { 
      category: 'RED', 
      reason: 'RUSH TO HOSPITAL IMMEDIATELY! Patient is not breathing. Clear airway and give mouth-to-mouth rescue breaths right now.',
      urgencyScore: 100 
    };
  }

  const plainAlerts: string[] = [];
  const clinicalNotes: string[] = [];

  // Parse input safely (handles empty string or zero)
  const numericRate = vitals.respiratoryRate === '' ? 0 : vitals.respiratoryRate;
  const targetRate = 16;
  const rr = Math.max(0, Math.min(80, numericRate));
  let respScore: number;

  if (rr > 20) {
    respScore = Math.min(50, Math.round(Math.pow(rr - targetRate, 1.35) * 1.5));
    if (rr >= 30) {
      plainAlerts.push('Breathing is dangerously fast');
      clinicalNotes.push(`Severe tachypnea (${rr} bpm)`);
    } else if (rr >= 24) {
      plainAlerts.push('Breathing is faster than normal');
      clinicalNotes.push(`Compensatory elevated respiration (${rr} bpm)`);
    }
  } else if (rr < 12) {
    respScore = Math.min(50, Math.round(Math.pow(targetRate - rr, 1.4) * 2.2));
    if (rr < 10) {
      plainAlerts.push('Breathing is dangerously slow or gasping');
      clinicalNotes.push(`Severe bradypnea (${rr} bpm)`);
    }
  } else {
    respScore = Math.abs(rr - targetRate) + 2;
  }

  // Active Bleeding Check
  let bleedScore = 0;
  if (vitals.severeBleeding) {
    bleedScore = 42 + Math.min(10, Math.round(respScore * 0.2));
    plainAlerts.push('Severe heavy bleeding (Press cloth tightly on wound immediately)');
    clinicalNotes.push('Active uncontrolled arterial hemorrhage');
  }

  // Pulse Check
  let pulseScore = 0;
  if (!vitals.radialPulsePresent) {
    pulseScore = 28 + Math.min(8, Math.round(respScore * 0.15));
    plainAlerts.push('Wrist pulse cannot be felt (Body going into shock)');
    clinicalNotes.push('Absent radial pulse / circulatory shock');
  }

  const rawScore = 4 + respScore + bleedScore + pulseScore;

  const isLifeThreat = 
    vitals.severeBleeding || 
    rr >= 30 || 
    rr < 10 || 
    !vitals.radialPulsePresent;

  let calculatedScore = rawScore;
  if (isLifeThreat && calculatedScore < 72) {
    calculatedScore = 72 + Math.round((calculatedScore % 10) * 1.8);
  }

  const finalScore = Math.max(1, Math.min(99, calculatedScore));

  let category: TriageCategory;
  let actionMessage: string;

  if (isLifeThreat || finalScore >= 70) {
    category = 'RED';
    actionMessage = 'CRITICAL DANGER: Take to nearest hospital or call ambulance immediately.';
  } else if (finalScore >= 35 || (rr >= 24 && rr <= 29)) {
    category = 'YELLOW';
    actionMessage = 'URGENT: Needs to be seen by a doctor today. Keep patient calm and resting.';
  } else {
    category = 'GREEN';
    actionMessage = 'STABLE: No immediate life threat. Give basic first aid, keep hydrated, and monitor.';
  }

  const reasonsSummary = plainAlerts.length > 0 
    ? `${actionMessage} Observed signs: ${plainAlerts.join('; ')}. [Medical notes: ${clinicalNotes.join('; ')}]`
    : `${actionMessage} Pulse and breathing are at safe normal levels.`;

  return {
    category,
    reason: reasonsSummary,
    urgencyScore: finalScore
  };
}

export function detectMentalRedFlags(text: string): boolean {
  const normalized = text.toLowerCase();
  const criticalPhrases = [
    'kill myself', 'suicide', 'end my life', 'want to die', 'dying',
    'overdose', 'cut my wrists', 'no reason to live', 'hang myself',
    'hearing voices', 'people are watching me', 'hurt someone', 'end it all',
    'cant go on', "can't go on", 'better off dead', 'take my life'
  ];
  return criticalPhrases.some(phrase => normalized.includes(phrase));
}