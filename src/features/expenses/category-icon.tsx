import {
  BedDouble,
  Car,
  House,
  Receipt,
  ShoppingBag,
  ShoppingBasket,
  Ticket,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { categoryNames, type CategoryId } from "@/lib/categories";
import { cn } from "@/lib/utils";

const icons: Record<CategoryId, LucideIcon> = {
  food: Utensils,
  groceries: ShoppingBasket,
  lodging: BedDouble,
  transport: Car,
  activities: Ticket,
  utilities: Zap,
  rent: House,
  shopping: ShoppingBag,
  other: Receipt,
};

export function categoryName(id: string | null) {
  return categoryNames[id ?? "other"] ?? "Other";
}

/** The neutral 40px tile from the design, with the category's icon. */
export function CategoryTile({
  categoryId,
  className,
}: {
  categoryId: string | null;
  className?: string;
}) {
  const Icon = icons[(categoryId ?? "other") as CategoryId] ?? Receipt;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-tile text-ink-2",
        className,
      )}
    >
      <Icon size={20} strokeWidth={1.8} />
    </span>
  );
}
