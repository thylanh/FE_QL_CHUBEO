"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { Role } from "../type/interface";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
} from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean; roles?: Role[] }[];
};

type OpenSubmenu = {
  type: "main" | "others";
  index: number;
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Bảng điều khiển",
    subItems: [{ name: "Tổng quan cửa hàng", path: "/", pro: false }],
  },
  {
    icon: <CalenderIcon />,
    name: "Lịch làm việc & Đăng ký ca",
    path: "/calendar",
  },
  {
    name: "Bán hàng & POS",
    icon: <ListIcon />,
    subItems: [
      { name: "Tạo đơn hàng", path: "/form-elements", pro: false },
      { name: "Quản lý đơn hàng", path: "/orders", pro: false },
      { name: "Sổ thu chi", path: "/cashbook", pro: false, roles: ["ADMIN", "MANAGER"] },
    ],
  },
  {
    name: "Thực đơn & Giá",
    icon: <TableIcon />,
    path: "/basic-tables",
  },
  {
    name: "Quản lý kho",
    icon: <PageIcon />,
    subItems: [
      { name: "Danh sách nguyên liệu", path: "/inventory", pro: false },
      { name: "Xuất nhập tồn kho", path: "/inventory/transactions", pro: false, roles: ["ADMIN", "MANAGER"] },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    name: "Báo Cáo & Thống kê",
    subItems: [
      { name: "Báo cáo tháng", path: "/reports", pro: false, roles: ["ADMIN", "MANAGER"] },
      // { name: "Line Chart", path: "/line-chart", pro: false },
      // { name: "Bar Chart", path: "/bar-chart", pro: false },
    ],
  },
  // {
  //   icon: <BoxCubeIcon />,
  //   name: "Hồ sơ & Chi Nhánh",
  //   subItems: [
  //     { name: "Alerts", path: "/alerts", pro: false },
  //     { name: "Avatar", path: "/avatars", pro: false },
  //     { name: "Badge", path: "/badge", pro: false },
  //     { name: "Buttons", path: "/buttons", pro: false },
  //     { name: "Images", path: "/images", pro: false },
  //     { name: "Videos", path: "/videos", pro: false },
  //   ],
  // },
  {
    icon: <PlugInIcon />,
    name: "Quản lý nhân sự",
    subItems: [
      { name: "Danh sách nhân viên", path: "/employees", pro: false },
      { name: "Đăng ký nhân viên", path: "/employees/register", pro: false },
      { name: "Tạo tài khoản người dùng", path: "/employees/account", pro: false },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user } = useAuth();
  const pathname = usePathname();
  const canAccess = (roles?: Role[]) => !roles || (!!user && roles.includes(user.role));

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${visibleSubmenu?.type === menuType && visibleSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={` ${visibleSubmenu?.type === menuType && visibleSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${visibleSubmenu?.type === menuType &&
                    visibleSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                    }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
              >
                <span
                  className={`${isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  visibleSubmenu?.type === menuType && visibleSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.filter((subItem) => canAccess(subItem.roles)).map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge `}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<OpenSubmenu | null>(null);
  const [closedSubmenuPath, setClosedSubmenuPath] = useState<string | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => path === pathname;
  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const activeSubmenu = [
    { type: "main" as const, items: navItems },
    { type: "others" as const, items: othersItems },
  ].reduce<OpenSubmenu | null>((matchedSubmenu, menu) => {
    if (matchedSubmenu) return matchedSubmenu;
    const index = menu.items.findIndex((nav) =>
      nav.subItems?.some((subItem) => canAccess(subItem.roles) && isActive(subItem.path))
    );
    return index >= 0 ? { type: menu.type, index } : null;
  }, null);
  const visibleSubmenu = closedSubmenuPath === pathname
    ? null
    : openSubmenu ?? activeSubmenu;

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    if (visibleSubmenu?.type === menuType && visibleSubmenu.index === index) {
      if (activeSubmenu?.type === menuType && activeSubmenu.index === index) {
        setClosedSubmenuPath(pathname);
      }
      setOpenSubmenu(null);
      return;
    }

    setClosedSubmenuPath(null);
    setOpenSubmenu(() => {
      if (openSubmenu?.type === menuType && openSubmenu.index === index) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-6 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-2xl shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/20">
                🥢
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 text-lg leading-none tracking-tight">
                    Bún Chú Béo
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    Món Ngon Hà Thành
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-2xl shadow-lg shadow-amber-500/25">
              🥢
            </div>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Khác"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;