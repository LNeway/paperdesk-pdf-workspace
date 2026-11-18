export type PageListShortcut =
  | 'select-all'
  | 'clear-selection'
  | 'delete-selection'
  | null;

interface ShortcutTarget {
  tagName?: string;
  isContentEditable?: boolean;
}

export interface PageListShortcutEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  target?: ShortcutTarget | null;
}

function isEditableTarget(target: ShortcutTarget | null | undefined): boolean {
  if (!target) return false;
  const tagName = target.tagName?.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    Boolean(target.isContentEditable)
  );
}

export function getPageListShortcut(event: PageListShortcutEvent): PageListShortcut {
  if (event.altKey || isEditableTarget(event.target)) return null;

  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && key === 'a') return 'select-all';
  if (key === 'escape') return 'clear-selection';
  if (key === 'delete' || key === 'backspace') return 'delete-selection';
  return null;
}
