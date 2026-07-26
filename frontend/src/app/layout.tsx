import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";
export const metadata: Metadata = {
  title: "AI Business Assistant",
  description: "Local-first business development workspace",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
