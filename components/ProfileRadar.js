"use client";

const size = 420;
const center = size / 2;
const radius = 132;

function point(angle, distance) {
  return [
    center + Math.cos(angle) * distance,
    center + Math.sin(angle) * distance,
  ];
}

function polygonPoints(count, scale = 1) {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    return point(angle, radius * scale).join(",");
  }).join(" ");
}

const coreOrder = ["analys", "teknik", "manniskor", "kreativitet", "affar", "samhalle", "natur", "halsa", "praktik", "struktur"];

export default function ProfileRadar({ items = [] }) {
  const values = coreOrder.map((key) => items.find((item) => item.key === key)).filter(Boolean);
  if (!values.length) return null;

  const dataPoints = values.map((item, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
    return point(angle, radius * Math.max(0.08, item.value)).join(",");
  }).join(" ");

  return (
    <div className="radarCard">
      <svg className="profileRadar" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Radarprofil över dina tio huvuddimensioner">
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon key={scale} points={polygonPoints(values.length, scale)} className="radarGrid" />
        ))}
        {values.map((_, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
          const [x, y] = point(angle, radius);
          return <line key={index} x1={center} y1={center} x2={x} y2={y} className="radarAxis" />;
        })}
        <polygon points={dataPoints} className="radarData" />
        {values.map((item, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
          const [dotX, dotY] = point(angle, radius * Math.max(0.08, item.value));
          const [labelX, labelY] = point(angle, radius + 48);
          const anchor = Math.cos(angle) > 0.25 ? "start" : Math.cos(angle) < -0.25 ? "end" : "middle";
          return (
            <g key={item.key}>
              <circle cx={dotX} cy={dotY} r="4" className="radarDot" />
              <text x={labelX} y={labelY - 3} textAnchor={anchor} className="radarLabel">{item.short}</text>
              <text x={labelX} y={labelY + 14} textAnchor={anchor} className="radarValue">{Math.round(item.value * 100)}%</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
