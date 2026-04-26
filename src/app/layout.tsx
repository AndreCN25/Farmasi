import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Farmasi - Belleza y Cuidado Personal",
  description: "Descubre los mejores productos de belleza en Farmasi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
