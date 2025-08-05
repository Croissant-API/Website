import React from "react";
import CachedImage from "../components/utils/CachedImage";
import useIsMobile from "../hooks/useIsMobile";
import { Card, CardContent, Typography, Button, Stack } from "@mui/material";

function DownloadLauncherDesktop() {
  return (
    <div className="container" style={{ padding: "20px", maxWidth: 700, margin: "0 auto" }}>
      <Card
        sx={{
          background: "var(--background-medium)",
          borderRadius: 3,
          boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
          border: "2px solid var(--border-color)",
        }}
      >
        <CardContent>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, color: "#fff" }}>
            Download the Launcher
          </Typography>
          <Typography sx={{ mb: 2, color: "#ccc" }}>
            The Croissant launcher lets you manage your Croissant account and items, discover and launch games, and always stay updated with the latest features.
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Button
              variant="contained"
              color="success"
              href="https://github.com/croissant-API/Launcher/releases/"
              target="_blank"
              sx={{ fontWeight: 700, borderRadius: 2, background: "#3cbf7f" }}
            >
              Download for Windows
            </Button>
            <Button
              variant="contained"
              color="primary"
              href="https://play.google.com/store/apps/details?id=com.croissant.launcher"
              target="_blank"
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Download for Android
            </Button>
          </Stack>
          <Typography sx={{ mb: 2, color: "#ccc" }}>
            <b>Instructions:</b>
          </Typography>
          <ol style={{ color: "#ccc", marginLeft: 20 }}>
            <li>Click the button for your platform.</li>
            <li>For Windows: Download the <code>.exe</code> and run it.</li>
            <li>For Android: Download from Google Play.</li>
          </ol>
          <CachedImage
            src="/assets/launcher.png"
            alt="Croissant Launcher Screenshot"
            style={{ maxWidth: "100%", height: "auto", borderRadius: "8px", marginTop: 24 }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function DownloadLauncherMobile() {
  return (
    <div className="container" style={{ padding: "10px", maxWidth: 420, margin: "0 auto" }}>
      <Card
        sx={{
          background: "var(--background-medium)",
          borderRadius: 3,
          boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
          border: "2px solid var(--border-color)",
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: "#fff" }}>
            Download the Launcher
          </Typography>
          <Typography sx={{ mb: 2, color: "#ccc" }}>
            <b>Note:</b> The Croissant launcher is available for Windows and Android.
          </Typography>
          <Stack direction="column" spacing={2} sx={{ mb: 3 }}>
            <Button
              variant="contained"
              color="success"
              href="https://github.com/croissant-API/Launcher/releases/"
              target="_blank"
              sx={{ fontWeight: 700, borderRadius: 2, background: "#3cbf7f" }}
            >
              Windows (.exe)
            </Button>
            <Button
              variant="contained"
              color="primary"
              href="https://play.google.com/store/apps/details?id=com.croissant.launcher"
              target="_blank"
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Android (Google Play)
            </Button>
          </Stack>
          <Typography sx={{ mb: 2, color: "#ccc" }}>
            <b>Instructions:</b>
          </Typography>
          <ol style={{ color: "#ccc", marginLeft: 20 }}>
            <li>Tap the button for your platform.</li>
            <li>For Windows: Download and run the <code>.exe</code>.</li>
            <li>For Android: Download from Google Play.</li>
          </ol>
          <CachedImage
            src="/assets/launcher.png"
            alt="Croissant Launcher Screenshot"
            style={{ maxWidth: "100%", height: "auto", borderRadius: "8px", marginTop: 24 }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function DownloadLauncher() {
  const isMobile = useIsMobile();
  return isMobile ? <DownloadLauncherMobile /> : <DownloadLauncherDesktop />;
}
