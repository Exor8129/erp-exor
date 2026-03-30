"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function UnderConstructionContent() {
  const params = useSearchParams();
  const feature = params.get("feature");

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>🚧 Under Construction</h1>
      <p>
        {feature ? `${feature} will be available soon.` : "Coming soon."}
      </p>
    </div>
  );
}

export default function UnderConstruction() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading...</div>}>
      <UnderConstructionContent />
    </Suspense>
  );
}