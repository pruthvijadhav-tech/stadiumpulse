import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OpsDashboard from './OpsDashboard';
import { stadiumData } from '../data/mockStadiumData';

describe('OpsDashboard Component', () => {
  const defaultProps = {
    stadiumData,
    alerts: [
      { id: '1', zone: 'Gate B', headline: 'Test Alert', recommendation: 'Do this', urgency: 'high', status: 'active' }
    ],
    onResolveAlert: vi.fn(),
    onAcknowledgeAlert: vi.fn(),
    selectedZone: 'Gate B',
    onSelectZone: vi.fn(),
    densityHistory: { 'Gate B': [50, 52, 55] }
  };

  it('renders OpsDashboard without crashing', () => {
    render(<OpsDashboard {...defaultProps} />);
    expect(screen.getByText('Interactive Crowd Congestion Map')).toBeInTheDocument();
    expect(screen.getByText('Test Alert')).toBeInTheDocument();
  });

  it('calculates derived metrics correctly', () => {
    render(<OpsDashboard {...defaultProps} />);
    expect(screen.getByText('Est. Attendance')).toBeInTheDocument();
    expect(screen.getByText('Peak Congestion')).toBeInTheDocument();
    expect(screen.getByText('Avg. Gate Wait')).toBeInTheDocument();
  });
});
