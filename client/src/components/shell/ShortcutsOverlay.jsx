export function ShortcutsOverlay({ open, onOpenChange }) {
  if (!open) return null;

  const groups = [
    {
      title: "Global",
      items: [
        ["Open command palette", ["⌘", "K"]],
        ["Show shortcuts", ["?"]],
        ["Go to Dashboard", ["g", "d"]],
        ["Go to Tasks", ["g", "t"]],
        ["Go to Habits", ["g", "h"]],
      ],
    },
    {
      title: "In lists",
      items: [
        ["Move down", ["j"]],
        ["Move up", ["k"]],
        ["Complete / open", ["↵"]],
        ["Edit", ["e"]],
        ["Delete", ["d"]],
        ["New item", ["n"]],
      ],
    },
  ];

  return (
    <>
      <div className="palette-backdrop" onClick={() => onOpenChange(false)} />
      <div className="fixed left-1/2 top-1/2 z-[70] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="font-heading text-lg font-semibold">Keyboard shortcuts</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              <ul className="space-y-1.5">
                {group.items.map(([label, keys]) => (
                  <li key={label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="flex gap-1">
                      {keys.map((key) => (
                        <kbd key={key}>{key}</kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Press <kbd>esc</kbd> to close
        </p>
      </div>
    </>
  );
}

export default ShortcutsOverlay;
