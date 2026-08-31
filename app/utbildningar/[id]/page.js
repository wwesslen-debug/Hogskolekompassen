import { redirect } from "next/navigation";

export const metadata = {
  title: "Utbildningar",
  robots: {
    index: false,
    follow: true,
  },
};

export default function LegacyProgramRedirect() {
  redirect("/utbildningar");
}
