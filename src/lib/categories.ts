/**
 * Expense categories, used by the category picker; the ids here are the
 * source of truth. The Category table gets them from a migration
 * (20261121000000_category_rows): adding one needs a migration too.
 * `icon` is a lucide icon name (see src/features/expenses/category-icon.tsx).
 */
export const categories = [
  { id: "food", name: "Food & drink", icon: "utensils" },
  { id: "groceries", name: "Groceries", icon: "shopping-basket" },
  { id: "lodging", name: "Lodging", icon: "bed-double" },
  { id: "transport", name: "Transport", icon: "car" },
  { id: "activities", name: "Activities", icon: "ticket" },
  { id: "utilities", name: "Utilities", icon: "zap" },
  { id: "rent", name: "Rent", icon: "house" },
  { id: "shopping", name: "Shopping", icon: "shopping-bag" },
  { id: "other", name: "Other", icon: "receipt" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export const categoryNames: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c.id, c.name]),
);
