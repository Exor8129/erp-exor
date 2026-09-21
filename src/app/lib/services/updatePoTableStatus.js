import {supabase} from "../supabase";


export async function updatePoTableStatus(Id, newStatus){

    try{
        const{error}= await supabase
        .schema("purchase")
        .from("purchase_orders")
        .update({status:newStatus})
        .eq("id",Id)

        if (error) throw error;

       return { success: true, error: null };
  } catch (err) {
    console.error("Error updating GRN status:", err);
    return { success: false, error: err };
  }
}