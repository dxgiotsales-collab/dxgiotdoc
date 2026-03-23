import { Search, Building2, Settings2, FileText, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";

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
  const { userName, role, token, logout } = useAuth();
  const { projectList, loadProjectList, loadProject, saveDraft, saveFinal, saving } = useProject();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  // Load project list on mount
  useEffect(() => {
    loadProjectList(token || "");
  }, [token, loadProjectList]);

  const filteredProjects = (projectList || []).filter(
    (p) => !searchQuery || (p.project_key || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleLoad = () => {
    if (selectedProject) {
      loadProject(selectedProject, token || "");
    }
  };

  return (
    <aside className="w-[280px] h-screen flex flex-col bg-sidebar shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="text-sidebar-foreground font-bold tracking-tight text-base">DXG IoT 문서 자동화</h1>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-sidebar-foreground/60">
            {userName} ({role})
          </span>
          <button
            onClick={logout}
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            title="로그아웃"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
          <input
            type="text"
            placeholder="사업장 / 지역 / 연도 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 px-3 pl-9 text-sm rounded-md border-none bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-foreground/40 outline-none focus:ring-2 focus:ring-sidebar-ring/30"
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
                isActive ? "text-sidebar-accent-foreground bg-sidebar-accent" : "text-sidebar-foreground hover:bg-muted"
              }`}
            >
              <item.icon className="mr-2.5 h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Project Management */}
      <div className="p-4 mt-auto border-t border-sidebar-border space-y-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            저장 프로젝트
          </label>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            <option value="">기존 프로젝트 선택</option>
            {filteredProjects.map((p) => (
              <option key={p.project_key} value={p.project_key}>
                {p.project_key}
              </option>
            ))}
          </select>
          <button
            className="w-full h-9 text-sm font-medium text-sidebar-foreground bg-sidebar-accent border border-sidebar-border rounded-md hover:bg-sidebar-primary transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
            onClick={handleLoad}
            disabled={!selectedProject}
          >
            불러오기
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="h-9 text-sm font-medium text-sidebar-foreground bg-sidebar-accent rounded-md hover:bg-sidebar-primary transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
            onClick={() => saveDraft(token)}
            disabled={saving}
          >
            {saving ? "저장중..." : "임시저장"}
          </button>
          <button
            className="h-9 text-sm font-medium text-primary-foreground bg-sidebar-primary rounded-md hover:brightness-110 transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
            onClick={() => saveFinal(token)}
            disabled={saving}
          >
            {saving ? "저장중..." : "최종저장"}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DxgSidebar;
