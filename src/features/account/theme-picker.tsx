"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useId, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

const subscribeNever = () => () => {};

/** Light, dark, or follow the device. Saved in this browser. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const headingId = useId();
  // The saved choice is only known in the browser: nothing is shown as
  // picked in the server render, so hydration matches.
  const inBrowser = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-[17px] font-semibold">
        Appearance
      </h2>
      <div
        role="group"
        aria-labelledby={headingId}
        className="grid grid-cols-3 gap-1 rounded-xl bg-line-soft p-1"
      >
        {options.map(({ value, label, Icon }) => {
          const on = inBrowser && theme === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => setTheme(value)}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-[9px] text-[14px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                on ? "bg-raised text-ink shadow-sm" : "text-ink-2",
              )}
            >
              <Icon size={16} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
