import type { Metadata } from "next";
import { AgeGroupsView } from "./AgeGroupsView";

export const metadata: Metadata = { title: "Age groups" };

export default function AgeGroupsPage() {
  return <AgeGroupsView />;
}
