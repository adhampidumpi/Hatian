"use client";

import { Check } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/responsive-dialog";
import { cn } from "@/lib/utils";

export type PickerOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};

/** Pick one option from a list; closes on choice. Sheet on phones. */
export function PickerSheet({
  open,
  onOpenChange,
  title,
  options,
  value,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: PickerOption[];
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div
          role="radiogroup"
          aria-label={title}
          className="flex flex-col px-2 pb-4 lg:px-0 lg:pb-0"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  onSelect(option.value);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex min-h-13 items-center gap-3 rounded-xl px-2 text-left text-[15px] hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  selected && "font-semibold",
                )}
              >
                {option.icon}
                <span className="flex-1">{option.label}</span>
                {selected && <Check size={18} aria-hidden />}
              </button>
            );
          })}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
