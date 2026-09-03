"use client";

import { trackExternalClick } from "@/lib/analytics-client";

export default function TrackedExternalLink({
  href,
  children,
  className,
  properties = {},
  target = "_blank",
  rel = "noreferrer",
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      target={target}
      rel={target === "_blank" ? rel : undefined}
      className={className}
      onClick={() => trackExternalClick(href, properties)}
    >
      {children}
    </a>
  );
}
