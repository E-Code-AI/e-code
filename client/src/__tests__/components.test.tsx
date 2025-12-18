import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

describe('UI Components', () => {
  it('renders Button component', () => {
    render(<Button>Test</Button>);
    expect(screen.getByText('Test')).toBeDefined();
  });
  
  it('renders Card component', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText('Test Title')).toBeDefined();
  });
  
  it('renders Input component', () => {
    render(<Input placeholder="Test input" />);
    expect(screen.getByPlaceholderText('Test input')).toBeDefined();
  });
});
