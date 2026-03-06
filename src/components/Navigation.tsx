import { PlusOutlined } from "@ant-design/icons";
import { Breadcrumb, Button, Layout, Menu, Space, Typography, theme, Image, Tag } from "antd";
import { useLocation } from "react-router-dom";
const { Header } = Layout;

import { useAuth } from "../hooks/useAuthProvider";
import { useCanAudit } from "../hooks/useUserPrivileges";
import { useNavigate } from "react-router-dom";

const defaultNavigation = [
  {
    key: "/home",
    label: "Home",
  },
  {
    key: "/deadtrees",
    label: "Satellite Map",
  },
  {
    key: "/dataset",
    label: "Drone Archive",
  },
  {
    key: "/about",
    label: "About",
  },
  {
    key: "/profile",
    label: "My Account",
  },
];

// Additional navigation item for users who can audit
const auditNavigation = {
  key: "/dataset-audit",
  label: "Audit Datasets",
};

export default function Navigation() {
  const { user, session, signOut, isLoading } = useAuth();
  const { canAudit } = useCanAudit();
  const nav = useNavigate();
  const location = useLocation();

  // Get the base path for matching navigation
  const currentPath = "/" + location.pathname.split("/")[1];

  // Check if currently in audit detail page
  const isInAuditDetail = location.pathname.match(/^\/dataset-audit\/\d+$/);

  // Add audit navigation if user has audit privileges
  const navigation = [...defaultNavigation];
  if (canAudit) {
    // Insert the audit link before the Account link
    navigation.splice(navigation.length - 1, 0, auditNavigation);
  }

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const handleSignOut = async () => {
    if (isInAuditDetail) {
      // Dispatch custom event for audit page to handle
      window.dispatchEvent(
        new CustomEvent("audit-navigation-attempt", {
          detail: { to: "/sign-in", action: "signout" },
        }),
      );
      return;
    }

    await signOut();
    nav("/sign-in");
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isInAuditDetail) {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent("audit-navigation-attempt", {
          detail: { to: "/" },
        }),
      );
    } else {
      nav("/");
    }
  };

  const handleMenuClick = (e: any) => {
    if (isInAuditDetail) {
      // When in audit detail, dispatch custom event instead of navigating
      window.dispatchEvent(
        new CustomEvent("audit-navigation-attempt", {
          detail: { to: e.key === "/home" ? "/" : e.key },
        }),
      );
    } else {
      // Normal navigation - convert menu key to actual path
      const path = e.key === "/home" ? "/" : e.key;
      nav(path);
    }
  };

  return (
    <div className="hidden md:flex justify-center w-full fixed top-0 z-50 pt-4 px-4 pb-2 pointer-events-none">
      <Header
        className="w-full pointer-events-auto"
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.90)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "1rem",
          border: "1px solid rgba(229, 231, 235, 0.8)",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
          padding: "0 24px",
          height: "64px",
          lineHeight: "64px"
        }}
      >
        <div className="flex flex-1 items-center justify-center md:justify-start">
          <img
            src="/assets/logo.png"
            alt="deadtrees.earth"
            onClick={handleLogoClick}
            className="mr-3 h-10 cursor-pointer hover:opacity-80 transition-opacity"
          />
        </div>
        <div style={{ flex: 1, backgroundColor: "transparent" }}>
          <Menu
            mode="horizontal"
            selectedKeys={[currentPath === "/" ? "/home" : currentPath]}
            items={navigation}
            onClick={handleMenuClick}
            style={{
              justifyContent: "end",
              minWidth: 0,
              borderBottom: "none",
              backgroundColor: "transparent",
              width: "100%",
            }}
          />
        </div>
        <Button
          className="ml-8 rounded-full shadow-sm px-6 font-medium"
          type={session ? "default" : "primary"}
          onClick={
            session
              ? handleSignOut
              : () => {
                  if (isInAuditDetail) {
                    window.dispatchEvent(
                      new CustomEvent("audit-navigation-attempt", {
                        detail: { to: "/sign-in" },
                      }),
                    );
                  } else {
                    nav("/sign-in");
                  }
                }
          }
        >
          {session ? "Sign Out" : "Sign In"}
        </Button>
      </Header>
    </div>
  );
}
