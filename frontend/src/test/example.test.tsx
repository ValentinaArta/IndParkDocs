import { render, screen } from '@testing-library/react';

function Hello() {
  return <h1>Привет</h1>;
}

describe('Vitest setup', () => {
  it('renders a component', () => {
    render(<Hello />);
    expect(screen.getByText('Привет')).toBeInTheDocument();
  });

  it('basic assertion works', () => {
    expect(1 + 1).toBe(2);
  });
});
