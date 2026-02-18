import * as React from "react";

const MOBILE_BREAKPOINT = 768;
/** Tailwind lg = 1024px; below this show sidebar as drawer */
const SIDEBAR_DRAWER_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/** True when viewport is below lg (1024px); use for showing sidebar as drawer + header menu button */
export function useIsSidebarDrawer() {
  const [isDrawer, setIsDrawer] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SIDEBAR_DRAWER_BREAKPOINT - 1}px)`);
    const onChange = () => setIsDrawer(window.innerWidth < SIDEBAR_DRAWER_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setIsDrawer(window.innerWidth < SIDEBAR_DRAWER_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isDrawer;
}
