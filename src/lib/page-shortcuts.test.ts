import { describe, expect, it } from 'vitest';
import { getPageListShortcut } from './page-shortcuts';

const pageButton = { tagName: 'BUTTON', isContentEditable: false };

describe('getPageListShortcut', () => {
  it('selects all pages with Cmd+A', () => {
    expect(
      getPageListShortcut({
        key: 'a',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        target: pageButton,
      }),
    ).toBe('select-all');
  });

  it('selects all pages with Ctrl+A', () => {
    expect(
      getPageListShortcut({
        key: 'A',
        metaKey: false,
        ctrlKey: true,
        altKey: false,
        target: pageButton,
      }),
    ).toBe('select-all');
  });

  it('clears selection with Escape', () => {
    expect(
      getPageListShortcut({
        key: 'Escape',
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        target: pageButton,
      }),
    ).toBe('clear-selection');
  });

  it.each(['Delete', 'Backspace'])('deletes selected pages with %s', (key) => {
    expect(
      getPageListShortcut({
        key,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        target: pageButton,
      }),
    ).toBe('delete-selection');
  });

  it('does not hijack typing or Alt+Arrow reordering', () => {
    expect(
      getPageListShortcut({
        key: 'a',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        target: { tagName: 'INPUT', isContentEditable: false },
      }),
    ).toBeNull();
    expect(
      getPageListShortcut({
        key: 'ArrowDown',
        metaKey: false,
        ctrlKey: false,
        altKey: true,
        target: pageButton,
      }),
    ).toBeNull();
  });
});
