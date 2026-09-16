import { Route, Routes } from "react-router-dom";
import { BaseLayout } from "@/layouts/BaseLayout";
import { HomePage } from "@/routes/HomePage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<BaseLayout />}>
        <Route path="/" element={<HomePage />} />
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
    </Routes>
  );
}
