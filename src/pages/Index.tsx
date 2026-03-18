import { useState } from "react";
import DxgSidebar from "@/components/DxgSidebar";
import BusinessInfoForm from "@/components/BusinessInfoForm";
import FacilityInfoForm from "@/components/FacilityInfoForm";
import SupportInfoForm from "@/components/SupportInfoForm";

const tabs = [
  { id: "business", label: "사업장 정보" },
  { id: "facility", label: "시설 정보" },
  { id: "support", label: "지원사업 신청 정보" },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState("business");

  const handleMenuChange = (menu: string) => {
    setActiveTab(menu);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <DxgSidebar activeMenu={activeTab} onMenuChange={handleMenuChange} />

      <main className="flex-1 h-screen overflow-y-auto bg-card">
        {/* Tabs */}
        <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border px-8">
          <nav className="flex space-x-8 h-14">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative h-full text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </header>

        {/* Form Area */}
        <div className="p-8">
          {activeTab === "business" && <BusinessInfoForm />}
          {activeTab === "facility" && <FacilityInfoForm />}
          {activeTab === "support" && <SupportInfoForm />}
        </div>
      </main>
    </div>
  );
};

export default Index;
