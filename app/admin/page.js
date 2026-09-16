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
const dayMs = 24 * 60 * 60 * 1000;

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

const quizModeLabels = {
  quick: "Snabbkompassen",
  full: "Djupkompassen",
};

function toNumber(value) {
  return Number(value || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("sv-SE").format(toNumber(value));
}

function formatPercent(part, total, decimals = 0) {
  const denominator = toNumber(total);
  if (!denominator) return "0%";
  return `${new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format((toNumber(part) / denominator) * 100)}%`;
}

function percentNumber(part, total) {
  const denominator = toNumber(total);
  return denominator ? Math.round((toNumber(part) / denominator) * 100) : 0;
}

function formatSignedPercent(current, previous) {
  const now = toNumber(current);
  const before = toNumber(previous);
  if (!before) return now ? "+100%" : "0%";
  const change = Math.round(((now - before) / before) * 100);
  return `${change > 0 ? "+" : ""}${change}%`;
}

function formatSignedPoints(current, previous) {
  const change = Math.round(toNumber(current) - toNumber(previous));
  return `${change > 0 ? "+" : ""}${change} pp`;
}

function trendTone(current, previous) {
  const now = toNumber(current);
  const before = toNumber(previous);
  if (now > before) return "positive";
  if (now < before) return "negative";
  return "neutral";
}

function formatDateTime(value) {
  if (!value) return "Ingen data ännu";
  return new Date(value).toLocaleString("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
  });
}

function formatRangeLabel(days) {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * dayMs);
  return `${formatDateKey(start)} - ${formatDateKey(end)}`;
}

function clampDays(value) {
  const input = Array.isArray(value) ? value[0] : value;
  const days = Number(input || 7);
  return rangeOptions.includes(days) ? days : 7;
}

function getCompletionRate(totals) {
  return totals.starts ? Math.round((totals.completions / totals.starts) * 100) : 0;
}

function buildDailySeries(rows, days) {
  const visibleDays = Math.min(days, 14);
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const today = new Date();

  return Array.from({ length: visibleDays }, (_, index) => {
    const date = new Date(today.getTime() - (visibleDays - index - 1) * dayMs);
    const day = formatDateKey(date);
    const row = byDay.get(day) || {};

    return {
      day,
      label: formatShortDate(day),
      pageViews: toNumber(row.pageViews),
      starts: toNumber(row.starts),
    };
  });
}

function buildFunnelSteps(totals) {
  const firstStep = totals.visits || totals.pageViews;
  const base = firstStep || totals.starts || totals.completions || totals.resultViews || totals.applicationClicks || 0;

  return [
    { key: "home", label: "Startsida", value: firstStep, tone: "blue" },
    { key: "started", label: "Startat quiz", value: totals.starts, tone: "blue" },
    { key: "completed", label: "Slutfört quiz", value: totals.completions, tone: "violet" },
    { key: "result", label: "Resultatsida", value: totals.resultViews, tone: "teal" },
    { key: "application", label: "Externt ansökningsklick", value: totals.applicationClicks, tone: "green" },
  ].map((step) => ({
    ...step,
    percent: percentNumber(step.value, base),
  }));
}

function buildDropoffs(totals) {
  const firstStep = totals.visits || totals.pageViews;
  const rows = [
    {
      stage: "Före start",
      count: Math.max(firstStep - totals.starts, 0),
      denominator: firstStep,
    },
    {
      stage: "I quizet",
      count: Math.max(totals.starts - totals.completions, 0),
      denominator: totals.starts,
    },
    {
      stage: "Mellan quiz och resultat",
      count: Math.max(totals.completions - totals.resultViews, 0),
      denominator: totals.completions,
    },
    {
      stage: "Efter resultat",
      count: Math.max(totals.resultViews - totals.applicationClicks, 0),
      denominator: totals.resultViews,
    },
  ];

  return rows.map((row) => ({
    ...row,
    share: formatPercent(row.count, row.denominator),
    shareValue: percentNumber(row.count, row.denominator),
  }));
}

function buildInsights(totals, completionRate, dropoffs) {
  const largestDropoff = [...dropoffs].sort((a, b) => b.count - a.count)[0];
  const insights = [];

  if (largestDropoff?.count) {
    insights.push({
      tone: "rose",
      icon: "▮",
      title: `Största tappet sker: ${largestDropoff.stage.toLowerCase()}`,
      text: `${formatNumber(largestDropoff.count)} användare lämnar här (${largestDropoff.share}). Prioritera nästa förbättring i det steget.`,
    });
  } else {
    insights.push({
      tone: "green",
      icon: "✓",
      title: "Inget tydligt tapp i perioden",
      text: "De spårade stegen har för lite bortfall för att peka ut en flaskhals.",
    });
  }

  insights.push({
    tone: completionRate >= 30 ? "green" : "amber",
    icon: completionRate >= 30 ? "✓" : "!",
    title: `Completion rate är ${completionRate}%`,
    text: totals.starts
      ? `${formatNumber(totals.completions)} av ${formatNumber(totals.starts)} startade användare slutförde quizet.`
      : "Inga quizstarter har registrerats i perioden.",
  });

  insights.push({
    tone: "blue",
    icon: "↗",
    title: `${formatNumber(totals.applicationClicks)} klick vidare till extern ansökan`,
    text: totals.resultViews
      ? `${formatPercent(totals.applicationClicks, totals.resultViews)} av resultatsidevisningarna ledde vidare till en ansökningssida.`
      : "Inga resultatsidor har registrerats i perioden.",
  });

  return insights;
}

function AdminLogin({ error }) {
  const missingConfig = !isAdminConfigured();
  return (
    <main className="adminPage adminLoginPage">
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

function DateRangePicker({ days }) {
  return (
    <nav className="adminDatePicker" aria-label="Tidsperiod">
      <span className="adminDateIcon" aria-hidden="true">▣</span>
      <div className="adminDateCopy">
        <strong>Senaste {days} dagarna</strong>
        <span>{formatRangeLabel(days)}</span>
      </div>
      <div className="adminRangeNav">
        {rangeOptions.map((option) => (
          <a className={option === days ? "active" : ""} href={`/admin?days=${option}`} key={option}>
            {option}
          </a>
        ))}
      </div>
    </nav>
  );
}

function MetricCard({ label, value, icon, trend, tone = "Blue" }) {
  return (
    <article className={`adminMetricCard adminMetric${tone}`}>
      <span className="adminMetricIcon" aria-hidden="true">{icon}</span>
      <div>
        <span className="adminMetricLabel">{label}</span>
        <strong>{value}</strong>
        <small className={`adminTrend adminTrend${trend.tone}`}>
          <span aria-hidden="true">{trend.tone === "negative" ? "↘" : "↗"}</span>
          {trend.value}
        </small>
        <em>jämfört med föregående period</em>
      </div>
    </article>
  );
}

function SectionHeading({ title, children, action }) {
  return (
    <div className="adminSectionHeading">
      <div>
        <h2>{title}</h2>
        {children ? <p>{children}</p> : null}
      </div>
      {action}
    </div>
  );
}

function AdminTable({ title, description, emptyText, columns, rows, className = "" }) {
  return (
    <section className={`adminPanel adminTableBlock ${className}`}>
      <SectionHeading title={title}>{description}</SectionHeading>
      {rows.length ? (
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.key || row.stage || row.day || row.event || row.path || row.quizMode || index}>
                  {columns.map((column) => (
                    <td key={column.key} className={column.numeric ? "adminNumericCell" : undefined}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="adminEmpty">{emptyText}</p>}
    </section>
  );
}

function FunnelCard({ steps, totals }) {
  return (
    <section className="adminPanel adminFunnelPanel">
      <SectionHeading
        title="Konverteringstratt"
        action={(
          <span className="adminConversionBadge">
            Total konvertering: {formatPercent(totals.applicationClicks, totals.pageViews, 1)} ({formatNumber(totals.applicationClicks)} av {formatNumber(totals.pageViews)})
          </span>
        )}
      >
        Från första besök till extern ansökan. Siffrorna visar antal användare i varje steg.
      </SectionHeading>
      <div className="adminFunnel">
        {steps.map((step, index) => (
          <div className={`adminFunnelStep adminFunnel${step.tone}`} key={step.key}>
            <span>{step.label}</span>
            <strong>{formatNumber(step.value)}</strong>
            <small>{index === 0 ? "100%" : `${step.percent}%`}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChartCard({ dailySeries, days }) {
  const maxValue = Math.max(1, ...dailySeries.flatMap((row) => [row.pageViews, row.starts]));

  return (
    <section className="adminPanel adminChartPanel">
      <SectionHeading title={days <= 14 ? `Senaste ${days} dagar` : "Senaste 14 dagar"}>
        Sidvisningar och startade quiz per dag.
      </SectionHeading>
      <div className="adminChartLegend">
        <span><i className="adminLegendViews" /> Sidvisningar</span>
        <span><i className="adminLegendStarts" /> Startade quiz</span>
      </div>
      <div className="adminChartPlot" style={{ "--chart-columns": dailySeries.length }}>
        {dailySeries.map((row) => {
          const viewsHeight = row.pageViews ? Math.max(6, Math.round((row.pageViews / maxValue) * 100)) : 0;
          const startsHeight = row.starts ? Math.max(6, Math.round((row.starts / maxValue) * 100)) : 0;

          return (
            <div className="adminChartGroup" key={row.day}>
              <div className="adminChartBars">
                <span
                  className="adminChartBar adminChartBarViews"
                  style={{ "--bar-height": `${viewsHeight}%` }}
                  title={`${formatNumber(row.pageViews)} sidvisningar`}
                />
                <span
                  className="adminChartBar adminChartBarStarts"
                  style={{ "--bar-height": `${startsHeight}%` }}
                  title={`${formatNumber(row.starts)} startade quiz`}
                />
              </div>
              <small>{row.label}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InsightsCard({ insights }) {
  return (
    <section className="adminPanel adminInsightsPanel">
      <SectionHeading title="Insikter">
        Automatiska insikter baserat på vald period.
      </SectionHeading>
      <div className="adminInsightList">
        {insights.map((insight) => (
          <article className={`adminInsight adminInsight${insight.tone}`} key={insight.title}>
            <span aria-hidden="true">{insight.icon}</span>
            <div>
              <strong>{insight.title}</strong>
              <p>{insight.text}</p>
            </div>
          </article>
        ))}
      </div>
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
  const totals = overview.totals;
  const previousTotals = overview.previousTotals || {};
  const completionRate = getCompletionRate(totals);
  const previousCompletionRate = getCompletionRate(previousTotals);
  const funnelSteps = buildFunnelSteps(totals);
  const dropoffs = buildDropoffs(totals);
  const dailySeries = buildDailySeries(overview.daily, days);
  const insights = buildInsights(totals, completionRate, dropoffs);

  const metricCards = [
    {
      label: "Besök",
      value: formatNumber(totals.pageViews),
      icon: "◎",
      tone: "Blue",
      trend: { value: formatSignedPercent(totals.pageViews, previousTotals.pageViews), tone: trendTone(totals.pageViews, previousTotals.pageViews) },
    },
    {
      label: "Startade kompassen",
      value: formatNumber(totals.starts),
      icon: "▷",
      tone: "Green",
      trend: { value: formatSignedPercent(totals.starts, previousTotals.starts), tone: trendTone(totals.starts, previousTotals.starts) },
    },
    {
      label: "Slutförda",
      value: formatNumber(totals.completions),
      icon: "✓",
      tone: "Violet",
      trend: { value: formatSignedPercent(totals.completions, previousTotals.completions), tone: trendTone(totals.completions, previousTotals.completions) },
    },
    {
      label: "Completion rate",
      value: `${completionRate}%`,
      icon: "▮",
      tone: "Amber",
      trend: { value: formatSignedPoints(completionRate, previousCompletionRate), tone: trendTone(completionRate, previousCompletionRate) },
    },
    {
      label: "Ansökningsklick",
      value: formatNumber(totals.applicationClicks),
      icon: "↗",
      tone: "Rose",
      trend: { value: formatSignedPercent(totals.applicationClicks, previousTotals.applicationClicks), tone: trendTone(totals.applicationClicks, previousTotals.applicationClicks) },
    },
  ];

  return (
    <main className="adminPage">
      <section className="adminHero">
        <div>
          <h1>Analys och statistik</h1>
          <p>Följ hur Högskolekompassen används och hur besökare tar sig genom flödet.</p>
        </div>
        <DateRangePicker days={days} />
      </section>

      <section className="adminUtilityBar" aria-label="Adminverktyg">
        <AnalyticsExclusionControl />
        <div className="adminUtilityActions">
          <AnalyticsResetForm />
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="button buttonGhost buttonSmall">Logga ut</button>
          </form>
        </div>
      </section>

      {!overview.configured ? (
        <div className="adminNotice">Supabase är inte konfigurerat. Sätt <code>SUPABASE_DATABASE_URL</code>.</div>
      ) : null}
      {overview.error ? <div className="adminNotice">Kunde inte läsa analytics: {overview.error}</div> : null}
      {resetMessages[params?.reset] ? (
        <div className={params.reset === "ok" ? "adminNotice adminNoticeSuccess" : "adminNotice"}>
          {resetMessages[params.reset]}
        </div>
      ) : null}

      <section className="adminMetricGrid" aria-label="Nyckeltal">
        {metricCards.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <FunnelCard steps={funnelSteps} totals={totals} />

      <section className="adminDashboardGrid">
        <ChartCard dailySeries={dailySeries} days={days} />

        <AdminTable
          title="Var lämnar användare?"
          description="Antal användare som inte går vidare till nästa spårade steg."
          emptyText="Inget bortfall har registrerats i perioden."
          rows={dropoffs}
          columns={[
            { key: "stage", label: "Steg" },
            { key: "count", label: "Antal avhopp", numeric: true, render: (row) => formatNumber(row.count) },
            { key: "share", label: "Andel", numeric: true },
          ]}
        />

        <AdminTable
          title="Händelser"
          description="Totalt antal händelser under perioden."
          emptyText="Inga events i perioden."
          rows={overview.events}
          columns={[
            { key: "event", label: "Händelse", render: (row) => eventLabels[row.event] || row.event },
            { key: "count", label: "Antal", numeric: true, render: (row) => formatNumber(row.count) },
          ]}
        />
      </section>

      <section className="adminLowerGrid">
        <AdminTable
          title="Populära sidor"
          description="De sidor som fått flest sidvisningar."
          emptyText="Inga sidvisningar i perioden."
          rows={overview.paths}
          columns={[
            { key: "path", label: "Sida", render: (row) => <span className="adminPathCell">{row.path}</span> },
            { key: "count", label: "Sidvisningar", numeric: true, render: (row) => formatNumber(row.count) },
          ]}
        />

        <InsightsCard insights={insights} />
      </section>

      <AdminTable
        title="Quiztyp"
        description="Start och slutförande per kompassläge."
        emptyText="Inga quizstarter med quiztyp har samlats in i perioden ännu."
        className="adminQuizModeBlock"
        rows={overview.quizModes}
        columns={[
          { key: "quizMode", label: "Kompass", render: (row) => quizModeLabels[row.quizMode] || row.quizMode },
          { key: "starts", label: "Påbörjade", numeric: true, render: (row) => formatNumber(row.starts) },
          { key: "completions", label: "Slutförda", numeric: true, render: (row) => formatNumber(row.completions) },
          { key: "completionRate", label: "Completion", numeric: true, render: (row) => formatPercent(row.completions, row.starts) },
        ]}
      />

      <p className="adminMeta">Senast uppdaterad: {formatDateTime(overview.lastUpdated)}</p>
    </main>
  );
}
