import React from "react";
import Link from "next/link";
import useIsMobile from "../hooks/useIsMobile";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

function NotFoundDesktop() {
  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Oops! The page you are looking for does not exist.
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          It seems that the page you were trying to reach is either unavailable or does not exist.
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Please check the URL for any mistakes or return to the homepage to continue exploring our services.
        </Typography>
        <Typography variant="h6" sx={{ mb: 1 }}>
          What can you do?
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Try the following options:
        </Typography>
        <Stack direction="column" spacing={2}>
          <Link href="/" passHref>
            <Button variant="contained" color="primary" fullWidth>
              Return to Home
            </Button>
          </Link>
        </Stack>
      </Paper>
    </Container>
  );
}

function NotFoundMobile() {
  return (
    <Container maxWidth="xs" sx={{ mt: 4 }}>
      <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="h6" align="center" gutterBottom>
          Oops! Page not found.
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          The page you tried to reach does not exist or is unavailable.
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Please check the URL or use one of the options below.
        </Typography>
        <Stack direction="column" spacing={1}>
          <Link href="/" passHref>
            <Button variant="contained" color="primary" fullWidth>
              Return to Home
            </Button>
          </Link>
          <Link href="/contact" passHref>
            <Button variant="outlined" color="primary" fullWidth>
              Contact Support
            </Button>
          </Link>
          <Link href="/api-docs" passHref>
            <Button variant="text" color="primary" fullWidth>
              API Documentation
            </Button>
          </Link>
        </Stack>
      </Paper>
    </Container>
  );
}

export default function NotFoundPage() {
  const isMobile = useIsMobile();
  return isMobile ? <NotFoundMobile /> : <NotFoundDesktop />;
}
