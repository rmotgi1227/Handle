import type { ReactNode } from "react";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${nunito.variable}`} style={{ fontFamily: "var(--font-nunito), sans-serif" }}>
      {children}
    </div>
  );
}
