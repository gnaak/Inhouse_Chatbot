import { GroupProps } from "@/types/admin/sidebar";
import SubLink from "./subLink";
import { useLocation } from "react-router-dom";

const GroupLink = ({ item, collapsed }: GroupProps) => {
  const { pathname } = useLocation();
  const isChild = item.children.some((child) => pathname.startsWith(child.to));

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1">
        {item.children.map((link) => (
          <SubLink
            key={link.to}
            to={link.to}
            label={link.label}
            icon={link.icon}
            collapsed
          />
        ))}
      </div>
    );
  }

  const Icon = item?.icon;

  return (
    <div className="pb-4">
      <div
        className={`px-4 py-2 flex items-center gap-3 text-lg font-medium
        ${isChild ? "text-white" : "text-neutral-400"}`}
      >
        {Icon && (
          <Icon
            className={`h-4 w-4
            ${isChild ? "text-white" : "text-neutral-400"}`}
          />
        )}
        <span className="truncate">{item?.title}</span>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        {item?.children.map((link) => (
          <SubLink
            key={link.to}
            to={link.to}
            label={link.label}
            icon={link.icon}
            nested
          />
        ))}
      </div>
    </div>
  );
};

export default GroupLink;
