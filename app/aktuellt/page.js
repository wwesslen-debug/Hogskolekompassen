import { redirect } from "next/navigation";

export const metadata = {
  title: "Utbildningar",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function CurrentEducationRedirect({ searchParams }) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params || {})) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value != null) query.set(key, value);
  }

  redirect(`/utbildningar${query.size ? `?${query.toString()}` : ""}`);
}
