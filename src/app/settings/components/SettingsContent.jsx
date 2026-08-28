"use client";

export default function SettingsContent({
  activeMenu,
  menuItems,
}) {
  const selectedItem = menuItems.find(
    (item) => item.id === activeMenu
  );

  const Component = selectedItem?.component;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-w-0">
      
      <div className="border-b border-slate-200 pb-4 mb-6">
        <h2 className="text-2xl font-semibold">
          {selectedItem?.label}
        </h2>

        <p className="text-slate-500 mt-1">
          {selectedItem?.description}
        </p>
      </div>

      {Component ? (
        <Component />
      ) : (
        <div className="text-slate-500">
          No content configured.
        </div>
      )}
    </div>
  );
}