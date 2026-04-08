import { Search, Building2, Settings2, FileText, LogOut, FilePlus2, ClipboardList } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface DxgSidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

const menuItems = [
  { id: "sensor-cert", label: "센서 성적서 관리", icon: ClipboardList },
  { id: "business", label: "사업장 정보", icon: Building2 },
  { id: "facility", label: "시설 정보", icon: Settings2 },
  { id: "support", label: "지원사업 신청 정보", icon: FileText },
];

const DxgSidebar = ({ activeMenu, onMenuChange }: DxgSidebarProps) => {
  const { user, token, logout } = useAuth();
  const { projectList, loadProjectList, loadProject, saveDraft, saveFinal, saving, resetProject } = useProject();

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

  const handleNew = () => {
    resetProject();
    setSelectedProject("");
  };

  return (
    <aside className="w-[280px] h-screen flex flex-col bg-sidebar shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="text-sidebar-foreground font-bold tracking-tight text-base">DXG IoT 문서 자동화</h1>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-sidebar-foreground/60">
            {user?.name} ({user?.role}) / {user?.phone}
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
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            저장 프로젝트
          </label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full h-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground text-sm">
              <SelectValue placeholder="기존 프로젝트 선택" />
            </SelectTrigger>
            <SelectContent>
              {filteredProjects.map((p) => (
                <SelectItem key={p.project_key} value={p.project_key}>
                  {p.project_key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" size="sm" className="w-full" onClick={handleLoad} disabled={!selectedProject}>
              불러오기
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={async () => {
                if (!selectedProject) return;
                if (!confirm("삭제하시겠습니까?")) return;

                try {
                  const response = await fetch(
                    `https://doc.dxg.kr/api/projects/${encodeURIComponent(selectedProject)}`,
                    {
                      method: "DELETE",
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    },
                  );

                  if (!response.ok) {
                    throw new Error("DELETE 실패");
                  }

                  toast({
                    title: "삭제 완료",
                    description: "프로젝트가 삭제되었습니다.",
                  });

                  setSelectedProject("");
                  await loadProjectList(token || "");
                } catch (e) {
                  toast({
                    title: "삭제 실패",
                    description: "삭제 중 오류가 발생했습니다.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={!selectedProject}
            >
              삭제
            </Button>
            <Button size="sm" className="w-full" onClick={handleNew}>
              <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
              신규
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" className="w-full" onClick={() => saveDraft(token)} disabled={saving}>
            {saving ? "저장중..." : "임시저장"}
          </Button>
          <Button size="sm" className="w-full" onClick={() => saveFinal(token)} disabled={saving}>
            {saving ? "저장중..." : "최종저장"}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default DxgSidebar;
