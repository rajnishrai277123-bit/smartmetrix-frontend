
import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Download,
  Gauge,
  History,
  Loader2,
  RefreshCw,
  Scale,
  ShieldAlert,
  Trash2,
  Wifi,
  Zap,
} from "lucide-react";
import api from "../services/api";

type Reading = {
  weight: number;
  stable: boolean;
  source: string;
};

type ReadingRecord = {
  id: number;
  weight: number;
  referenceWeight: number;
  error: number;
  percentError: number | null;
  stable: boolean;
  source: string;
  time: string;
};

const fmt = (value: number, digits = 3) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

export default function VirtualWeighingMachine() {
  const [referenceWeight, setReferenceWeight] = useState("10");
  const [scaleInterval, setScaleInterval] = useState("0.01");
  const [reading, setReading] = useState<Reading | null>(null);
  const [history, setHistory] = useState<ReadingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const reference = Number(referenceWeight);
  const interval = Number(scaleInterval);

  const valid =
    referenceWeight.trim() !== "" &&
    scaleInterval.trim() !== "" &&
    Number.isFinite(reference) &&
    Number.isFinite(interval) &&
    reference >= 0 &&
    interval > 0;

  const latest = history[0] ?? null;

  const stats = useMemo(() => {
    if (!history.length) {
      return { average: null, min: null, max: null, range: null };
    }

    const values = history.map((item) => item.weight);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      min,
      max,
      range: max - min,
    };
  }, [history]);

  const readWeight = async () => {
    setError("");
    setNotice("");

    if (!valid) {
      setError(
        "Reference weight 0 ya usse zyada hona chahiye, aur scale interval zero se zyada."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<Reading>(
        `/hardware/read?referenceWeight=${encodeURIComponent(
          reference
        )}&scaleInterval=${encodeURIComponent(interval)}`
      );

      const data = response.data;

      if (
        !data ||
        typeof data.weight !== "number" ||
        !Number.isFinite(data.weight)
      ) {
        throw new Error("Backend returned an invalid weight reading.");
      }

      setReading(data);

      const measurementError = data.weight - reference;

      const record: ReadingRecord = {
        id: Date.now(),
        weight: data.weight,
        referenceWeight: reference,
        error: measurementError,
        percentError:
          reference === 0 ? null : (measurementError / reference) * 100,
        stable: Boolean(data.stable),
        source: data.source || "UNKNOWN",
        time: new Date().toLocaleTimeString(),
      };

      setHistory((current) => [record, ...current].slice(0, 100));
      setNotice("New simulated reading captured.");
    } catch (err: unknown) {
      console.error(err);

      let message =
        err instanceof Error
          ? err.message
          : "Unable to communicate with virtual weighing machine.";

      if (typeof err === "object" && err !== null && "response" in err) {
        const response = err.response;

        if (
          typeof response === "object" &&
          response !== null &&
          "data" in response
        ) {
          const body = response.data;

          if (
            typeof body === "object" &&
            body !== null &&
            "message" in body &&
            typeof body.message === "string"
          ) {
            message = body.message;
          }
        }
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resetDisplay = () => {
    setReading(null);
    setError("");
    setNotice("");
  };

  const clearHistory = () => {
    setHistory([]);
    setNotice("History cleared from this page.");
  };

  const exportCsv = () => {
    if (!history.length) {
      setNotice("Export karne se pehle kam se kam ek reading capture karo.");
      return;
    }

    const rows = [
      [
        "Time",
        "Reference Weight (kg)",
        "Observed Weight (kg)",
        "Error (kg)",
        "Percentage Error (%)",
        "Stable",
        "Source",
      ],
      ...[...history].reverse().map((item) => [
        item.time,
        item.referenceWeight,
        item.weight,
        item.error,
        item.percentError === null ? "N/A" : item.percentError,
        item.stable ? "Yes" : "No",
        item.source,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "smartmetrix-virtual-scale-history.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setNotice("CSV export created.");
  };

  const chartRecords = [...history].slice(0, 12).reverse();
  const chartValues = chartRecords.map((item) => item.weight);
  const chartMin =
    chartValues.length > 0 ? Math.min(...chartValues, reference) : 0;
  const chartMax =
    chartValues.length > 0 ? Math.max(...chartValues, reference) : 1;
  const chartSpan = chartMax - chartMin || Math.max(interval, 0.01);

  const chartPoints = chartRecords
    .map((item, index) => {
      const x =
        chartRecords.length <= 1
          ? 50
          : 12 + (index / (chartRecords.length - 1)) * 76;

      const y = 88 - ((item.weight - chartMin) / chartSpan) * 68;
      return `${x},${y}`;
    })
    .join(" ");

  const referenceY = 88 - ((reference - chartMin) / chartSpan) * 68;

  return (
    <div className="min-h-full space-y-6 bg-slate-50/70 p-1 text-slate-900">
      {/* Header */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl md:p-8">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
              <Activity size={14} />
              Hardware simulation lab
            </div>

            <h1 className="text-2xl font-bold tracking-tight md:text-4xl">
              Virtual Weighing Machine
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Explore simulated NAWI readings, compare reference weight and
              review measurement variation.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Virtual adapter selected
          </div>
        </div>
      </header>

      {(error || notice) && (
        <div
          role={error ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error ? (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          )}
          <span>{error || notice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Main dashboard */}
        <section className="space-y-6 xl:col-span-2">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center md:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <Scale size={25} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    SmartMetrix Virtual Scale
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Digital NAWI simulator
                  </p>
                </div>
              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                <Wifi size={14} />
                API adapter
              </span>
            </div>

            <div className="p-5 md:p-6">
              {/* Digital display */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-inner md:p-9">
                <div className="absolute right-5 top-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Digital display
                </div>

                <p className="pt-5 text-center text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Current observed weight
                </p>

                <div
                  aria-live="polite"
                  className="mt-4 flex min-w-0 items-baseline justify-center gap-3 font-mono"
                >
                  <span className="break-all text-5xl font-black tracking-tight text-cyan-300 sm:text-6xl md:text-7xl">
                    {reading ? fmt(reading.weight, 3) : "—.———"}
                  </span>
                  <span className="text-xl font-bold text-slate-400 md:text-2xl">
                    kg
                  </span>
                </div>

                <div className="mt-6 flex justify-center">
                  {loading ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-400/10 px-4 py-2 text-xs font-bold text-blue-200">
                      <Loader2 size={15} className="animate-spin" />
                      ACQUIRING READING
                    </span>
                  ) : reading?.stable ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300">
                      <CheckCircle2 size={16} />
                      SIMULATED STABLE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-300">
                      <Activity size={15} />
                      {reading ? "STABILITY NOT CONFIRMED" : "AWAITING READING"}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-center text-xs text-slate-500">
                  {reading
                    ? `Source: ${reading.source || "UNKNOWN"}`
                    : "Capture a reading to populate the display"}
                </p>
              </div>

              {/* Device metrics */}
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  {
                    label: "Reference",
                    value: `${fmt(reference, 3)} kg`,
                    icon: Scale,
                  },
                  {
                    label: "Scale interval",
                    value: `${fmt(interval, 5)} kg`,
                    icon: Gauge,
                  },
                  {
                    label: "Latest error",
                    value: latest
                      ? `${latest.error > 0 ? "+" : ""}${fmt(latest.error, 5)} kg`
                      : "—",
                    icon: Activity,
                  },
                  {
                    label: "Readings",
                    value: String(history.length),
                    icon: History,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-center gap-2 text-slate-500">
                        <Icon size={15} />
                        <span className="text-xs font-medium">
                          {item.label}
                        </span>
                      </div>
                      <p className="mt-2 break-words text-base font-bold text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label="Average reading"
              value={
                stats.average === null ? "—" : `${fmt(stats.average, 3)} kg`
              }
              detail="Across captured readings"
            />
            <MetricCard
              label="Minimum / maximum"
              value={
                stats.min === null || stats.max === null
                  ? "—"
                  : `${fmt(stats.min, 3)} / ${fmt(stats.max, 3)}`
              }
              detail="Observed endpoints (kg)"
            />
            <MetricCard
              label="Reading spread"
              value={stats.range === null ? "—" : `${fmt(stats.range, 5)} kg`}
              detail="Maximum minus minimum"
            />
          </div>

          {/* Trend chart */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700">
                  <Activity size={19} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Reading trend</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Recent readings compared with the reference.
                  </p>
                </div>
              </div>

              <span className="w-fit rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                {chartRecords.length} points
              </span>
            </div>

            {chartRecords.length < 2 ? (
              <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
                <Activity size={25} className="text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Capture at least two readings
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  The trend line will appear after repeated captures.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-950 p-3 sm:p-5">
                <svg
                  viewBox="0 0 100 100"
                  role="img"
                  aria-label="Recent simulated weight readings trend chart"
                  className="h-52 w-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  {[20, 40, 60, 80].map((y) => (
                    <line
                      key={y}
                      x1="8"
                      y1={y}
                      x2="92"
                      y2={y}
                      stroke="#334155"
                      strokeWidth="0.45"
                      strokeDasharray="1.5 1.5"
                    />
                  ))}

                  <line
                    x1="8"
                    y1={referenceY}
                    x2="92"
                    y2={referenceY}
                    stroke="#fbbf24"
                    strokeWidth="0.8"
                    strokeDasharray="2 1.5"
                  />

                  <polyline
                    points={chartPoints}
                    fill="none"
                    stroke="#67e8f9"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {chartRecords.map((item, index) => {
                    const x =
                      chartRecords.length <= 1
                        ? 50
                        : 12 + (index / (chartRecords.length - 1)) * 76;
                    const y =
                      88 - ((item.weight - chartMin) / chartSpan) * 68;

                    return (
                      <circle
                        key={item.id}
                        cx={x}
                        cy={y}
                        r="1.8"
                        fill="#a5f3fc"
                        stroke="#0f172a"
                        strokeWidth="0.7"
                      />
                    );
                  })}
                </svg>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-0.5 w-4 bg-cyan-300" />
                    Observed reading
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 border-t border-dashed border-amber-300" />
                    Reference weight
                  </span>
                </div>

                <p className="mt-2 text-[11px] text-slate-500">
                  Simulation visualization only; not a calibration result.
                </p>
              </div>
            )}
          </section>

          {/* Reading history */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center md:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <History size={19} className="text-blue-700" />
                  <h2 className="font-bold text-slate-900">Reading history</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Up to 100 readings in current page session.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={history.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={15} />
                  Export CSV
                </button>

                <button
                  type="button"
                  onClick={clearHistory}
                  disabled={history.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={15} />
                  Clear history
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="flex min-h-36 flex-col items-center justify-center px-5 py-8 text-center">
                <History size={26} className="text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No readings captured yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Use Read Weight to create a simulated measurement.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Time</th>
                      <th className="px-5 py-3 font-semibold">Reference</th>
                      <th className="px-5 py-3 font-semibold">Observed</th>
                      <th className="px-5 py-3 font-semibold">Error</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((item) => (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                          {item.time}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-medium">
                          {fmt(item.referenceWeight, 3)} kg
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-bold text-slate-900">
                          {fmt(item.weight, 3)} kg
                        </td>
                        <td
                          className={`whitespace-nowrap px-5 py-3.5 font-semibold ${
                            item.error > 0
                              ? "text-amber-700"
                              : item.error < 0
                              ? "text-blue-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {item.error > 0 ? "+" : ""}
                          {fmt(item.error, 5)} kg
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.stable
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.stable ? "Simulated stable" : "Not stable"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>

        {/* Controls and summary */}
        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                <Gauge size={22} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Machine controls</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Configure a simulated capture
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="reference-weight"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Reference weight (kg)
                </label>
                <input
                  id="reference-weight"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={referenceWeight}
                  onChange={(event) => setReferenceWeight(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Example: 10 kg reference load
                </p>
              </div>

              <div>
                <label
                  htmlFor="scale-interval"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Scale interval (kg)
                </label>
                <input
                  id="scale-interval"
                  type="number"
                  min="0.00001"
                  step="any"
                  inputMode="decimal"
                  value={scaleInterval}
                  onChange={(event) => setScaleInterval(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  0.01 kg = 10 g per interval
                </p>
              </div>

              {!valid && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  Reference must be non-negative and interval must be greater
                  than zero.
                </p>
              )}

              <button
                type="button"
                onClick={readWeight}
                disabled={loading || !valid}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Capturing reading...
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Read weight
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetDisplay}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={17} />
                Reset display
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert size={19} className="text-amber-600" />
              <h2 className="font-bold text-slate-900">Measurement summary</h2>
            </div>

            <div className="mt-4 space-y-3">
              <SummaryRow label="Reference" value={`${fmt(reference, 3)} kg`} />
              <SummaryRow
                label="Observed"
                value={latest ? `${fmt(latest.weight, 3)} kg` : "No reading"}
              />
              <SummaryRow
                label="Signed error"
                value={
                  latest
                    ? `${latest.error > 0 ? "+" : ""}${fmt(latest.error, 5)} kg`
                    : "—"
                }
              />
              <SummaryRow
                label="Relative error"
                value={
                  !latest || latest.percentError === null
                    ? "N/A"
                    : `${fmt(latest.percentError, 4)}%`
                }
              />
            </div>

            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              Error = observed weight − reference weight. This dashboard does
              not determine MPE or regulatory PASS/FAIL.
            </p>
          </section>

          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-center gap-2 text-blue-900">
              <CheckCircle2 size={18} />
              <h2 className="text-sm font-bold">Research prototype</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-blue-900/80">
              Readings come from the backend virtual adapter. They are
              simulated values, not measurements from a physical instrument
              or proof of metrological compliance.
            </p>
          </section>
        </aside>
      </div>

      <footer className="flex flex-col gap-1 border-t border-slate-200 px-1 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>SmartMetrix · Virtual measurement environment</span>
        <span>
          History is kept in page memory; it is not saved to the database.
        </span>
      </footer>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}
