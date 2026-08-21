import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Backdrop } from "@/components/layout/Backdrop";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomTabs } from "@/components/layout/BottomTabs";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ChatWidget } from "@/components/support/ChatWidget";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { JsonLd } from "@/components/JsonLd";
import { organizationLd, websiteLd } from "@/lib/seo";
import { getAgeGroups, getAllCategories, getTopCategories } from "@/lib/data";

/** Customer-facing chrome. The admin surface deliberately does not use this. */
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nav data is fetched once here and passed down, so page-level requests
  // never re-query the taxonomy.
  const [topCategories, allCategories, ageGroups] = await Promise.all([
    getTopCategories(),
    getAllCategories(),
    getAgeGroups(),
  ]);

  return (
    <SessionProvider>
      <Backdrop />
      <JsonLd data={[organizationLd(), websiteLd()]} />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <AnnouncementBar />
      <Header
        topCategories={topCategories}
        allCategories={allCategories}
        ageGroups={ageGroups}
      />

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer topCategories={topCategories} ageGroups={ageGroups} />

      {/* Reserves the strip the floating tab bar sits over, so the footer
          and any page's last row stay reachable on mobile. */}
      <div aria-hidden className="h-[84px] lg:hidden" />

      <CartDrawer />
      <BottomTabs />
      <ChatWidget />
    </SessionProvider>
  );
}
