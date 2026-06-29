"use client";

export default function SettingsSidebar({
  menuItems,
  activeMenu,
  setActiveMenu,
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Search Box */}
      <div className="p-4 border-b border-slate-200">
        <input
          type="text"
          placeholder="Search settings..."
          className="
            w-full
            rounded-lg
            border
            border-slate-300
            px-3
            py-2
            text-sm
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            focus:border-blue-500
          "
        />
      </div>

      {/* Menu Items */}
      <div className="py-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveMenu(item.id)}
            className={`
              w-full
              px-4
              py-3
              text-left
              transition-all
              duration-200
              border-r-4

              ${
                activeMenu === item.id
                  ? "bg-blue-50 text-blue-600 border-blue-600 font-medium"
                  : "border-transparent text-slate-700 hover:bg-slate-50"
              }
            `}
          >
            <div className="flex flex-col">
              <span>{item.label}</span>

              {item.description && (
                <span className="text-xs text-slate-400 mt-1">
                  {item.description}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}