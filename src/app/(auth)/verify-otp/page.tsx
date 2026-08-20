import type { Metadata } from "next";
import { VerifyOtpForm } from "../AuthForms";

export const metadata: Metadata = {
  title: "Verify code",
  robots: { index: false, follow: false },
};

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  return (
    <VerifyOtpForm
      to={one("to") ?? ""}
      isReset={sp.reset === "1"}
      name={one("name")}
      email={one("email")}
      next={one("next")}
    />
  );
}
