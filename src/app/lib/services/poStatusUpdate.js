import { supabase } from "../supabase";

/**
 * Valid allowed status values according to the purchase_orders_status_check database constraint.
 */
export const ALLOWED_PO_STATUSES = [
  "draft",
  "inbound",
  "completed",
  "grn_created",
  "waiting_lr",
  "in_transit",
  "at_destination"
];

/**
 * Updates the status of a Purchase Order by its ID.
 * Automatically handles updated_at timestamp refreshing.
 * 
 * @param {string} id - The UUID of the Purchase Order.
 * @param {('draft'|'Created'|'Updated'|'approved'|'cancelled')} newStatus - The target status value.
 * @returns {Promise<{ success: boolean, error: any }>}
 */
export async function updatePOStatus(id, newStatus) {
  try {
    // 1. Validate status against DB constraint before making network call
    if (!ALLOWED_PO_STATUSES.includes(newStatus)) {
      throw new Error(
        `Invalid status: "${newStatus}". Allowed values are: ${ALLOWED_PO_STATUSES.join(", ")}`
      );
    }

    // 2. Perform update on purchase.purchase_orders
    const { error } = await supabase
      .schema("purchase")
      .from("purchase_orders")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (err) {
    console.error(`Error updating Purchase Order status for ID ${id}:`, err);
    return { success: false, error: err };
  }
}