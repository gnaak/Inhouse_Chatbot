import { SubLinkProps } from "@/types/admin/sidebar";
import { NavLink } from "react-router-dom";

const SubLink = ({
  to,
  label,
  nested = false,
  collapsed = false,
  icon: Icon,
}: SubLinkProps) => {
  const base =
    "flex items-center rounded-lg select-none transition-all duration-300 min-w-0 h-[44px] w-full overflow-hidden";

  const paddingClass = nested ? "pl-8 pr-3" : "px-4";

  const gapClass = collapsed ? "gap-5" : "gap-5";

  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        isActive
          ? `${base} ${paddingClass} ${gapClass} bg-neutral-100 text-textMain font-medium text-sm`
          : `${base} ${paddingClass} ${gapClass} text-textMain/80 hover:bg-neutral-200 hover:text-textMain/90 text-sm`
      }
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      <span className="min-w-0 whitespace-nowrap">{label}</span>
    </NavLink>
  );
};

export default SubLink;
