import SettingsLayout from "../components/SettingsLayout";

import { inventorySchema } from "../department-schemas/inventory";
// import { purchaseSchema } from "../department-schemas/purchase";
// import { salesSchema } from "../department-schemas/sales";
// import { accountsSchema } from "../department-schemas/accounts";

const schemas = {
  inventory: inventorySchema,

};

export default async function DepartmentPage({ params }) {
  const { department } = await params;

  const schema = schemas[department];

  if (!schema) {
    return <div>Department not found</div>;
  }

  return <SettingsLayout schema={schema} />;
}