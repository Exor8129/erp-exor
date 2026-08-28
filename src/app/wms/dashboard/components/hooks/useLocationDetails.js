import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";

export const useLocationDetails = (item) => {
  const [warehouseInfo, setWarehouseInfo] = useState({ name: "", code: "" });
  const [tierInfo, setTierInfo] = useState({ name: "", tier_number: "" });
  const [loading, setLoading] = useState(false);

  const rackLabel = item?.metadata?.custom_label_id || item?.id || "Unlabeled Rack";

  useEffect(() => {
    const fetchDetails = async () => {
      if (!item?.warehouse_id || !item?.tier_id) return;
      setLoading(true);

      try {
        const [whResponse, tierResponse] = await Promise.all([
          supabase
            .schema("wms")
            .from("warehouses")
            .select("name, code")
            .eq("id", item.warehouse_id)
            .single(),
          supabase
            .schema("wms")
            .from("warehouse_tiers")
            .select("name, tier_number")
            .eq("id", item.tier_id)
            .single(),
        ]);

        if (whResponse.data) setWarehouseInfo(whResponse.data);
        if (tierResponse.data) setTierInfo(tierResponse.data);
      } catch (err) {
        console.error("Error fetching location details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [item?.warehouse_id, item?.tier_id]);

  return { warehouseInfo, tierInfo, rackLabel, loading };
};