import ResetPasswordClient from "./_client";

export const metadata = { title: "Nouveau mot de passe — K-Kouma" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordClient token={token ?? ""} />;
}
