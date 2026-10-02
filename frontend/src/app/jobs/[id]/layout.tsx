import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tailor Resume",
  description:
    "Tailor a one-page resume from your Experience Vault for a specific job posting.",
};

export default function JobLayout({ children }: LayoutProps<"/jobs/[id]">) {
  return children;
}
