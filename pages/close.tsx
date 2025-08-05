import React from "react";
import { Card, CardContent, Typography } from "@mui/material";

export default function ClosePage() {
  return (
    <div
      className="container"
      style={{
        padding: "20px",
        borderRadius: "8px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Card
        sx={{
          background: "var(--background-medium)",
          borderRadius: 3,
          boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
          border: "2px solid var(--border-color)",
          width: "100%",
          maxWidth: 480,
        }}
      >
        <CardContent>
          <Typography
            variant="h4"
            sx={{
              textAlign: "center",
              margin: "40px 0",
              color: "white",
              letterSpacing: "1px",
              fontWeight: 700,
            }}
          >
            You can close this page now
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
}
