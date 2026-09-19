/**
 * /setup route — the wizard itself is rendered here; the SetupGate parent
 * already redirected configured installs to /admin.
 */
import { SetupWizard } from "@/components/setup/SetupWizard";

export function SetupPage() {
  return <SetupWizard />;
}
