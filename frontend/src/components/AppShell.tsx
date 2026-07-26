"use client";
import {
  AppBar,
  Box,
  Container,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  ["Dashboard", "/"],
  ["Lead Search", "/lead-searches"],
  ["Intelligence", "/intelligence"],
  ["Businesses", "/businesses"],
  ["Call Preparation", "/call-preparation"],
  ["Call History", "/call-history"],
  ["Tasks", "/tasks"],
  ["Settings", "/settings"],
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: 1300 }}>
        <Toolbar>
          <Typography variant="h6">AI Business Assistant</Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{ width: 220, ["& .MuiDrawer-paper"]: { width: 220, mt: 8 } }}
      >
        <List>
          {links.map(([label, href]) => (
            <ListItemButton
              component={Link}
              href={href}
              selected={path === href}
              key={href}
            >
              <ListItemText primary={label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Container
        component="main"
        maxWidth="xl"
        sx={{ ml: "220px", pt: 12, pb: 6 }}
      >
        {children}
      </Container>
    </Box>
  );
}
