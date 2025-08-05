import "../styles/main.css";
import "../styles/phone.css";
import "../styles/atom-one-dark.min.css";

import type { AppProps } from "next/app";
import MetaLinks from "../components/common/MetaLinks";
import Footer from "../components/common/Footer";
import ImagePreloader from "../components/utils/ImagePreloader";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import { useEffect, useState } from "react";
import LauncherNavbar from "./launcher/components/Navbar";
import LauncherLobby from "./launcher/components/Lobby";
import useAuth from "../hooks/useAuth";
import { AuthProvider } from "../hooks/AuthContext";
import { UserCacheProvider } from "../hooks/UserCacheContext";
import { ImageCacheProvider } from "../hooks/ImageCacheContext";
import useIsMobile from "../hooks/useIsMobile";
import NavBarDesktop from "../components/common/NavBarDesktop";
import NavBarMobile from "../components/common/NavBarMobile";
import Login from "./login";
import { LobbyProvider } from "../hooks/LobbyContext";

// --- Style constants ---
const launcherMainStyle: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  top: "7rem",
  bottom: 0,
  overflowX: "hidden",
  overflowY: "auto",
};

const launcherTitlebarStyle: React.CSSProperties = {
  display: "flex",
  padding: "0rem 1rem 0rem 1rem",
  borderBottom: "1px solid #ddd",
  justifyContent: "start",
  position: "fixed",
  width: "100%",
  backgroundColor: "#222",
};
const launcherIconStyle: React.CSSProperties = {
  width: "24px",
  height: "24px",
};
const launcherTitleStyle: React.CSSProperties = {
  position: "relative",
  top: "2px",
  right: "10px",
};

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#333",
    },
    background: {
      default: "#18181b",
      paper: "#23232a",
    },
    text: {
      primary: "#ffffff",
      secondary: "#888888",
    },
    warning: {
      main: "#ffd700", // var(--gold-color)
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: "none",
        },
      },
    },
  },
});

function AppContent({ Component, pageProps }: AppProps) {
  const [isLauncher, setIsLauncher] = useState(false);
  const { user } = useAuth();
  const [mainStyle, setMainStyle] = useState<React.CSSProperties>({});

  // Set main style based on whether it's a launcher or not
  useEffect(() => {
    setMainStyle(
      window.location.href.includes("/oauth2/auth")
        ? {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "0",
            margin: "auto",
            height: "calc(100vh - 30px)",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            position: "fixed",
          }
        : {}
    );
  }, []);

  // Determine launcher mode synchronously to avoid hydration errors
  const isLauncherPath =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/launcher");
  const isFromLauncher =
    typeof window !== "undefined" &&
    window.location.search.includes("from=launcher");
  useEffect(() => {
    // Set app height for CSS variable
    const setAppHeight = () => {
      document.documentElement.style.setProperty(
        "--app-height",
        `${window.innerHeight}px`
      );
    };
    setAppHeight();
    window.addEventListener("resize", setAppHeight);

    return () => {
      window.removeEventListener("resize", setAppHeight);
    };
  }, []);

  useEffect(() => {
    setIsLauncher(isLauncherPath || isFromLauncher);
  }, [isLauncherPath, isFromLauncher]);

  // --- Background image component ---
  const BackgroundImage = () => (
    <div
      style={{
        position: "fixed",
        zIndex: -1,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        background:
          "linear-gradient(to bottom, rgba(24,24,27,0.85) 0%, rgba(24,24,27,0.7) 60%, rgba(24,24,27,1) 100%)",
        overflow: "hidden",
        objectFit: "cover",
      }}
      aria-hidden="true"
    >
      <img
        src="/assets/backgrounds/raiden-crow.webp"
        alt="background"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          opacity: 0.32,
          filter: "blur(0.5px)",
          transition: "opacity 0.8s",
          maxWidth: "100%",
        }}
      />
    </div>
  );

  // --- Layouts ---
  const LauncherLayout = () => (
    <>
      <BackgroundImage />
      <MetaLinks metaLinksTitle={"Croissant Launcher"} />

      {/* Précharger des images importantes */}
      <ImagePreloader
        images={[
          "/assets/backgrounds/raiden-crow.webp"
        ]}
        priority={true}
      />
      <nav className="titlebar" style={launcherTitlebarStyle}>
        <img
          src="/assets/icons/favicon-32x32.png"
          alt="Icon"
          style={launcherIconStyle}
        />
        <span className="navbar-title" style={launcherTitleStyle}>
          Croissant Launcher
        </span>
      </nav>
      <LauncherNavbar />
      <main style={launcherMainStyle} className="launcher">
        <Component {...pageProps} />
      </main>
      <LauncherLobby />
    </>
  );

  const LauncherLogin = () => (
    <>
      {/* <BackgroundImage /> */}
      <MetaLinks metaLinksTitle={pageProps?.title} from="app" />
      <Login />
    </>
  );

  const WebsiteLayout = () => {
    const isMobile = useIsMobile();

    return (
      <div>
        <BackgroundImage />
        <MetaLinks metaLinksTitle={pageProps?.title} />
        {(!pageProps?.isOauth2Auth && !pageProps?.isLauncher) && (
          isMobile ? <NavBarMobile /> : <NavBarDesktop />
        )}
        <main style={{ ...mainStyle, padding: isMobile ? "0px" : undefined }}>
          <Component {...pageProps} />
        </main>
        {(!pageProps?.isOauth2Auth && !pageProps?.isLauncher) && <Footer />}
      </div>
    );
  };

  if (isLauncher) {
    return user ? <LauncherLayout /> : <LauncherLogin />;
  }
  return <WebsiteLayout />;
}

export default function App(props: AppProps) {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ImageCacheProvider>
        <UserCacheProvider>
          <AuthProvider>
            <LobbyProvider>
              <AppContent {...props} />
            </LobbyProvider>
          </AuthProvider>
        </UserCacheProvider>
      </ImageCacheProvider>
    </ThemeProvider>
  );
}
