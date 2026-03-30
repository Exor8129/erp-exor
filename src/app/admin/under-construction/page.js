"use client";

import { Suspense } from "react";
import UnderConstructionContent from "./UnderConstructionContent";

// ✅ FORCE dynamic rendering (VERY IMPORTANT)
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading...</div>}>
      <UnderConstructionContent />
    </Suspense>
  );
}