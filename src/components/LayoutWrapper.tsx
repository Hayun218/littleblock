"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showFooter = !pathname.startsWith("/editor");
  const isHome = pathname === "/";
  const isGallery = pathname === "/gallery";

  const contentMinHeight = isHome ? {} : isGallery ? { flex: 1 } : { minHeight: "100vh" };

  return (
    <div style={{ display: "flex", flexDirection: "column", ...(isHome ? {} : { minHeight: "100vh" }) }}>
      <div style={contentMinHeight}>
        {children}
      </div>
      {showFooter && <Footer />}
    </div>
  );
}
