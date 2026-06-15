import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModalShell } from '../ModalShell';

describe('ModalShell', () => {
  test('exposes a labelled dialog', () => {
    render(
      <ModalShell title="Report an Issue" onClose={() => {}}>
        <button>Submit</button>
      </ModalShell>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Report an Issue');
  });

  test('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <ModalShell title="Test" onClose={onClose}>
        <button>Submit</button>
      </ModalShell>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('closes on backdrop click but not on panel click', () => {
    const onClose = vi.fn();
    render(
      <ModalShell title="Test" onClose={onClose}>
        <button>Submit</button>
      </ModalShell>,
    );
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    // The backdrop is the dialog's parent
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('renders a labelled close button when the header is shown', () => {
    render(
      <ModalShell title="Test" onClose={() => {}}>
        <button>Submit</button>
      </ModalShell>,
    );
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
  });

  test('hides the header (and close button) when requested', () => {
    render(
      <ModalShell title="Done" onClose={() => {}} hideHeader>
        <p>Success</p>
      </ModalShell>,
    );
    expect(screen.queryByRole('button', { name: 'Close dialog' })).not.toBeInTheDocument();
    // Title is still the accessible name for screen readers
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Done');
  });
});
