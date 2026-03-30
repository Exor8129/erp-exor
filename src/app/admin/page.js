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
  Drill,
  Printer,
} from "lucide-react";
import { useRouter } from "next/navigation";

import WarehouseModal from "./components/WarehouseModal";
import RackModal from "./components/RackModal";
import TeamModal from "./components/TeamModal";

export default function AdminPage() {
  const [openModal, setOpenModal] = useState(null);
  const router = useRouter();
  const sections = [
    {
      title: "System Configuration",
      items: [
        { name: "Warehouses", key: "warehouse", icon: Warehouse, modal: "warehouse"  },
        { name: "Racks", key: "racks", icon: Layers, modal: "racks"  },
        { name: "WarehouseLayouts", key: "WarehouseLayouts", icon: Warehouse,route: "/admin/warehouse-layout" },
      ],
    },
    {
      title: "Inventory Controls",
      items: [
        { name: "Cycle Count Dashboard", key: "cycle", icon: RefreshCw,route: "/cyclecount" },
        { name: "ABC Classification", key: "abc", icon: Boxes },
        { name: "Controlled Count", key: "controlled", icon: Layers },
        { name: "Year End Count", key: "yearend", icon: Database,route: "/admin/yearEndCountInitiate" },
        { name: "Create Counting Team", key: "counting-team", icon: Users,modal: "counting-team" },
        { name: "Verification", key: "verification", icon: Shield,modal: "verification",route: "/admin/verification" },

      ],
    },
    {
      title: "Master Data",
      items: [
        { name: "Product Groups", key: "groups", icon: Folder },
        { name: "Import Stock Data", key: "stock", icon: Boxes,route: "/admin/importStock" },
        { name: "Purchase Rate Correction", key: "pur-rate-corr", icon: Layers,route: "/admin/purchase-rate-correction" },
      ],
    },
    {
      title: "User & Security",
      items: [
        { name: "Users", key: "users", icon: Users,route: "/admin/users" },
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
    {
      title: "Future Features",
      items: [
        { name: "Complaints", key: "complaints", icon: Drill,route: "/admin/complaints" },
        { name: "Print Count Sheets", key: "print-count-sheets", icon: Printer,route: "/admin/printcountpage/26" },
        
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
                        if (item.route) {
                          router.push(item.route);
                        } else if (item.modal) {
                          setOpenModal(item.modal);
                        
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

      <TeamModal
      open={openModal === "counting-team"}
        onClose={() => setOpenModal(null)}
      />
    </div>
  );
}
