import { useMemo, useState } from 'react';
import { useOfficeStore } from '../store/useOfficeStore';
import { hasActiveFilter } from '../utils/filter';
import { WORKSTYLE_OPTIONS, ASSIGN_DOT_OPTIONS } from '../constants/workStyle';

function FilterTag({
  label,
  bgCss,
  active,
  onClick,
}: {
  label: string;
  bgCss: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all
        ${active
          ? 'bg-white/15 text-white border border-white/30'
          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-300'
        }`}
    >
      <span className={`w-2 h-2 rounded-full ${bgCss} flex-shrink-0`} />
      {label}
    </button>
  );
}

function AccordionSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-1 group"
      >
        <h4 className="text-[10px] text-gray-500 uppercase tracking-wider group-hover:text-gray-400 transition-colors">
          {title}
        </h4>
        <svg
          className={`w-3 h-3 text-gray-600 transition-transform group-hover:text-gray-400 ${open ? 'rotate-0' : '-rotate-90'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </section>
  );
}

function GroupFilterList({
  names,
  filterGroupNames,
  toggleFilterGroupName,
}: {
  names: string[];
  filterGroupNames: string[];
  toggleFilterGroupName: (name: string) => void;
}) {
  if (names.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {names.map(name => (
        <button
          key={name}
          onClick={() => toggleFilterGroupName(name)}
          className={`text-left px-2.5 py-1.5 rounded-lg text-xs transition-all border
            ${filterGroupNames.includes(name)
              ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300'
            }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

export function Sidebar() {
  const filterText       = useOfficeStore(s => s.filter.filterText);
  const filterWorkStyles = useOfficeStore(s => s.filter.filterWorkStyles);
  const filterAssignDots = useOfficeStore(s => s.filter.filterAssignDots);
  const filterGroupNames = useOfficeStore(s => s.filter.filterGroupNames);
  const filter           = useOfficeStore(s => s.filter);
  const userInfos        = useOfficeStore(s => s.userInfos);
  const users            = useOfficeStore(s => s.users);

  const setFilterText         = useOfficeStore(s => s.setFilterText);
  const toggleFilterWorkStyle = useOfficeStore(s => s.toggleFilterWorkStyle);
  const toggleFilterAssignDot = useOfficeStore(s => s.toggleFilterAssignDot);
  const toggleFilterGroupName = useOfficeStore(s => s.toggleFilterGroupName);
  const clearFilters          = useOfficeStore(s => s.clearFilters);

  const groupsByCategory = useMemo(() => {
    const project = new Map<string, string>();
    const team    = new Map<string, string>();
    const club    = new Map<string, string>();
    for (const info of userInfos) {
      for (const g of info.groups) {
        if (g.category === 'project') project.set(g.groupName, g.groupName);
        else if (g.category === 'team') team.set(g.groupName, g.groupName);
        else if (g.category === 'club') club.set(g.groupName, g.groupName);
      }
    }
    return {
      project: Array.from(project.values()).sort(),
      team:    Array.from(team.values()).sort(),
      club:    Array.from(club.values()).sort(),
    };
  }, [userInfos]);

  const hasGroups =
    groupsByCategory.project.length > 0 ||
    groupsByCategory.team.length > 0 ||
    groupsByCategory.club.length > 0;

  const availableBranches = useMemo(() => {
    const seen = new Map<string, string>();
    for (const info of userInfos) seen.set(info.branchId, info.branchName);
    return Array.from(seen.values()).sort();
  }, [userInfos]);

  const isFiltering = hasActiveFilter(filter);

  return (
    <aside className="w-56 h-full flex flex-col bg-gray-950 border-r border-gray-800 text-white overflow-y-auto shrink-0">
      {/* Search */}
      <div className="px-3 pt-4 pb-2.5">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
          <input
            type="text"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder="名前・案件・チームで検索"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2
                       text-xs text-white placeholder-gray-500 focus:outline-none
                       focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Clear button */}
      {isFiltering && (
        <div className="px-3 pb-2">
          <button
            onClick={clearFilters}
            className="w-full text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors text-left py-1"
          >
            フィルタをクリア
          </button>
        </div>
      )}

      <div className="flex-1 px-3 pb-5 flex flex-col gap-4 overflow-y-auto">
        {/* WorkStyle filter — accordion */}
        <AccordionSection title="在籍形態">
          <div className="flex flex-wrap gap-1.5">
            {WORKSTYLE_OPTIONS.map(o => (
              <FilterTag
                key={o.value}
                label={o.label}
                bgCss={o.bgCss}
                active={filterWorkStyles.includes(o.value)}
                onClick={() => toggleFilterWorkStyle(o.value)}
              />
            ))}
          </div>
        </AccordionSection>

        {/* AssignDot filter — accordion */}
        <AccordionSection title="アサイン状況">
          <div className="flex flex-wrap gap-1.5">
            {ASSIGN_DOT_OPTIONS.map(o => (
              <FilterTag
                key={o.value}
                label={o.label}
                bgCss={o.bgCss}
                active={filterAssignDots.includes(o.value)}
                onClick={() => toggleFilterAssignDot(o.value)}
              />
            ))}
          </div>
        </AccordionSection>

        {/* Branch filter */}
        {availableBranches.length > 1 && (
          <AccordionSection title="拠点">
            <div className="flex flex-wrap gap-1.5">
              {availableBranches.map(name => (
                <button
                  key={name}
                  onClick={() => toggleFilterGroupName(name)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-all border
                    ${filterGroupNames.includes(name)
                      ? 'bg-white/15 text-white border-white/30'
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-300'
                    }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </AccordionSection>
        )}

        {/* Group filter — accordion, split by category */}
        {hasGroups && (
          <AccordionSection title="グループ">
            <div className="flex flex-col gap-3">
              {groupsByCategory.project.length > 0 && (
                <div>
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1 px-0.5">案件</p>
                  <GroupFilterList
                    names={groupsByCategory.project}
                    filterGroupNames={filterGroupNames}
                    toggleFilterGroupName={toggleFilterGroupName}
                  />
                </div>
              )}
              {groupsByCategory.team.length > 0 && (
                <div>
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1 px-0.5">チーム</p>
                  <GroupFilterList
                    names={groupsByCategory.team}
                    filterGroupNames={filterGroupNames}
                    toggleFilterGroupName={toggleFilterGroupName}
                  />
                </div>
              )}
              {groupsByCategory.club.length > 0 && (
                <div>
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1 px-0.5">部活動</p>
                  <GroupFilterList
                    names={groupsByCategory.club}
                    filterGroupNames={filterGroupNames}
                    toggleFilterGroupName={toggleFilterGroupName}
                  />
                </div>
              )}
            </div>
          </AccordionSection>
        )}
      </div>

      {/* Footer: member count */}
      <div className="px-3 py-3 border-t border-gray-800 text-[10px] text-gray-600">
        {users.length} 名在籍
      </div>
    </aside>
  );
}
