import { Nav, Footer } from "@/components/chrome";
import { WishlistView } from "@/components/storefront/WishlistView";

export default function WishlistPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <WishlistView />
      </main>
      <Footer />
    </>
  );
}
