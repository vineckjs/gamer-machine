import { globalShortcut } from 'electron';

const BLOCKED_SHORTCUTS = [
  'Alt+Tab',
  'Alt+F4',
  'Super+D',
  'Super+E',
  'Super+R',
  'Super+L',
  'Super+Tab',
  'Ctrl+Escape',
  'Ctrl+Shift+Escape',
  'Super+M',
  'Super+B',
];

export function setupShortcutBlocker() {
  for (const shortcut of BLOCKED_SHORTCUTS) {
    try {
      globalShortcut.register(shortcut, () => {
        // Block the shortcut
      });
    } catch {
      // Some shortcuts might not be registerable on all platforms
    }
  }
}

export function releaseShortcutBlocker() {
  globalShortcut.unregisterAll();
}
