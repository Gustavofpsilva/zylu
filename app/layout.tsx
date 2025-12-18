// app/layout.tsx
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Marcaí – Sua agenda online em um link",
  description: "Agende serviços com facilidade. Sem mensagens, sem confusão. Para profissionais autônomos.",
  // Adicione openGraph, icons, etc. se quiser
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}