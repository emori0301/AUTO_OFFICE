import { useMemo } from 'react';
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

  const availableGroups = useMemo(() => {
    const seen = new Map<string, string>();
    for (const info of userInfos) {
      for (const g of info.groups) {
        seen.set(g.groupName, g.groupName);
      }
    }
    return Array.from(seen.values()).sort();
  }, [userInfos]);

  const availableBranches = useMemo(() => {
    const seen = new Map<string, string>();
    for (const info of userInfos) seen.set(info.branchId, info.branchName);
    return Array.from(seen.values()).sort();
  }, [userInfos]);

  const isFiltering = hasActiveFilter(filter);

  return (
    <aside className="w-56 h-full flex flex-col bg-gray-950 border-r border-gray-800 text-white overflow-y-auto shrink-0">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
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

      <div className="flex-1 px-3 pb-4 flex flex-col gap-4 overflow-y-auto">
        {/* WorkStyle filter */}
        <section>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">在籍形態</h4>
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
        </section>

        {/* AssignDot filter */}
        <section>
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">アサイン状況</h4>
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
        </section>

        {/* Branch filter */}
        {availableBranches.length > 1 && (
          <section>
            <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">拠点</h4>
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
          </section>
        )}

        {/* Group filter */}
        {availableGroups.length > 0 && (
          <section>
            <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">グループ</h4>
            <div className="flex flex-col gap-1">
              {availableGroups.map(name => (
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
          </section>
        )}
      </div>

      {/* Footer: member count */}
      <div className="px-3 py-2 border-t border-gray-800 text-[10px] text-gray-600">
        {users.length} 名在籍
      </div>
    </aside>
  );
}
