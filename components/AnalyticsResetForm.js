"use client";

import { useState } from "react";

export default function AnalyticsResetForm() {
  const [submitting, setSubmitting] = useState(false);

  function confirmReset(event) {
    const confirmed = window.confirm("Nollställa all sparad analytics-statistik? Det här går inte att ångra.");
    if (!confirmed) {
      event.preventDefault();
      return;
    }
    setSubmitting(true);
  }

  return (
    <form action="/api/admin/analytics/reset" method="post" onSubmit={confirmReset}>
      <button type="submit" className="button buttonGhost buttonSmall dangerButton" disabled={submitting}>
        {submitting ? "Nollställer..." : "Nollställ statistik"}
      </button>
    </form>
  );
}
