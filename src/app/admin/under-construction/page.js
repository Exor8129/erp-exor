"use client";
import { useSearchParams } from "next/navigation";

export default function UnderConstruction() {
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