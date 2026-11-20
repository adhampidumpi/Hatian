import {
  Briefcase,
  Car,
  House,
  Mountain,
  Plane,
  ShoppingBasket,
  TreePalm,
  Users,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react";

/** Icons a group can use. Stored by name in Group.icon. */
export const groupIcons = {
  users: Users,
  waves: Waves,
  "tree-palm": TreePalm,
  house: House,
  utensils: Utensils,
  mountain: Mountain,
  plane: Plane,
  car: Car,
  briefcase: Briefcase,
  "shopping-basket": ShoppingBasket,
} satisfies Record<string, LucideIcon>;

export function GroupIcon({
  name,
  className,
  size = 22,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const Icon = groupIcons[name as keyof typeof groupIcons] ?? Users;
  return (
    <Icon size={size} strokeWidth={1.8} className={className} aria-hidden />
  );
}
