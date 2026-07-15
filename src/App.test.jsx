import { describe, it, expect } from 'vitest';
import { makeInitialHistory, driftZones, makeAlert } from './App';

describe('App Helper Functions', () => {
  it('makeInitialHistory generates a list of 10 values near base density', () => {
    const base = 50;
    const history = makeInitialHistory(base);
    expect(history.length).toBe(10);
    history.forEach(val => {
      expect(val).toBeGreaterThanOrEqual(45); // 50 - 5
      expect(val).toBeLessThanOrEqual(55);    // 50 + 5
    });
  });

  it('makeInitialHistory clamps values between 10 and 95', () => {
    const historyLow = makeInitialHistory(5);
    historyLow.forEach(val => expect(val).toBeGreaterThanOrEqual(10));

    const historyHigh = makeInitialHistory(100);
    historyHigh.forEach(val => expect(val).toBeLessThanOrEqual(95));
  });

  it('driftZones drifts density properly', () => {
    const zones = {
      'Gate A': { type: 'gate', density: 50, currentWaitTime: 10 },
      'Section 100': { type: 'seating', density: 60 }
    };
    
    const drifted = driftZones(zones);
    
    expect(drifted['Gate A'].density).toBeGreaterThanOrEqual(46);
    expect(drifted['Gate A'].density).toBeLessThanOrEqual(54);
    
    // Gate wait time should exist and be updated
    expect(drifted['Gate A'].currentWaitTime).toBeDefined();
    
    // Seating should not have currentWaitTime added
    expect(drifted['Section 100'].currentWaitTime).toBeUndefined();
  });

  it('makeAlert constructs a valid alert object', () => {
    const alertData = {
      id: 'test-1',
      zone: 'Gate B',
      headline: 'Test Alert',
      recommendation: 'Do something',
      urgency: 'high',
      source: 'gemini'
    };
    const alert = makeAlert(alertData);
    expect(alert.id).toBe('test-1');
    expect(alert.status).toBe('active');
    expect(alert.timestamp).toBeDefined();
    expect(alert.zone).toBe('Gate B');
  });
});
