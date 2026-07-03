import { describe, expect, test } from 'vitest';
import { render } from '@testing-library/react';
import { Confetti } from '../Confetti';

describe('Confetti', () => {
  test('renders the requested number of pieces', () => {
    const { container } = render(<Confetti count={12} />);
    expect(container.querySelectorAll('span')).toHaveLength(12);
  });

  test('is hidden from assistive tech and non-interactive', () => {
    const { container } = render(<Confetti />);
    const overlay = container.firstElementChild!;
    expect(overlay).toHaveAttribute('aria-hidden');
    expect(overlay.className).toContain('pointer-events-none');
  });
});
