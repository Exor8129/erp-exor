"use client";

import { Card, Select } from "antd";

export default function ShippingAddress({
  addresses,
  value,
  onChange,
  loading,
}) {
  return (
    <Card title="Shipping Address">
      <Select
        showSearch
        className="w-full"
        placeholder="Select Shipping Address"
        loading={loading}
        value={value?.id}
        onChange={(id) => {
          const selected = addresses.find(
            (a) => a.id === id
          );

          onChange(selected);
        }}
        options={addresses.map((a) => ({
          value: a.id,
          label: a.name,
        }))}
      />

      {value && (
        <div className="mt-4 text-sm text-slate-600">
          <div className="font-semibold">
            {value.company}
          </div>

          <div>{value.addressLine1}</div>

          {value.addressLine2 && (
            <div>{value.addressLine2}</div>
          )}

          <div>
            {value.city}, {value.state}
          </div>

          <div>{value.pincode}</div>

          <div className="mt-1 text-xs">
            GSTIN : {value.gstin}
          </div>
        </div>
      )}
    </Card>
  );
}