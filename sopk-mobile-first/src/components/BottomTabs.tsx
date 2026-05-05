"use client";

export type TabId = "plan" | "suivi" | "conseils" | "hydratation";

interface BottomTabsProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "plan", label: "Plan", icon: "🍽️" },
  { id: "suivi", label: "Suivi", icon: "📈" },
  { id: "conseils", label: "Conseils", icon: "💡" },
  { id: "hydratation", label: "Eau", icon: "💧" },
];

export function BottomTabs({ activeTab, onChange }: BottomTabsProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-violet-100 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2 px-3 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
              activeTab === tab.id
                ? "bg-violet-600 text-white shadow"
                : "bg-violet-50 text-violet-700 hover:bg-violet-100"
            }`}
            type="button"
          >
            <span className="block text-sm">{tab.icon}</span>
            <span className="block">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
