import { useState, useEffect, useCallback } from "react";
import { BellIcon } from "./ui/bell";
import { useSettings } from "@/services/settingsService";

interface HeaderProps {
  currentBucket?: string;
  onSearch?: (query: string) => void;
}

export function Header({ currentBucket, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { settings, updateAppearanceSettings } = useSettings();

  // Apply theme based on settings
  const applyTheme = useCallback(() => {
    if (!settings) return;
    
    if (settings.appearance.theme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.setAttribute("data-theme", "dark");
    } else if (settings.appearance.theme === 'light') {
      setIsDarkMode(false);
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
  }, [settings?.appearance.theme]);
  
  // Apply theme whenever settings change
  useEffect(() => {
    applyTheme();
  }, [applyTheme]);
  
  // Listen for system theme changes if using system theme
  useEffect(() => {
    if (!settings || settings.appearance.theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings?.appearance.theme]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(searchQuery);
  };

  const toggleTheme = async () => {
    if (!settings) return;
    
    const newTheme = isDarkMode ? "light" : "dark";
    setIsDarkMode(!isDarkMode);
    
    // Update settings using new API
    try {
      await updateAppearanceSettings({
        ...settings.appearance,
        theme: newTheme
      });
    } catch (error) {
      console.error('Failed to update theme:', error);
      // Revert the UI state if the update failed
      setIsDarkMode(!isDarkMode);
    }
    
    // No need to set data-theme here as it will be handled by useEffect when settings change
  };

  return (
    <div className="bg-base-100 border-b border-base-300 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">
          {/* App logo would go here */}
          <span className="text-primary">Bucket</span>Viewer
        </h1>
        {currentBucket && (
          <div className="breadcrumbs text-sm">
            <ul>
              <li>Buckets</li>
              <li className="font-medium">{currentBucket}</li>
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search files..."
            className="input input-sm input-bordered rounded-full w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <div className="indicator">
              <BellIcon size={30} />
              <span className="indicator-item badge badge-sm badge-primary">
                3
              </span>
            </div>
          </div>
          <div
            tabIndex={0}
            className="dropdown-content z-[1] card card-compact w-64 shadow bg-base-100"
          >
            <div className="card-body">
              <h3 className="font-bold text-lg">Notifications</h3>
              <ul className="space-y-2">
                <li className="flex gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                  <span>Files uploaded successfully</span>
                </li>
                <li className="flex gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                  <span>New storage quota allocated</span>
                </li>
                <li className="flex gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                  <span>Bucket permissions updated</span>
                </li>
              </ul>
              <div className="card-actions justify-end mt-2">
                <button className="btn btn-sm btn-ghost">View all</button>
              </div>
            </div>
          </div>
        </div>

        <label className="swap swap-rotate">
          {/* this hidden checkbox controls the state */}
          <input 
            type="checkbox" 
            className="theme-controller" 
            checked={isDarkMode}
            onChange={toggleTheme}
          />

          {/* sun icon */}
          <svg
            className="swap-off h-10 w-10 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
          </svg>

          {/* moon icon */}
          <svg
            className="swap-on h-10 w-10 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
          </svg>
        </label>
      </div>
    </div>
  );
}

export default Header;
