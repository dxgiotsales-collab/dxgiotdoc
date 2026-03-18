import { Search, Building2, Settings2, FileText } from "lucide-react";
import { useState } from "react";

interface DxgSidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

const menuItems = [
  { id: "business", label: "사업장 정보", icon: Building2 },
  { id: "facility", label: "시설 정보", icon: Settings2 },
  { id: "support", label: "지원사업 신청 정보", icon: FileText },
];

const DxgSidebar = ({ activeMenu, onMenuChange }: DxgSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  return (
    <aside className="w-[280px] h-screen flex flex-col border-r border-border bg-secondary shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <h1 className="text-foreground font-bold tracking-tight text-base">
          DXG IoT 문서 자동화
        </h1>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="사업장 / 지역 / 연도 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="dxg-input pl-9"
            style={{ boxShadow: "var(--shadow-input)" }}
          />
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                isActive
                  ? "text-sidebar-accent-foreground bg-sidebar-accent"
                  : "text-sidebar-foreground hover:bg-muted"
              }`}
            >
              <item.icon className="mr-2.5 h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Project Management */}
      <div className="p-4 mt-auto border-t border-border space-y-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            저장 프로젝트
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="dxg-input"
          >
            <option value="">기존 프로젝트 선택</option>
            <option value="p1">프로젝트 A - 2024</option>
            <option value="p2">프로젝트 B - 2024</option>
            <option value="p3">프로젝트 C - 2023</option>
          </select>
          <button className="w-full h-9 text-sm font-medium text-secondary-foreground bg-card border border-border rounded-md hover:bg-muted transition-all duration-150 active:scale-[0.98]">
            불러오기
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="h-9 text-sm font-medium text-secondary-foreground bg-muted rounded-md hover:bg-border transition-all duration-150 active:scale-[0.98]">
            임시저장
          </button>
          <button className="h-9 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:brightness-95 transition-all duration-150 active:scale-[0.98]"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
            최종저장
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DxgSidebar;
