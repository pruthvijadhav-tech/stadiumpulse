import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FanChat from './FanChat';
import { stadiumData } from '../data/mockStadiumData';

// Mock the Gemini API
const mockGenerateContent = vi.hoisted(() => vi.fn());
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent
        };
      }
    }
  };
});

describe('FanChat Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome message', () => {
    render(<FanChat stadiumData={stadiumData} language="en" />);
    expect(screen.getByText(/Welcome to StadiumPulse/i)).toBeInTheDocument();
  });

  it('sends a message and receives mocked LLM response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Mocked Gemini AI response about bathrooms.' }
    });

    render(<FanChat stadiumData={stadiumData} language="en" />);
    
    const input = screen.getByLabelText('Message input');
    const sendButton = screen.getByLabelText('Send message');

    // Type a message
    fireEvent.change(input, { target: { value: 'Where is the bathroom?' } });
    expect(input.value).toBe('Where is the bathroom?');

    // Click send
    fireEvent.click(sendButton);

    // Input should be cleared
    expect(input.value).toBe('');

    // The user's message should appear
    expect(screen.getByText('Where is the bathroom?')).toBeInTheDocument();

    // The mocked response should appear eventually
    await waitFor(() => {
      expect(screen.getByText('Mocked Gemini AI response about bathrooms.')).toBeInTheDocument();
    });

    // Verify generateContent was called
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('rate limits quick succession messages', async () => {
    render(<FanChat stadiumData={stadiumData} language="en" />);
    const input = screen.getByLabelText('Message input');
    const sendButton = screen.getByLabelText('Send message');

    fireEvent.change(input, { target: { value: 'First message' } });
    fireEvent.click(sendButton);
    expect(screen.getByText('First message')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Second message' } });
    fireEvent.click(sendButton);
    
    // Because of the 2000ms rate limit, the second message should not appear immediately
    expect(screen.queryByText('Second message')).not.toBeInTheDocument();
  });
});
