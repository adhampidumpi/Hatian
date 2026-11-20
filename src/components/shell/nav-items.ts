import {
  Activity,
  House,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const homeItem: NavItem = { href: "/", label: "Home", icon: House };
export const groupsItem: NavItem = {
  href: "/groups",
  label: "Groups",
  icon: Users,
};
export const activityItem: NavItem = {
  href: "/activity",
  label: "Activity",
  icon: Activity,
};
export const accountItem: NavItem = {
  href: "/account",
  label: "Account",
  icon: UserRound,
};

export const ADD_EXPENSE_HREF = "/expenses/new";

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
