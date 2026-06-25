import { Nav, Footer } from "@/components/chrome";
import { MissionControl } from "@/components/MissionControl";
import { DEMO_DROP_ID } from "@/lib/constants";

export default function ControlPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <MissionControl dropId={DEMO_DROP_ID} />
      </main>
      <Footer />
    </>
  );
}
