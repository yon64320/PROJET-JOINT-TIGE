"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  /** null = no filter (all visually checked). Set = explicit selection (even empty). */
  selected: Set<string> | null;
  onChange: (selected: Set<string> | null) => void;
  /** Label shown when all items are selected / no filter active */
  allLabel?: string;
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  allLabel = "Tous",
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search when opening
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  // null = all checked (no filter), Set = explicit
  const noFilter = selected === null;
  const checkedCount = noFilter ? options.length : selected.size;
  const allChecked = checkedCount === options.length;

  // Display text for the button
  const displayText = allChecked
    ? allLabel
    : checkedCount === 0
      ? "Aucun"
      : checkedCount === 1
        ? [...selected!][0]
        : `${checkedCount}/${options.length}`;

  const isOptionChecked = (opt: string) => (noFilter ? true : selected.has(opt));

  const handleToggleOption = (opt: string) => {
    if (noFilter) {
      // Transition from "all" to explicit: select all except this one
      const next = new Set(options);
      next.delete(opt);
      onChange(next);
    } else {
      const next = new Set(selected);
      if (next.has(opt)) {
        next.delete(opt);
      } else {
        next.add(opt);
      }
      // If all selected again → go back to null (no filter)
      if (next.size === options.length) {
        onChange(null);
      } else {
        onChange(next);
      }
    }
  };

  const handleToggleAll = () => {
    if (allChecked) {
      // All are checked → uncheck all
      onChange(new Set());
    } else {
      // Not all checked → check all (= no filter)
      onChange(null);
    }
  };

  // Button style: highlighted when filter is active (partial selection)
  const isActive = !noFilter && selected.size > 0 && selected.size < options.length;

  if (options.length <= 1) return null;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 h-10 px-3 rounded-lg text-sm font-medium transition-colors w-full ${
          isActive
            ? "bg-mcm-mustard text-white"
            : "bg-white border border-mcm-warm-gray-border text-mcm-warm-gray"
        }`}
      >
        <span className="truncate flex-1 text-left">{label}</span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            isActive ? "bg-white/20 text-white" : "bg-mcm-warm-gray-bg text-mcm-warm-gray"
          }`}
        >
          {displayText}
        </span>
        {/* Chevron */}
        <svg
          className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white border border-mcm-warm-gray-border rounded-xl shadow-lg overflow-hidden">
          {/* Search inside dropdown */}
          {options.length > 5 && (
            <div className="p-2 border-b border-mcm-warm-gray-border">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full h-8 px-2 rounded-md border border-mcm-warm-gray-border text-sm bg-mcm-warm-gray-bg"
              />
            </div>
          )}

          {/* Select all / deselect */}
          <div className="px-2 py-1.5 border-b border-mcm-warm-gray-border">
            <button
              onClick={handleToggleAll}
              className="text-xs font-medium text-mcm-mustard hover:underline"
            >
              {allChecked ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-mcm-warm-gray text-center py-3">Aucun résultat</p>
            ) : (
              filtered.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-mcm-warm-gray-bg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isOptionChecked(opt)}
                    onChange={() => handleToggleOption(opt)}
                    className="w-4 h-4 accent-mcm-mustard shrink-0"
                  />
                  <span className="text-sm text-mcm-charcoal truncate">{opt}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
