"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useSessionBootstrap } from "@/store/useAuth";
import { useCartBootstrap } from "@/store/useCart";
import { useWishlistBootstrap } from "@/store/useWishlist";
import { joinPresence, movePresence } from "@/utils/socket";

/**
 * Resolves session, cart and wishlist once for the whole app, and reports
 * this visitor to the live-traffic socket.
 *
 * Mounted high in the tree so a page with a header badge, a drawer and a cart
 * page still makes one request each rather than three.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  useSessionBootstrap();
  useCartBootstrap();
  useWishlistBootstrap();

  const pathname = usePathname();
  const joined = useRef(false);

  useEffect(() => {
    const title = document.title.split("|")[0].trim() || pathname;

    if (!joined.current) {
      joined.current = true;
      joinPresence(pathname, title);
    } else {
      movePresence(pathname, title);
    }
  }, [pathname]);

  return <>{children}</>;
}
