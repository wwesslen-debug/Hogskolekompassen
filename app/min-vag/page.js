import MyPath from "@/components/MyPath";

export const metadata = {
  title: "Min väg",
  description: "Din personliga shortlist med sparade utbildningar.",
  robots: { index: false, follow: false },
};

export default function MyPathPage() {
  return <MyPath />;
}
