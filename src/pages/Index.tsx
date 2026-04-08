import { useState } from "react";
import DxgSidebar from "@/components/DxgSidebar";
import BusinessInfoForm from "@/components/BusinessInfoForm";
import FacilityInfoForm from "@/components/FacilityInfoForm";
import SupportInfoForm from "@/components/SupportInfoForm";
import SensorCertForm from "@/components/SensorCertForm";
import { useProject } from "@/contexts/ProjectContext";

const tabs = [
  { id: "sensor-cert", label: "센서 성적서 관리" },
  { id: "business", label: "사업장 정보" },
  { id: "facility", label: "시설 정보" },
  { id: "support", label: "지원사업 신청 정보" },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState("business");
  const { project, setEmissions, setPreventions } = useProject();

  const handleMenuChange = (menu: string) => {
    setActiveTab(menu);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <DxgSidebar activeMenu={activeTab} onMenuChange={handleMenuChange} />

      <main className="flex-1 h-screen overflow-y-auto bg-card">
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

        <div className="p-8">
          {activeTab === "business" && <BusinessInfoForm />}
          {activeTab === "facility" && (
            <FacilityInfoForm
              emissions={project.emissions}
              setEmissions={setEmissions}
              preventions={project.preventions}
              setPreventions={setPreventions}
            />
          )}
          {activeTab === "support" && (
            <SupportInfoForm
              emissions={project.emissions}
              preventions={project.preventions}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
