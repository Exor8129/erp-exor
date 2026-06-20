"use client";

import { useParams } from "next/navigation";
import CreatePOPage from "../../create-po/page";

export default function EditPOPage() {
  const params = useParams();

  return (
    <CreatePOPage
      mode="edit"
      poId={params.id}
    />
  );
}