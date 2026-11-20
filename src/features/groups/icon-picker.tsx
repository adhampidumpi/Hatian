"use client";

import { cn } from "@/lib/utils";
import { GROUP_ICONS, type GroupIconName } from "@/lib/validation/groups";
import { GroupIcon } from "./group-icon";

const labels: Record<GroupIconName, string> = {
  users: "People",
  waves: "Beach",
  "tree-palm": "Island",
  house: "Home",
  utensils: "Food",
  mountain: "Mountains",
  plane: "Travel",
  car: "Road trip",
  briefcase: "Work",
  "shopping-basket": "Shopping",
};

/** Pick a group icon: a row of toggle buttons (one pressed at a time). */
export function IconPicker({
  value,
  onChange,
}: {
  value: GroupIconName;
  onChange: (icon: GroupIconName) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Group icon"
      className="grid grid-cols-5 gap-2"
    >
      {GROUP_ICONS.map((icon) => {
        const selected = icon === value;
        return (
          <button
            key={icon}
            type="button"
            aria-pressed={selected}
            aria-label={labels[icon]}
            title={labels[icon]}
            onClick={() => onChange(icon)}
            className={cn(
              "flex h-11 items-center justify-center rounded-[11px] border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              selected
                ? "border-ink bg-ink text-paper"
                : "border-line-strong bg-card text-ink hover:bg-paper",
            )}
          >
            <GroupIcon name={icon} size={20} />
          </button>
        );
      })}
    </div>
  );
}
