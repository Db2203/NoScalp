import { Nav, Footer } from "@/components/chrome";
import { AccountView } from "@/components/storefront/AccountView";

export default function AccountPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <AccountView />
      </main>
      <Footer />
    </>
  );
}
