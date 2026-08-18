import React from "react";

export default function EmailGroupSelector({ groups, selectedGroups, onChange }) {
  const toggleGroup = (group) => {
    onChange(selectedGroups.includes(group)
      ? selectedGroups.filter((item) => item !== group)
      : [...selectedGroups, group]);
  };

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {groups.map((group) => (
        <label key={group.value} className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={selectedGroups.includes(group.value)} onChange={() => toggleGroup(group.value)} />
          {group.label}
        </label>
      ))}
    </div>
  );
}