"use client";

import { Card, Button, Divider } from "antd";
import {
  Save,
  Eye,
  FilePlus2,
  X,
} from "lucide-react";

export default function POFooter({
totalItems = 0,
  totalQty = 0,
  grandTotal = 0,
  onCancel,
  onSaveDraft,
  onPreview,
  onSubmit,
}) {

    
  return (
    <Card className="shadow-sm rounded-xl">
      <div className="flex justify-between items-center">
        {/* Summary */}
        <div className="flex gap-10">
          <div>
            <p className="text-xs text-gray-500">Items</p>
            <p className="font-semibold">{totalItems}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Quantity</p>
            <p className="font-semibold">{totalQty}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">PO Value</p>
            <p className="font-semibold text-lg">
              ₹ {grandTotal.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            icon={<X size={16} />}
            onClick={onCancel}
          >
            Cancel
          </Button>

          <Button
            icon={<Save size={16} />}
            onClick={onSaveDraft}
          >
            Save Draft
          </Button>

          

          <Button
            type="primary"
            icon={<FilePlus2 size={16} />}
            onClick={onSubmit}
          >
            Create PO
          </Button>
        </div>
      </div>
    </Card>
  );
}