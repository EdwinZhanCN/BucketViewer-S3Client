import { FileTextIcon } from "./ui/file-text";
import { LayersIcon } from "./ui/layers";
import { SettingsGearIcon } from "./ui/settings-gear";

interface SideBarProps {
  activePage?: "buckets" | "files" | "settings";
  onNavigate?: (page: "buckets" | "files" | "settings") => void;
}

function SideBar({ activePage = "buckets", onNavigate }: SideBarProps) {
  const handleNavClick = (page: "buckets" | "files" | "settings") => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  return (
    <div className="select-none">
      <ul className="menu w-56 h-full overflow-y-auto p-4">
        <li>
          <button
            className={activePage === "buckets" ? "active" : ""}
            onClick={() => handleNavClick("buckets")}
          >
            <LayersIcon size={20} />
            Buckets
          </button>
        </li>
        <li>
          <button
            className={activePage === "files" ? "active" : ""}
            onClick={() => handleNavClick("files")}
          >
            <FileTextIcon size={20} />
            Files
          </button>
        </li>
        <li>
          <button
            className={activePage === "settings" ? "active" : ""}
            onClick={() => handleNavClick("settings")}
          >
            <SettingsGearIcon size={20} />
            Settings
          </button>
        </li>
      </ul>
    </div>
  );
}

export default SideBar;
