import { Route, Routes } from "react-router-dom";
import { BaseLayout } from "@/layouts/BaseLayout";
import { SetupGate } from "@/components/SetupGate";
import { SitePage } from "@/site/SitePage";
import { SetupPage } from "@/routes/SetupPage";
import { AdminPage } from "@/routes/AdminPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<SetupGate />}>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="/" element={<SitePage />} />
        <Route element={<BaseLayout />}>
          
          <Route
            path="*"
            element={
              <main style={{ padding: "2rem" }}>
                <h1>404</h1>
                <p>Page not found.</p>
              </main>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
