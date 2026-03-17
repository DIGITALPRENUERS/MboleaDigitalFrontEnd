import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /Click me/i })).toBeInTheDocument();
  });

  it('applies variant and size classes', () => {
    render(<Button variant="danger" size="lg">Delete</Button>);
    const btn = screen.getByRole('button', { name: /Delete/i });
    expect(btn).toHaveClass('bg-red-600');
    expect(btn).toHaveClass('px-6');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when isLoading is true', () => {
    render(<Button isLoading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading state when isLoading', () => {
    render(<Button isLoading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>OK</Button>);
    await userEvent.click(screen.getByRole('button', { name: /OK/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards extra props', () => {
    render(<Button type="submit" data-testid="custom-btn">Send</Button>);
    const btn = screen.getByTestId('custom-btn');
    expect(btn).toHaveAttribute('type', 'submit');
  });
});
