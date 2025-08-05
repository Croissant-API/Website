import React from "react";
import {
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
} from "@mui/material";

export default function ContactPage() {
  return (
    <div className="container">
      <Card
        sx={{
          maxWidth: 480,
          margin: "0 auto",
          background: "var(--background-medium)",
          borderRadius: 3,
          boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
          border: "2px solid var(--border-color)",
        }}
      >
        <CardContent>
          <Typography
            variant="h5"
            sx={{ mb: 2, fontWeight: 700, color: "#fff" }}
          >
            Contact Us
          </Typography>
          <form
            action="/submit-contact"
            method="POST"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <TextField
              label="Name"
              name="name"
              id="name"
              required
              variant="outlined"
              fullWidth
              sx={{ background: "var(--background-light)" }}
            />
            <TextField
              label="Email"
              name="email"
              id="email"
              required
              type="email"
              variant="outlined"
              fullWidth
              sx={{ background: "var(--background-light)" }}
            />
            <TextField
              label="Message"
              name="message"
              id="message"
              required
              multiline
              rows={4}
              variant="outlined"
              fullWidth
              sx={{ background: "var(--background-light)" }}
            />
            <Button
              type="submit"
              variant="contained"
              color="success"
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                background: "#3cbf7f",
              }}
            >
              Send Message
            </Button>
          </form>
        </CardContent>
      </Card>
      <div
        className="container"
        style={{ marginTop: 20, fontStyle: "italic" }}
      >
        For the moment, contacting us is useless. Later, you will be able to
        contact us through the web interface.
      </div>
    </div>
  );
}
