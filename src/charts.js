export const e = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const decimal = (n, d = 0) =>
  new Intl.NumberFormat("it-IT", { maximumFractionDigits: d }).format(
    Number(n) || 0,
  );
export const money = (n, currency = "EUR") =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
    useGrouping: "always",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
export function bars(
  data,
  key,
  { unit = "", color = "var(--accent)", height = 180 } = {},
) {
  const max = Math.max(...data.map((d) => Math.abs(d[key])), 1),
    w = 520,
    h = height,
    pad = 30,
    inner = w - pad * 2,
    bw = Math.min(34, (inner / data.length) * 0.64),
    bottom = h - 28,
    top = 18,
    area = bottom - top;
  return `<svg class="chart" role="img" aria-label="${e(data.map((d) => `${d.label}: ${decimal(d[key], 1)} ${unit}`).join("; "))}" viewBox="0 0 ${w} ${h}">${[0, 0.5, 1].map((p) => `<path class="chart-grid" d="M${pad} ${bottom - area * p}H${w - 8}"/><text class="chart-label" x="0" y="${bottom - area * p + 3}">${decimal(max * p, max < 2 ? 1 : 0)}</text>`).join("")}${data
    .map((d, i) => {
      const x = pad + (inner / data.length) * (i + 0.5),
        negative = d[key] < 0;
      return `<g class="chart-bar"><rect x="${x - bw / 2}" y="${bottom - (Math.abs(d[key]) / max) * area}" width="${bw}" height="${(Math.abs(d[key]) / max) * area}" rx="4" fill="${negative ? "var(--danger)" : color}"><title>${e(d.label)}: ${decimal(d[key], 1)} ${e(unit)}</title></rect>${data.length <= 8 || i % Math.ceil(data.length / 6) === 0 ? `<text class="chart-label" x="${x}" y="${h - 7}" text-anchor="middle">${e(d.label)}</text>` : ""}</g>`;
    })
    .join("")}</svg>`;
}
export function ring(value, total, label = "") {
  const percent = total ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  return `<div class="ring" style="--ring:${percent}%"><div><strong>${e(value)}<small>/${e(total)}</small></strong><span>${e(label)}</span></div></div>`;
}
export function donut(groups, format = decimal) {
  const total = groups.reduce((a, g) => a + g.value, 0);
  const colors = [
    "var(--accent)",
    "#3d8bfa",
    "#997cf7",
    "#efac55",
    "#ea7798",
    "#71b8bb",
  ];
  let start = 0;
  const stops = groups.map((g, i) => {
    let end = start + (total ? (g.value / total) * 100 : 0);
    const s = `${colors[i % colors.length]} ${start}% ${end}%`;
    start = end;
    return s;
  });
  return `<div class="donut-wrap"><div class="donut" style="background:${total ? `conic-gradient(${stops.join(",")})` : "var(--border)"}"><div><small>Total</small><strong>${e(format(total))}</strong></div></div><div class="legend">${groups.length ? groups.map((g, i) => `<div><i style="background:${colors[i % colors.length]}"></i><span>${e(g.label)}</span><b>${e(format(g.value))}</b></div>`).join("") : '<p class="muted">Aggiungi dati per vedere la distribuzione.</p>'}</div></div>`;
}
