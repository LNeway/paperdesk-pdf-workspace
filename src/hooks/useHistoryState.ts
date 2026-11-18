import { useCallback, useState } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

const HISTORY_LIMIT = 40;

export function useHistoryState<T>(initialValue: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialValue,
    future: [],
  });

  const set = useCallback((updater: T | ((current: T) => T), record = true) => {
    setHistory((current) => {
      const nextValue =
        typeof updater === 'function'
          ? (updater as (current: T) => T)(current.present)
          : updater;
      if (Object.is(nextValue, current.present)) return current;
      if (!record) {
        return { ...current, present: nextValue };
      }
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: nextValue,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      if (!current.past.length) return current;
      const previous = current.past[current.past.length - 1];
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future].slice(0, HISTORY_LIMIT),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (!current.future.length) return current;
      const [next, ...rest] = current.future;
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: rest,
      };
    });
  }, []);

  const restore = useCallback((snapshot: T) => {
    setHistory((current) => ({
      past: [...current.past, current.present].slice(-HISTORY_LIMIT),
      present: snapshot,
      future: [],
    }));
  }, []);

  const reset = useCallback((value: T) => {
    setHistory({ past: [], present: value, future: [] });
  }, []);

  return {
    value: history.present,
    set,
    undo,
    redo,
    reset,
    restore,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
