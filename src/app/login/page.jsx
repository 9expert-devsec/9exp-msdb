import LoginClient from "./LoginClient";

export default function Page({ searchParams }) {
  const nextPath =
    typeof searchParams?.next === "string" && searchParams.next.trim()
      ? decodeURIComponent(searchParams.next)
      : "/admin/dashboard";

  return <LoginClient nextPath={nextPath} />;
}
