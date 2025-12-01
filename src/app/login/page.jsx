import LoginClient from "./LoginClient";

export default async function Page({ searchParams }) {
  const params = await searchParams;

  const nextPath =
    typeof params?.next === "string" && params.next.trim()
      ? decodeURIComponent(params.next)
      : "/admin/dashboard";

  return <LoginClient nextPath={nextPath} />;
}