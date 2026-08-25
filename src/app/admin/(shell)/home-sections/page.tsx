import type { Metadata } from "next";
import { HomeSectionsView } from "./HomeSectionsView";

export const metadata: Metadata = { title: "Home sections" };

export default function HomeSectionsPage() {
  return <HomeSectionsView />;
}
