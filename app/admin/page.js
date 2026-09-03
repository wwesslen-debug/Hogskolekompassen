import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { getSupabaseAnalyticsOverview } from "@/lib/supabase-db";
import AnalyticsExclusionControl from "@/components/AnalyticsExclusionControl";
import AnalyticsResetForm from "@/components/AnalyticsResetForm";

export const metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

const rangeOptions = [7, 30, 90];

const metricLabels = [
  ["pageViews", "Sidvisningar"],
  ["visits", "Startsidebesök"],
  ["starts", "Startade kompasser"],
  ["completions", "Slutförda kompasser"],
  ["resultViews", "Resultatsidor"],
  ["applicationClicks", "Klick vidare"],
  ["compareEvents", "Jämförelsehändelser"],
  ["saveEvents", "Min väg-händelser"],
];

const eventLabels = {
  page_view: "Sidvisning",
  visit: "Startsida",
  quiz_started: "Quiz startat",
  quiz_completed: "Quiz slutfört",
  start_compass: "Startad kompass",
  compass_completed: "Slutförd kompass",
  view_results: "Resultatsida",
  compare_used: "Jämförelse använd",
  compare_add: "Lagd i jämförelse",
  compare_remove: "Borttagen från jämförelse",
  compare_limit_reached: "Jämförelsegräns nådd",
  compare_view: "Jämförelsesida",
  saved_live_program: "Sparad liveutbildning",
  save_program: "Sparad i Min väg",
  unsave_program: "Borttagen från Min väg",
  saved_list_view: "Min väg-sida",
  external_application_click: "Externt ansökningsklick",
  application_click: "Klick vidare",
};

const resetMessages = {
  ok: "All analytics-statistik är nollställd.",
  "missing-config": "Statistiken kunde inte nollställas eftersom Supabase inte är konfigurerat.",
  error: "Statistiken kunde inte nollställas. Försök igen eller kontrollera Supabase-anslutningen.",
};

function formatNumber(value) {
  return new Intl.NumberFormat("sv-SE").format(Number(value || 0));
}

function formatMetricValue(value) {
  return typeof value === "string" ? value : formatNumber(value);
}

function formatDate(value) {
  if (!value) return "Ingen data ännu";
  return new Date(value).toLocaleString("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function clampDays(value) {
  const days = Number(value || 30);
  return rangeOptions.includes(days) ? days : 30;
}

function AdminLogin({ error }) {
  const missingConfig = !isAdminConfigured();
  return (
    <main className="adminPage">
      <section className="adminLogin">
        <span className="eyebrow">Admin</span>
        <h1>Logga in för statistik</h1>
        <p>
          Adminsidan visar aggregerad statistik från Supabase. Den sparar inte IP-adresser, råa quizsvar eller fulla
          resultat.
        </p>
        {missingConfig ? (
          <div className="adminNotice">Sätt variabeln <code>ADMIN_TOKEN</code> i Railway innan adminsidan kan användas.</div>
        ) : null}
        {error === "invalid" ? <div className="formError">Fel adminnyckel.</div> : null}
        <form action="/api/admin/login" method="post" className="adminLoginForm">
          <label>
            <span>Adminnyckel</span>
            <input name="token" type="password" autoComplete="current-password" disabled={missingConfig} />
          </label>
          <button type="submit" className="button" disabled={missingConfig}>Logga in</button>
        </form>
      </section>
    </main>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="adminMetric">
      <span>{label}</span>
      <strong>{formatMetricValue(value)}</strong>
    </div>
  );
}

function AdminTable({ title, emptyText, columns, rows }) {
  return (
    <section className="adminTableBlock">
      <h2>{title}</h2>
      {rows.length ? (
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.key || row.day || row.event || row.path || index}>
                  {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="adminEmpty">{emptyText}</p>}
    </section>
  );
}

export default async function AdminPage({ searchParams }) {
  const params = await searchParams;
  const days = clampDays(params?.days);
  const cookieStore = await cookies();
  const isAuthed = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!isAuthed) return <AdminLogin error={params?.error} />;

  const overview = await getSupabaseAnalyticsOverview({ days });
  const completionRate = overview.totals.starts
    ? Math.round((overview.totals.completions / overview.totals.starts) * 100)
    : 0;

  return (
    <main className="adminPage">
      <section className="adminHeader">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Högskolekompassen statistik</h1>
          <p>
            Aggregat från Supabase för användare som godkänt analytics. Unika personer mäts inte här.
          </p>
        </div>
        <div className="adminActions">
          <AnalyticsExclusionControl />
          <AnalyticsResetForm />
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="button buttonGhost">Logga ut</button>
          </form>
        </div>
      </section>

      <nav className="adminRangeNav" aria-label="Tidsperiod">
        {rangeOptions.map((option) => (
          <a className={option === days ? "active" : ""} href={`/admin?days=${option}`} key={option}>{option} dagar</a>
        ))}
      </nav>

      {!overview.configured ? (
        <div className="adminNotice">Supabase är inte konfigurerat. Sätt <code>SUPABASE_DATABASE_URL</code>.</div>
      ) : null}
      {overview.error ? <div className="adminNotice">Kunde inte läsa analytics: {overview.error}</div> : null}
      {resetMessages[params?.reset] ? (
        <div className={params.reset === "ok" ? "adminNotice adminNoticeSuccess" : "adminNotice"}>
          {resetMessages[params.reset]}
        </div>
      ) : null}

      <section className="adminMetricGrid">
        <MetricCard label="Totala events" value={overview.totals.totalEvents} />
        {metricLabels.map(([key, label]) => <MetricCard key={key} label={label} value={overview.totals[key]} />)}
        <MetricCard label="Quiz completion" value={`${completionRate}%`} />
      </section>

      <p className="adminMeta">Senast uppdaterad: {formatDate(overview.lastUpdated)}</p>

      <div className="adminGrid">
        <AdminTable
          title="Senaste dagar"
          emptyText="Ingen statistik har samlats in ännu."
          rows={overview.daily}
          columns={[
            { key: "day", label: "Dag" },
            { key: "pageViews", label: "Sidvisningar", render: (row) => formatNumber(row.pageViews) },
            { key: "starts", label: "Startade", render: (row) => formatNumber(row.starts) },
            { key: "completions", label: "Slutförda", render: (row) => formatNumber(row.completions) },
            { key: "applicationClicks", label: "Klick vidare", render: (row) => formatNumber(row.applicationClicks) },
          ]}
        />

        <AdminTable
          title="Events"
          emptyText="Inga events i perioden."
          rows={overview.events}
          columns={[
            { key: "event", label: "Event", render: (row) => eventLabels[row.event] || row.event },
            { key: "count", label: "Antal", render: (row) => formatNumber(row.count) },
          ]}
        />

        <AdminTable
          title="Populära sidor"
          emptyText="Inga sidvisningar i perioden."
          rows={overview.paths}
          columns={[
            { key: "path", label: "Sida" },
            { key: "count", label: "Sidvisningar", render: (row) => formatNumber(row.count) },
          ]}
        />
      </div>
    </main>
  );
}
