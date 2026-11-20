"use client";

/**
 * A bottom-sheet drawer (vaul) on phones and a centred dialog on desktop,
 * with one API. Same pattern as Spliit's currency selector and SplitPro's
 * pickers. Use it for every picker and form that opens over a page.
 */
import {
  createContext,
  use,
  type ComponentProps,
  type ElementType,
} from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/use-media-query";

const DesktopContext = createContext(false);

/** Each part takes the Dialog part's props; the Drawer twin accepts the same. */
function pick<D extends ElementType, M extends ElementType>(
  desktop: D,
  mobile: M,
) {
  return function Responsive(props: ComponentProps<D>) {
    const Component: ElementType = use(DesktopContext) ? desktop : mobile;
    return <Component {...props} />;
  };
}

export function ResponsiveDialog(props: ComponentProps<typeof Dialog>) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const Root = isDesktop ? Dialog : Drawer;
  return (
    <DesktopContext value={isDesktop}>
      <Root {...props} />
    </DesktopContext>
  );
}

export const ResponsiveDialogTrigger = pick(DialogTrigger, DrawerTrigger);
export const ResponsiveDialogClose = pick(DialogClose, DrawerClose);
export const ResponsiveDialogContent = pick(DialogContent, DrawerContent);
export const ResponsiveDialogHeader = pick(DialogHeader, DrawerHeader);
export const ResponsiveDialogFooter = pick(DialogFooter, DrawerFooter);
export const ResponsiveDialogTitle = pick(DialogTitle, DrawerTitle);
export const ResponsiveDialogDescription = pick(
  DialogDescription,
  DrawerDescription,
);
