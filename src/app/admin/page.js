"use client";

import { useState } from "react";
import { Card, Row, Col } from "antd";

import {
  Warehouse,
  Layers,
  Boxes,
  RefreshCw,
  Users,
  Shield,
  Database,
  Settings,
  Upload,
  Folder,
} from "lucide-react";
import { useRouter } from "next/navigation";

import WarehouseModal from "./components/WarehouseModal";
import RackModal from "./components/RackModal";

export default function AdminPage() {
  const [openModal, setOpenModal] = useState(null);
  const router = useRouter();
  const sections = [
    {
      title: "System Configuration",
      items: [
        { name: "Warehouses", key: "warehouse", icon: Warehouse },
        { name: "Racks", key: "racks", icon: Layers },
        { name: "WarehouseLayouts", key: "WarehouseLayouts", icon: Warehouse },
      ],
    },
    {
      title: "Inventory Controls",
      items: [
        { name: "Initiate Cycle Count", key: "cycle", icon: RefreshCw },
        { name: "ABC Classification", key: "abc", icon: Boxes },
        { name: "Controlled Count", key: "controlled", icon: Layers },
        { name: "Year End Count", key: "yearend", icon: Database },
      ],
    },
    {
      title: "Master Data",
      items: [
        { name: "Product Groups", key: "groups", icon: Folder },
        { name: "Units", key: "units", icon: Boxes },
        { name: "Categories", key: "categories", icon: Layers },
      ],
    },
    {
      title: "User & Security",
      items: [
        { name: "Users", key: "users", icon: Users },
        { name: "Roles & Permissions", key: "roles", icon: Shield },
      ],
    },
    {
      title: "Integration",
      items: [
        { name: "Sync Tally", key: "tally", icon: RefreshCw },
        { name: "Import Data", key: "import", icon: Upload },
        { name: "System Logs", key: "logs", icon: Database },
      ],
    },
    {
      title: "Maintenance",
      items: [
        { name: "Backup Database", key: "backup", icon: Database },
        { name: "Restore Backup", key: "restore", icon: Upload },
        { name: "App Settings", key: "settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold mb-8">Admin Console</h1>

      <Row gutter={[24, 24]}>
        {sections.map((section) => (
          <Col span={8} key={section.title}>
            <Card title={section.title} className="rounded-xl shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.key}
                      onClick={() => {
                        if (item.key === "WarehouseLayouts") {
                          router.push("/admin/warehouse-layout");
                        } else {
                          setOpenModal(item.key);
                        }
                      }}
                      className="flex items-center gap-3 p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition"
                    >
                      <Icon size={20} className="text-blue-600" />
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Example Modal */}

      <WarehouseModal
        open={openModal === "warehouse"}
        onClose={() => setOpenModal(null)}
      />

      <RackModal
        open={openModal === "racks"}
        onClose={() => setOpenModal(null)}
      />

      
    </div>
  );
}
