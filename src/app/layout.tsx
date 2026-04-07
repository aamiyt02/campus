import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "CampusExtract — Campus Event Intelligence Platform",
  description:
    "Automatically extract and organize campus events from your emails. Never miss a workshop, fest, placement drive, or deadline again.",
  keywords: ["campus events", "email extraction", "student tools", "event dashboard"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
