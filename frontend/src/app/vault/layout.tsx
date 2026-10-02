import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experience Vault",
  description:
    "Your trusted career background used by Naomatch when matching jobs and generating tailored resumes.",
};

export default function VaultLayout({ children }: LayoutProps<"/vault">) {
  return children;
}
