import { Suspense } from "react";
import UnderConstructionContent from "./UnderConstructionContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UnderConstructionContent />
    </Suspense>
  );
}