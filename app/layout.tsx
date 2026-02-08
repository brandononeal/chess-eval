import "./globals.css";

export const metadata = {
  title: "Chess Eval",
  description: "Real-time chess evaluation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
