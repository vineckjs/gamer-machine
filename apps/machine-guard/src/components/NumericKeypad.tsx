import { useEffect } from 'react';

interface NumericKeypadProps {
  onKey: (key: string) => void;
  onDelete: () => void;
  onSubmit?: () => void;
}

export function NumericKeypad({ onKey, onDelete, onSubmit }: NumericKeypadProps) {
  const keys = ['1','2','3','4','5','6','7','8','9','*','0','#'];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        onKey(e.key);
      } else if (e.key === 'Backspace') {
        onDelete();
      } else if (e.key === 'Enter' && onSubmit) {
        onSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onKey, onDelete, onSubmit]);

  return (
    <div className="grid grid-cols-3 gap-3 w-80 mx-auto mt-4">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => onKey(key)}
          className="h-14 text-xl font-bold rounded-xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 transition-colors"
        >
          {key}
        </button>
      ))}
      <button
        onClick={onDelete}
        className="h-14 text-xl font-bold rounded-xl bg-gray-800 hover:bg-red-900 active:bg-red-800 transition-colors col-span-2"
      >
        ←
      </button>
      {onSubmit && (
        <button
          onClick={onSubmit}
          className="h-14 text-xl font-bold rounded-xl bg-neon-green text-black hover:opacity-90 active:opacity-80 transition-opacity"
        >
          OK
        </button>
      )}
    </div>
  );
}
