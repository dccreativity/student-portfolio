import "./globals.css";

export const metadata = {
  title: "folio. — Student Portfolio",
  description: "Your journey. Your story.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-body">{children}</body>
    </html>
  );
}
