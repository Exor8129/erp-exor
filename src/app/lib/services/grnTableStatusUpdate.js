import {supabase} from "../supabase";





export async function updateGrnTableStatus(Id, newStatus){

    try{
        const{error}= await supabase
        .schema("purchase")
        .from("grn")
        .update({status:newStatus})
        .eq("id",Id)

        if (error) throw error;

       return { success: true, error: null };
  } catch (err) {
    console.error("Error updating GRN status:", err);
    return { success: false, error: err };
  }
}