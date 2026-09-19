import { useState } from "react";

import {
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Gauge,
  Loader2,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import api from "../services/api";

type DriftData = {
  averageError?: number;
  averageAbsoluteError?: number;
  maximumAbsoluteError?: number;
  driftScore?: number;
  driftStatus?: string;
  history?: {
    testRecordId?: number;
    date?: string;
    error?: number;
    result?: string;
  }[];
};

type MLHistoryPoint = {
  testRecordId: number;
  referenceWeight: number;
  observedWeight: number;
  error: number;
};

type MLData = {
  predictionStatus?: string;
  currentAverageError?: number;
  predictedNextError?: number;
  trendSlope?: number;
  confidence?: number;
  predictedRisk?: string;
  explanation?: string;
  history?: MLHistoryPoint[];
};

type RiskData = {
  riskScore?: number;
  riskLevel?: string;
  environmentStatus?: string;
  recommendation?: string;

  temperature?: number;
  humidity?: number;
  vibration?: number;
};

export default function PredictiveAnalytics() {
  const [instrumentId, setInstrumentId] = useState("");

  const [drift, setDrift] =
    useState<DriftData | null>(null);

  const [ml, setMl] =
    useState<MLData | null>(null);

  const [risk, setRisk] =
    useState<RiskData | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadPrediction = async () => {
    if (!instrumentId.trim()) {
      setError("Please enter an instrument ID.");
      return;
    }

    const id = Number(instrumentId);

    if (!Number.isInteger(id) || id <= 0) {
      setError("Please enter a valid instrument ID.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        driftResponse,
        mlResponse,
        riskResponse,
      ] = await Promise.all([
        api.get<DriftData>(
          `/drift/instrument/${id}`
        ),

        api.get<MLData>(
          `/ml/prediction/instrument/${id}`
        ),

        api.get<RiskData>(
          `/risk/instrument/${id}`
        ),
      ]);

      setDrift(driftResponse.data);
      setMl(mlResponse.data);
      setRisk(riskResponse.data);
    } catch (err: any) {
      console.error(
        "Predictive analytics loading failed",
        err
      );

      setDrift(null);
      setMl(null);
      setRisk(null);

      setError(
        err?.response?.data?.message ||
          "Unable to load predictive analytics."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      loadPrediction();
    }
  };

  const riskLevel =
    risk?.riskLevel?.toUpperCase() ||
    "UNKNOWN";

  const riskScore = Math.min(
    Math.max(
      Number(risk?.riskScore ?? 0),
      0
    ),
    100
  );

  const confidence = Math.min(
    Math.max(
      Number(ml?.confidence ?? 0),
      0
    ),
    100
  );

  const riskCardClass =
    riskLevel === "HIGH"
      ? "border-red-200 bg-red-50 text-red-700"
      : riskLevel === "MEDIUM"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : riskLevel === "LOW"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-slate-200 bg-slate-50 text-slate-600";

  const riskIconClass =
    riskLevel === "HIGH"
      ? "bg-red-100 text-red-600"
      : riskLevel === "MEDIUM"
      ? "bg-amber-100 text-amber-600"
      : riskLevel === "LOW"
      ? "bg-green-100 text-green-600"
      : "bg-slate-100 text-slate-500";

  const predictionStatus =
    ml?.predictionStatus?.toUpperCase() ||
    "UNKNOWN";

  const predictionRisk =
    ml?.predictedRisk?.toUpperCase() ||
    "UNKNOWN";

  const driftStatus =
    drift?.driftStatus?.toUpperCase() ||
    "UNKNOWN";

  const environmentStatus =
    risk?.environmentStatus?.toUpperCase() ||
    "UNKNOWN";

  const historicalRecordCount =
    ml?.history?.length ?? 0;

  return (
    <div className="space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

        <div>

          <p className="text-sm font-bold text-blue-600">
            Predictive Intelligence
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Drift, ML & Risk Analytics
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Analyze historical Weighing Performance records and
            generate early-warning indicators for weighing
            instruments.
          </p>

        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-700">

          <BrainCircuit size={15} />

          Research Analytics

        </div>

      </div>


      {/* ==================================================
          INSTRUMENT SEARCH
      ================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="mb-3 flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

            <Gauge size={20} />

          </div>

          <div>

            <p className="font-bold text-slate-900">
              Instrument Analysis
            </p>

            <p className="text-xs text-slate-500">
              Enter an instrument ID to run all predictive
              modules.
            </p>

          </div>

        </div>

        <div className="flex flex-col gap-3 sm:flex-row">

          <input
            type="number"
            min="1"
            value={instrumentId}
            onChange={(e) =>
              setInstrumentId(
                e.target.value
              )
            }
            onKeyDown={handleKeyDown}
            placeholder="Enter Instrument ID"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />

          <button
            onClick={loadPrediction}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >

            {loading ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={18} />
            )}

            {loading
              ? "Analyzing..."
              : "Analyze Instrument"}

          </button>

        </div>

      </div>


      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">

          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <span>
            {error}
          </span>

        </div>
      )}


      {/* ==================================================
          EMPTY STATE
      ================================================== */}

      {!drift && !ml && !risk ? (

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">

            <BrainCircuit size={34} />

          </div>

          <p className="mt-5 font-bold text-slate-700">
            No predictive analysis loaded
          </p>

          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
            Enter an instrument ID above to analyze
            measurement drift, prediction confidence and
            inspection risk.
          </p>

        </div>

      ) : (

        <>

          {/* ==================================================
              DRIFT ANALYSIS
          ================================================== */}

          <section>

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                <TrendingUp size={21} />

              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Drift Analysis
                </h2>

                <p className="text-sm text-slate-500">
                  Historical measurement error indicators.
                </p>

              </div>

            </div>


            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <Metric
                title="Average Error"
                value={drift?.averageError}
              />

              <Metric
                title="Average Absolute Error"
                value={
                  drift?.averageAbsoluteError
                }
              />

              <Metric
                title="Maximum Absolute Error"
                value={
                  drift?.maximumAbsoluteError
                }
              />

              <div>

                <Metric
                  title="Drift Score"
                  value={drift?.driftScore}
                />

                <p className="mt-3 text-xs text-slate-500">
                  Prototype drift score: 0–100. It compares
                  early and later historical absolute errors.
                  Score below 30 = STABLE, 30–59.99 = WARNING,
                  and 60–100 = HIGH_DRIFT. This is a research
                  indicator, not an OIML MPE limit.
                </p>

              </div>

            </div>


            <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">

              <div>

                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Drift Status
                </p>

                <p className="mt-1 text-xl font-black text-slate-900">
                  {driftStatus}
                </p>

              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">

                <ActivityIcon />

                Historical analysis

              </div>

            </div>

          </section>


          {/* ==================================================
              ML PREDICTION
          ================================================== */}

          <section className="rounded-2xl border border-purple-200 bg-white p-6 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">

                <BrainCircuit size={22} />

              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  ML Prediction
                </h2>

                <p className="text-sm text-slate-500">
                  Historical-data-based early prediction.
                </p>

              </div>

            </div>


            {/* Main ML metrics */}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">

              <InfoBox
                title="Model Status"
                value={predictionStatus}
              />

              <InfoBox
                title="Prediction"
                value={
                  ml?.predictedNextError !==
                  undefined
                    ? `${ml.predictedNextError.toFixed(4)} kg`
                    : "N/A"
                }
              />

              <div>

                <InfoBox
                  title="Confidence"
                  value={`${confidence}%`}
                />

                <p className="mt-2 text-xs text-slate-500">
                  Prototype confidence indicator based on
                  the number of historical Weighing Performance
                  records. It is not statistical confidence or
                  measurement uncertainty.
                </p>

              </div>

            </div>


            {/* Additional ML information */}

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">

              <InfoBox
                title="Current Average Error"
                value={
                  ml?.currentAverageError !==
                  undefined
                    ? ml.currentAverageError.toFixed(4)
                    : "N/A"
                }
              />

              <InfoBox
                title="Trend Slope"
                value={
                  ml?.trendSlope !==
                  undefined
                    ? ml.trendSlope.toFixed(6)
                    : "N/A"
                }
              />

              <InfoBox
                title="Predicted Risk"
                value={predictionRisk}
              />

            </div>


            {/* Historical record count */}

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                    Historical WP Records
                  </p>

                  <p className="mt-1 text-sm font-semibold text-blue-900">
                    {historicalRecordCount}{" "}
                    weighing-performance records
                  </p>

                </div>

                <div className="rounded-xl bg-white px-4 py-2 text-sm font-black text-blue-700">

                  {historicalRecordCount} Records

                </div>

              </div>

            </div>


            {/* Model message */}

            {ml?.explanation && (

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Model Message
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {ml.explanation}
                </p>

              </div>

            )}


            {/* Historical ML data */}

            {ml?.history &&
              ml.history.length > 0 && (

                <div className="mt-6">

                  <div className="mb-3 flex items-center justify-between">

                    <div>

                      <h3 className="font-bold text-slate-900">
                        ML Historical Data
                      </h3>

                      <p className="text-xs text-slate-500">
                        Weighing-performance records used
                        by the prediction model.
                      </p>

                    </div>

                    <TrendingUp
                      size={19}
                      className="text-purple-500"
                    />

                  </div>


                  <div className="overflow-x-auto rounded-xl border border-slate-200">

                    <table className="w-full min-w-[650px] text-sm">

                      <thead className="bg-slate-50">

                        <tr className="border-b border-slate-200">

                          <th className="px-4 py-3 text-left font-semibold text-slate-600">
                            Record
                          </th>

                          <th className="px-4 py-3 text-right font-semibold text-slate-600">
                            Reference
                          </th>

                          <th className="px-4 py-3 text-right font-semibold text-slate-600">
                            Observed
                          </th>

                          <th className="px-4 py-3 text-right font-semibold text-slate-600">
                            Error
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {ml.history.map(
                          (record) => (

                            <tr
                              key={
                                record.testRecordId
                              }
                              className="border-b border-slate-100 last:border-b-0"
                            >

                              <td className="px-4 py-3 font-semibold text-slate-900">
                                #
                                {
                                  record.testRecordId
                                }
                              </td>

                              <td className="px-4 py-3 text-right text-slate-700">
                                {record.referenceWeight.toFixed(
                                  3
                                )}{" "}
                                kg
                              </td>

                              <td className="px-4 py-3 text-right font-medium text-slate-900">
                                {record.observedWeight.toFixed(
                                  3
                                )}{" "}
                                kg
                              </td>

                              <td className="px-4 py-3 text-right font-semibold text-slate-900">

                                {record.error >=
                                0
                                  ? "+"
                                  : ""}

                                {record.error.toFixed(
                                  4
                                )}{" "}
                                kg

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>

              )}

          </section>


          {/* ==================================================
              RISK ASSESSMENT
          ================================================== */}

          <section>

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">

                <ShieldAlert size={21} />

              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Risk Assessment
                </h2>

                <p className="text-sm text-slate-500">
                  Combined early-warning risk indication.
                </p>

              </div>

            </div>


            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">


              {/* --------------------------------------------
                  RISK SCORE
              -------------------------------------------- */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-sm font-medium text-slate-500">
                      Risk Score
                    </p>

                    <p className="mt-2 text-5xl font-black tracking-tight text-slate-900">
                      {risk?.riskScore ??
                        "--"}
                    </p>

                  </div>

                  <div className="rounded-xl bg-red-50 p-3 text-red-600">

                    <Gauge size={23} />

                  </div>

                </div>


                <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-500"
                    style={{
                      width: `${riskScore}%`,
                    }}
                  />

                </div>


                <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-400">

                  <span>
                    LOW
                  </span>

                  <span>
                    MEDIUM
                  </span>

                  <span>
                    HIGH
                  </span>

                </div>


                <p className="mt-3 text-xs text-slate-500">
                  Prototype risk score: 0–100. Lower scores
                  indicate lower early-warning risk. Higher
                  scores indicate greater risk.
                </p>

              </div>


              {/* --------------------------------------------
                  RISK LEVEL
              -------------------------------------------- */}

              <div
                className={`rounded-2xl border p-6 shadow-sm ${riskCardClass}`}
              >

                <div className="flex items-center gap-3">

                  <div
                    className={`rounded-xl p-3 ${riskIconClass}`}
                  >

                    <AlertTriangle
                      size={22}
                    />

                  </div>

                  <p className="text-sm font-bold">
                    Risk Level
                  </p>

                </div>


                <p className="mt-5 text-4xl font-black">
                  {riskLevel}
                </p>


                {/* Environment */}

                <div className="mt-4">

                  <div className="flex items-center gap-2 text-sm">

                    <span className="font-medium opacity-80">
                      Environment:
                    </span>

                    <strong>
                      {environmentStatus}
                    </strong>

                  </div>


                  <div className="mt-4 grid grid-cols-3 gap-2">

                    <div className="rounded-xl bg-white/70 p-3">

                      <p className="text-[11px] font-semibold opacity-70">
                        Temperature
                      </p>

                      <p className="mt-1 font-bold">

                        {risk?.temperature !== undefined
                          ? `${risk.temperature.toFixed(1)} °C`
                          : "--"}

                      </p>

                    </div>


                    <div className="rounded-xl bg-white/70 p-3">

                      <p className="text-[11px] font-semibold opacity-70">
                        Humidity
                      </p>

                      <p className="mt-1 font-bold">

                        {risk?.humidity !== undefined
                          ? `${risk.humidity.toFixed(1)} %`
                          : "--"}

                      </p>

                    </div>


                    <div className="rounded-xl bg-white/70 p-3">

                      <p className="text-[11px] font-semibold opacity-70">
                        Vibration
                      </p>

                      <p className="mt-1 font-bold">

                        {risk?.vibration !== undefined
                          ? risk.vibration.toFixed(2)
                          : "--"}

                      </p>

                    </div>

                  </div>


                  <p className="mt-3 text-xs opacity-70">
                    Environment status is based on the latest
                    recorded inspection conditions.
                  </p>

                </div>

              </div>


              {/* --------------------------------------------
                  RECOMMENDATION
              -------------------------------------------- */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="flex items-center gap-3">

                  <div className="rounded-xl bg-amber-50 p-3 text-amber-600">

                    <AlertTriangle
                      size={21}
                    />

                  </div>

                  <p className="text-sm font-bold text-slate-900">
                    Recommendation
                  </p>

                </div>

                <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
                  {risk?.recommendation ||
                    "No recommendation available."}
                </p>

              </div>

            </div>

          </section>


          {/* ==================================================
              PREDICTIVE SUMMARY
          ================================================== */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-start gap-3">

              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">

                <BrainCircuit size={21} />

              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Predictive Summary
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  The predictive layer uses historical
                  weighing-performance measurements to
                  identify possible future error behavior.
                  Drift and risk indicators provide
                  additional early-warning context.
                </p>

              </div>

            </div>


            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">

              <SummaryItem
                title="Historical Records"
                value={`${historicalRecordCount}`}
                description="WP records available to the ML layer"
              />

              <SummaryItem
                title="Predicted Risk"
                value={predictionRisk}
                description="Risk indication returned by the model"
              />

              <SummaryItem
                title="Environment"
                value={environmentStatus}
                description="Latest risk environment status"
              />

            </div>

          </section>


          {/* ==================================================
              RESEARCH DISCLAIMER
          ================================================== */}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

            <div className="flex items-start gap-3">

              <AlertTriangle
                size={19}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>

                <p className="font-bold text-amber-900">
                  Research Indicator
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Drift, ML and risk outputs are
                  early-warning research indicators.
                  They do not replace applicable
                  OIML-oriented measurement rules or
                  the regulatory PASS/FAIL decision.
                </p>

              </div>

            </div>

          </div>

        </>

      )}

    </div>
  );
}


/* ======================================================
   METRIC CARD
====================================================== */

function Metric({
  title,
  value,
}: {
  title: string;
  value?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-2xl font-black text-slate-900">
        {value !== undefined
          ? value.toFixed(4)
          : "--"}
      </p>

    </div>
  );
}


/* ======================================================
   INFO BOX
====================================================== */

function InfoBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <p className="mt-2 break-words font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}


/* ======================================================
   SUMMARY ITEM
====================================================== */

function SummaryItem({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}


/* ======================================================
   ACTIVITY ICON
====================================================== */

function ActivityIcon() {
  return (
    <CheckCircle2 size={14} />
  );
}