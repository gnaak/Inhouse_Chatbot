import { SubLinkProps } from "@/types/admin/sidebar";
import { NavLink } from "react-router-dom";

const SubLink = ({
  to,
  label,
  nested = false,
  collapsed = false,
  icon: Icon,
  number: Numbers,
}: SubLinkProps) => {
  const base =
    "flex items-center rounded-lg select-none transition-all duration-300 min-w-0 h-[44px] w-full overflow-hidden";

  const paddingClass = nested ? "pl-8 pr-3" : "px-4";

  const gapClass = collapsed ? "gap-3.5" : "gap-3.5";

  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        isActive
          ? `${base} ${paddingClass} ${gapClass} bg-white/10 text-white font-medium text-xs`
          : `${base} ${paddingClass} ${gapClass} text-neutral-400 hover:bg-white/5 hover:text-white/90 text-xs`
      }
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      <span className="min-w-0 whitespace-nowrap">{label}</span>
      {Numbers > 0 ? (
        <div className="flex-1 flex items-end justify-end">
          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
            <span>{Numbers}</span>
          </div>
        </div>
      ) : null}
    </NavLink>
  );
};

export default SubLink;
