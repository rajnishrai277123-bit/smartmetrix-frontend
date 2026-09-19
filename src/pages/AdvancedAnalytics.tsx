
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Download,
  HeartPulse,
  Leaf,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import api from "../services/api";

type TrendPoint = {
  date: string;
  error: number;
  result: string;
};

type AdvancedData = {
  instrumentId: number;
  healthScore: number;
  healthStatus: string;
  environmentImpactScore: number;
  environmentImpactLevel: string;
  averageError: number;
  maximumAbsoluteError: number;
  totalTests: number;
  failedTests: number;
  recalibrationPrediction: string;
  recalibrationRecommendation: string;
  trend: TrendPoint[];
};

type InstrumentDetails = {
  id: number;
  manufacturer: string;
  model: string;
  serialNumber: string;
  instrumentClass: string;
  capacity: number;
  minCapacity: number;
  scaleInterval: number;
  status: string;
};

type Inspection = {
  id: number;
  instrumentId: number;
  completedAt?: string;
  createdAt?: string;
  status?: string;
};

type WeighingPerformanceRecord = {
  id: number;
  inspectionId: number;
  testType: string;
  referenceWeight: number;
  observedWeight: number;
  error: number;
  mpe: number;
  temperature?: number;
  humidity?: number;
  vibration?: number;
  result: string;
  testStage?: string;
  createdAt?: string;
};

type RepeatabilityRecord = {
  id: number;
  inspectionId: number;
  testRunId: number;
  readingNumber: number;
  referenceWeight: number;
  observedWeight: number;
};

type EccentricityRecord = {
  id: number;
  inspectionId: number;
  position: string;
  referenceWeight: number;
  observedWeight: number;
};

type RepeatabilityRun = {
  testRunId: number;
  readings: number[];
  average: number;
  range: number;
  result: string;
};

type EccentricityPositionResult = {
  position: string;
  referenceWeight: number;
  observedWeight: number;
  error: number;
  result: string;
};

type EccentricitySummary = {
  referenceWeight: number;
  maximumDifference: number;
  mpe: number;
  result: string;
  positions: EccentricityPositionResult[];
};

function calculateRepeatabilityMpe(
  load: number,
  e: number,
  instrumentClass: string
): number {
  if (e <= 0) {
    return 0;
  }

  const clazz = instrumentClass.trim().toUpperCase();

  let multiplier: number;

  switch (clazz) {
    case "I":
      if (load <= 50000 * e) {
        multiplier = 0.5;
      } else if (load <= 200000 * e) {
        multiplier = 1.0;
      } else {
        multiplier = 1.5;
      }
      break;

    case "II":
      if (load <= 5000 * e) {
        multiplier = 0.5;
      } else if (load <= 20000 * e) {
        multiplier = 1.0;
      } else {
        multiplier = 1.5;
      }
      break;

    case "III":
      if (load <= 500 * e) {
        multiplier = 0.5;
      } else if (load <= 2000 * e) {
        multiplier = 1.0;
      } else {
        multiplier = 1.5;
      }
      break;

    case "IIII":
      if (load <= 50 * e) {
        multiplier = 0.5;
      } else if (load <= 200 * e) {
        multiplier = 1.0;
      } else {
        multiplier = 1.5;
      }
      break;

    default:
      return 0;
  }

  return multiplier * e;
}

function calculateEccentricityMpe(
  load: number,
  e: number,
  instrumentClass: string
): number {
  return calculateRepeatabilityMpe(
    load,
    e,
    instrumentClass
  );
}

function formatInspectionDate(
  completedAt?: string,
  createdAt?: string
): string {
  const dateValue = completedAt || createdAt;

  if (!dateValue) {
    return "Date unavailable";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdvancedAnalytics() {
  const [instrumentId, setInstrumentId] = useState("");
  const [data, setData] =
    useState<AdvancedData | null>(null);

  const [instrumentDetails, setInstrumentDetails] =
    useState<InstrumentDetails | null>(null);

  const [inspectionId, setInspectionId] =
    useState<number | null>(null);

  const [latestInspection, setLatestInspection] =
    useState<Inspection | null>(null);

  const [weighingPerformance, setWeighingPerformance] =
    useState<WeighingPerformanceRecord | null>(null);

  const [repeatabilityRuns, setRepeatabilityRuns] =
    useState<RepeatabilityRun[]>([]);

  const [eccentricitySummary, setEccentricitySummary] =
    useState<EccentricitySummary | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function loadAnalytics() {
    if (!instrumentId.trim()) {
      setError("Enter an instrument ID.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const id = Number(instrumentId);

      // ------------------------------------------------
      // 1. HISTORICAL ADVANCED ANALYTICS
      // ------------------------------------------------

      const analyticsResponse =
        await api.get<AdvancedData>(
          `/advanced-analytics/instrument/${id}`
        );

      setData(analyticsResponse.data);

      // ------------------------------------------------
      // 2. INSTRUMENT DETAILS
      // ------------------------------------------------

      const instrumentResponse =
        await api.get<InstrumentDetails>(
          `/instruments/${id}`
        );

      const currentInstrument =
        instrumentResponse.data;

      setInstrumentDetails(
        currentInstrument
      );

      // ------------------------------------------------
      // 3. FIND LATEST COMPLETED INSPECTION
      // ------------------------------------------------

      const inspectionsResponse =
        await api.get<Inspection[]>(
          `/inspections`
        );

      const matchingInspections =
        inspectionsResponse.data.filter(
          (inspection) =>
            Number(inspection.instrumentId) === id
        );

      const completedInspections =
        matchingInspections.filter(
          (inspection) =>
            Boolean(inspection.completedAt)
        );

      if (completedInspections.length === 0) {
        setInspectionId(null);
        setLatestInspection(null);
        setWeighingPerformance(null);
        setRepeatabilityRuns([]);
        setEccentricitySummary(null);
        return;
      }

      const selectedInspection =
        [...completedInspections].sort(
          (a, b) => {
            const dateA =
              new Date(
                a.completedAt ||
                a.createdAt ||
                0
              ).getTime();

            const dateB =
              new Date(
                b.completedAt ||
                b.createdAt ||
                0
              ).getTime();

            return dateB - dateA;
          }
        )[0];

      const selectedInspectionId =
        Number(selectedInspection.id);

      setLatestInspection(
        selectedInspection
      );

      setInspectionId(
        selectedInspectionId
      );

      // ------------------------------------------------
      // 4. WEIGHING PERFORMANCE
      // ------------------------------------------------

      const testResponse =
        await api.get<WeighingPerformanceRecord[]>(
          `/test-records`
        );

      const wpRecord =
        testResponse.data
          .filter(
            (record) =>
              Number(record.inspectionId) ===
                selectedInspectionId &&
              record.testType ===
                "WEIGHING_PERFORMANCE"
          )
          .sort(
            (a, b) =>
              new Date(
                b.createdAt || 0
              ).getTime() -
              new Date(
                a.createdAt || 0
              ).getTime()
          )[0] || null;

      setWeighingPerformance(
        wpRecord
      );

      // ------------------------------------------------
      // 5. REPEATABILITY
      // ------------------------------------------------

      const repeatabilityResponse =
        await api.get<RepeatabilityRecord[]>(
          `/repeatability/inspection/${selectedInspectionId}`
        );

      const repeatabilityMap =
        new Map<
          number,
          RepeatabilityRecord[]
        >();

      for (
        const record of
        repeatabilityResponse.data
      ) {
        if (
          !repeatabilityMap.has(
            record.testRunId
          )
        ) {
          repeatabilityMap.set(
            record.testRunId,
            []
          );
        }

        repeatabilityMap
          .get(record.testRunId)!
          .push(record);
      }

      const runs: RepeatabilityRun[] = [];

      for (
        const [
          testRunId,
          records,
        ] of repeatabilityMap
      ) {
        if (records.length !== 5) {
          continue;
        }

        const sortedRecords =
          [...records].sort(
            (a, b) =>
              a.readingNumber -
              b.readingNumber
          );

        const readings =
          sortedRecords.map(
            (record) =>
              record.observedWeight
          );

        const average =
          readings.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / readings.length;

        const range =
          Math.max(...readings) -
          Math.min(...readings);

        const referenceWeight =
          sortedRecords[0]
            .referenceWeight;

        const mpe =
          calculateRepeatabilityMpe(
            referenceWeight,
            currentInstrument.scaleInterval,
            currentInstrument.instrumentClass
          );

        runs.push({
          testRunId,
          readings,
          average,
          range,
          result:
            range <= mpe
              ? "PASS"
              : "FAIL",
        });
      }

      setRepeatabilityRuns(
        runs.sort(
          (a, b) =>
            a.testRunId -
            b.testRunId
        )
      );

      // ------------------------------------------------
      // 6. ECCENTRICITY
      // ------------------------------------------------

      const eccentricityResponse =
        await api.get<EccentricityRecord[]>(
          `/eccentricity/inspection/${selectedInspectionId}`
        );

      const eccentricityRecords =
        eccentricityResponse.data;

      if (
        eccentricityRecords.length === 5
      ) {
        const referenceWeight =
          eccentricityRecords[0]
            .referenceWeight;

        const mpe =
          calculateEccentricityMpe(
            referenceWeight,
            currentInstrument.scaleInterval,
            currentInstrument.instrumentClass
          );

        const positions: EccentricityPositionResult[] =
          eccentricityRecords.map(
            (record) => {

              const error =
                record.observedWeight -
                referenceWeight;

              return {
                position:
                  record.position,
                referenceWeight,
                observedWeight:
                  record.observedWeight,
                error,
                result:
                  Math.abs(error) <= mpe
                    ? "PASS"
                    : "FAIL",
              };
            }
          );

        const observedValues =
          positions.map(
            (position) =>
              position.observedWeight
          );

        const maximumDifference =
          Math.max(
            ...observedValues
          ) -
          Math.min(
            ...observedValues
          );

        const allPassed =
          positions.every(
            (position) =>
              position.result ===
              "PASS"
          );

        /*
         * Keep the normal inspection order:
         * LEFT → RIGHT → FRONT → BACK → CENTER
         */
        const positionOrder: Record<
          string,
          number
        > = {
          LEFT: 1,
          RIGHT: 2,
          FRONT: 3,
          BACK: 4,
          CENTER: 5,
        };

        positions.sort(
          (a, b) =>
            (positionOrder[
              a.position.toUpperCase()
            ] || 99) -
            (positionOrder[
              b.position.toUpperCase()
            ] || 99)
        );

        setEccentricitySummary({
          referenceWeight,
          maximumDifference,
          mpe,
          result:
            allPassed
              ? "PASS"
              : "FAIL",
          positions,
        });
      } else {
        setEccentricitySummary(
          null
        );
      }

    } catch (err) {
      console.error(
        "Advanced Analytics error:",
        err
      );

      setData(null);
      setInstrumentDetails(null);
      setInspectionId(null);
      setLatestInspection(null);
      setWeighingPerformance(null);
      setRepeatabilityRuns([]);
      setEccentricitySummary(null);

      setError(
        "Unable to load advanced analytics."
      );
    } finally {
      setLoading(false);
    }
  }

  async function downloadReport() {
    if (!instrumentId.trim()) {
      return;
    }

    try {
      const response =
        await api.get(
          `/research-report/instrument/${instrumentId}`,
          {
            responseType: "blob",
          }
        );

      const url =
        window.URL.createObjectURL(
          new Blob(
            [response.data],
            {
              type: "application/pdf",
            }
          )
        );

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `smartmetrix-research-report-${instrumentId}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch {
      setError(
        "Unable to generate research report."
      );
    }
  }

  const healthClass =
    data?.healthStatus === "HEALTHY"
      ? "text-emerald-600"
      : data?.healthStatus === "WARNING"
        ? "text-amber-600"
        : "text-red-600";

  const environmentClass =
    data?.environmentImpactLevel === "LOW"
      ? "text-emerald-600"
      : data?.environmentImpactLevel === "MEDIUM"
        ? "text-amber-600"
        : "text-red-600";

  const repeatabilityPassCount =
    repeatabilityRuns.filter(
      (run) =>
        run.result === "PASS"
    ).length;

  const repeatabilityFailCount =
    repeatabilityRuns.filter(
      (run) =>
        run.result === "FAIL"
    ).length;

  return (
    <div className="page-enter space-y-6">

      {/* ------------------------------------------------
          PAGE HEADER
      ------------------------------------------------ */}

      <div>
        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-slate-900 p-3 text-white">
            <Activity size={22} />
          </div>

          <div>

            <h1 className="text-2xl font-bold text-slate-900">
              Advanced Analytics
            </h1>

            <p className="text-sm text-slate-500">
              Research-oriented instrument health,
              environment impact and recalibration analysis.
            </p>

          </div>
        </div>
      </div>

      {/* ------------------------------------------------
          SEARCH / ANALYZE
      ------------------------------------------------ */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-3 md:flex-row">

          <input
            type="number"
            value={instrumentId}
            onChange={(e) =>
              setInstrumentId(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                loadAnalytics();
              }
            }}
            placeholder="Enter Instrument ID (e.g. 15)"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
          />

          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >

            <RefreshCw size={17} />

            {loading
              ? "Loading..."
              : "Analyze"}

          </button>

          <button
            onClick={downloadReport}
            disabled={!data}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >

            <Download size={17} />

            Research PDF

          </button>

        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

      </div>

      {/* ------------------------------------------------
          ANALYTICS RESULT
      ------------------------------------------------ */}

      {data && (
        <>

          {/* ------------------------------------------------
              INSTRUMENT DETAILS
          ------------------------------------------------ */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Selected Instrument
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  Instrument #{data.instrumentId}
                </p>

              </div>

              {latestInspection && (
                <div className="text-sm text-slate-500">
                  Latest completed inspection:{" "}
                  <span className="font-semibold text-slate-700">
                    #{latestInspection.id}
                  </span>
                </div>
              )}

            </div>

            {instrumentDetails && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                <div>
                  <p className="text-xs font-medium uppercase text-slate-400">
                    Model
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {instrumentDetails.model}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-slate-400">
                    Serial Number
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {instrumentDetails.serialNumber}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-slate-400">
                    Class
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {instrumentDetails.instrumentClass}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-slate-400">
                    Capacity
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {instrumentDetails.capacity} kg
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-slate-400">
                    Scale Interval
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {instrumentDetails.scaleInterval}
                  </p>
                </div>

              </div>
            )}

          </div>

          {/* ------------------------------------------------
              HISTORICAL ANALYTICS
          ------------------------------------------------ */}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

            <div className="flex items-start gap-3">

              <TrendingUp
                size={20}
                className="mt-0.5 text-slate-700"
              />

              <div>

                <h2 className="font-semibold text-slate-900">
                  Historical Analytics
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Health, environment, error statistics,
                  recalibration prediction and trend are
                  calculated from the instrument's historical
                  completed test data.
                </p>

              </div>

            </div>

          </div>

          {/* ------------------------------------------------
              MAIN METRICS
          ------------------------------------------------ */}

          <div className="grid gap-4 md:grid-cols-3">

            <MetricCard
              icon={
                <HeartPulse size={20} />
              }
              title="Instrument Health"
              value={`${data.healthScore}/100`}
              status={data.healthStatus}
              className={healthClass}
            />

            <MetricCard
              icon={
                <Leaf size={20} />
              }
              title="Environment Impact"
              value={`${data.environmentImpactScore}/100`}
              status={
                data.environmentImpactLevel
              }
              className={environmentClass}
            />

            <MetricCard
              icon={
                <RefreshCw size={20} />
              }
              title="Recalibration"
              value={
                data.recalibrationPrediction
              }
              status="Research Prediction"
              className="text-indigo-600"
            />

          </div>

          
{/* ------------------------------------------------
    HISTORICAL TEST SUMMARY
------------------------------------------------ */}

<div>

  <h2 className="text-xl font-bold text-slate-900">
    Historical Test Summary
  </h2>

  <p className="mt-1 text-sm text-slate-500">
    Total completed Weighing Performance, Repeatability,
    and Eccentricity test executions.
  </p>

</div>

<div className="grid gap-4 md:grid-cols-5">

  <Stat
    title="Total Test Executions"
    value={data.totalTests}
  />

  <Stat
    title="Passed Tests"
    value={
      data.totalTests -
      data.failedTests
    }
  />

  <Stat
    title="Failed Tests"
    value={data.failedTests}
  />

  <Stat
    title="WP Average Error"
    value={`${data.averageError.toFixed(4)} kg`}
  />

  <Stat
    title="WP Maximum Error"
    value={`${data.maximumAbsoluteError.toFixed(4)} kg`}
  />

</div>

{/* ------------------------------------------------
    RESEARCH METRIC EXPLANATION
------------------------------------------------ */}

<div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">

  <h3 className="font-semibold text-slate-900">
    How these research metrics are calculated
  </h3>

  <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">

    <p>
      <span className="font-semibold text-slate-900">
        Instrument Health:
      </span>{" "}
      Research score from 0–100 based on historical
      measurement performance and test results. Higher
      scores indicate better historical measurement health.
    </p>

    <p>
      <span className="font-semibold text-slate-900">
        Environment Impact:
      </span>{" "}
      Research score from 0–100 based on recorded inspection
      environment conditions and their observed assessment
      status. Lower scores indicate lower observed
      environmental impact.
    </p>

    <p>
      <span className="font-semibold text-slate-900">
        Recalibration:
      </span>{" "}
      Research prediction based on historical instrument
      health, test failures and measurement-error behaviour.
      It provides an early-warning indication for possible
      recalibration needs.
    </p>

    <p className="pt-1 text-xs text-slate-500">
      These are experimental research metrics and do not
      replace the OIML-oriented regulatory PASS/FAIL rule engine.
    </p>

  </div>

</div>

{/* ------------------------------------------------
    LATEST COMPLETED INSPECTION
------------------------------------------------ */}

<div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">

  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

    <div>

      <h2 className="text-xl font-bold text-indigo-950">
        Latest Completed Inspection
      </h2>

      <p className="mt-1 text-sm text-indigo-800">
        Detailed OIML-oriented test results from
        the latest completed inspection.
      </p>

    </div>

    {latestInspection && (
      <div className="rounded-xl bg-white px-4 py-3 text-sm">

        <p className="text-xs uppercase text-slate-400">
          Inspection
        </p>

        <p className="font-semibold text-slate-900">
          #{latestInspection.id}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {formatInspectionDate(
            latestInspection.completedAt,
            latestInspection.createdAt
          )}
        </p>

      </div>
    )}

  </div>

</div>



          {/* ------------------------------------------------
              TEST BREAKDOWN
          ------------------------------------------------ */}

          <div>

            <h2 className="text-xl font-bold text-slate-900">
              Test Breakdown
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Results from the latest completed inspection.
              These values are separate from the historical
              analytics summary above.
            </p>

          </div>

          {/* ------------------------------------------------
              WEIGHING PERFORMANCE
          ------------------------------------------------ */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="font-semibold text-slate-900">
                  Weighing Performance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Direct measurement accuracy result.
                </p>

              </div>

              {weighingPerformance && (
                <span
                  className={
                    weighingPerformance.result ===
                    "PASS"
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-600"
                      : "rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-600"
                  }
                >
                  {weighingPerformance.result}
                </span>
              )}

            </div>

            {weighingPerformance ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                <DetailItem
                  title="Reference"
                  value={`${weighingPerformance.referenceWeight.toFixed(
                    3
                  )} kg`}
                />

                <DetailItem
                  title="Observed"
                  value={`${weighingPerformance.observedWeight.toFixed(
                    3
                  )} kg`}
                />

                <DetailItem
                  title="Error"
                  value={`${
                    weighingPerformance.error >=
                    0
                      ? "+"
                      : ""
                  }${weighingPerformance.error.toFixed(
                    3
                  )}Kg`}
                />

                <DetailItem
                  title="MPE"
                  value={`±${weighingPerformance.mpe.toFixed(
                    3
                  )}Kg`}
                />

                <DetailItem
                  title="Test Record"
                  value={`#${weighingPerformance.id}`}
                />

              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No weighing performance record found
                for the latest completed inspection.
              </p>
            )}

          </div>

          {/* ------------------------------------------------
              REPEATABILITY
          ------------------------------------------------ */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="font-semibold text-slate-900">
                  Repeatability
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Completed five-reading test runs.
                </p>

              </div>

              <div className="text-sm font-semibold text-slate-600">

                {repeatabilityRuns.length}{" "}
                {repeatabilityRuns.length === 1
                  ? "Run"
                  : "Runs"}

              </div>

            </div>

            {repeatabilityRuns.length === 0 ? (
              <p className="mt-5 text-sm text-slate-500">
                No completed repeatability runs found
                for the latest completed inspection.
              </p>
            ) : (
              <div className="mt-5 space-y-4">

                {repeatabilityRuns.map(
                  (run, index) => (
                    <div
                      key={run.testRunId}
                      className="rounded-xl bg-slate-50 p-4"
                    >

                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                        <div>

                          <p className="font-semibold text-slate-900">
                            Run {index + 1}
                          </p>

                          <p className="text-xs text-slate-500">
                            Test Run #{run.testRunId}
                          </p>

                        </div>

                        <span
                          className={
                            run.result ===
                            "PASS"
                              ? "font-semibold text-emerald-600"
                              : "font-semibold text-red-600"
                          }
                        >
                          {run.result}
                        </span>

                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                        <DetailItem
                          title="Readings"
                          value={run.readings
                            .map(
                              (value) =>
                                value.toFixed(
                                  3
                                )
                            )
                            .join(", ")}
                        />

                        <DetailItem
                          title="Average"
                          value={`${run.average.toFixed(
                            4
                          )} kg`}
                        />

                       <DetailItem
  title="Range"
  value={`${run.range.toFixed(
    4
  )} kg`}
/>

                        <DetailItem
                          title="Status"
                          value={run.result}
                        />

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

            {repeatabilityRuns.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-4 text-sm">

                <span className="font-semibold text-emerald-600">
                  {repeatabilityPassCount}{" "}
                  PASS
                </span>

                <span className="font-semibold text-red-600">
                  {repeatabilityFailCount}{" "}
                  FAIL
                </span>

              </div>
            )}

          </div>

          {/* ------------------------------------------------
              ECCENTRICITY
          ------------------------------------------------ */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="font-semibold text-slate-900">
                  Eccentricity
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Load distribution across five positions.
                </p>

              </div>

              {eccentricitySummary && (
                <span
                  className={
                    eccentricitySummary.result ===
                    "PASS"
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-600"
                      : "rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-600"
                  }
                >
                  {eccentricitySummary.result}
                </span>
              )}

            </div>

            {eccentricitySummary ? (
              <>
                {/* ----------------------------------------
                    ECCENTRICITY SUMMARY
                ---------------------------------------- */}

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <DetailItem
                    title="Positions"
                    value={`${eccentricitySummary.positions.length}`}
                  />

                  <DetailItem
                    title="Reference"
                    value={`${eccentricitySummary.referenceWeight.toFixed(
                      3
                    )} kg`}
                  />

               <DetailItem
  title="Maximum Difference"
  value={`${eccentricitySummary.maximumDifference.toFixed(
    4
  )} kg`}
/>

<DetailItem
  title="MPE"
  value={`±${eccentricitySummary.mpe.toFixed(
    4
  )} kg`}
/>

                </div>

                {/* ----------------------------------------
                    POSITION-WISE RESULTS
                ---------------------------------------- */}

                <div className="mt-6">

                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Position-wise Measurement
                  </h3>

                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">

                    <table className="w-full min-w-[700px] text-sm">

                      <thead className="bg-slate-50">

                        <tr className="border-b border-slate-200">

                          <th className="px-4 py-3 text-left font-semibold text-slate-600">
                            Position
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

                          <th className="px-4 py-3 text-center font-semibold text-slate-600">
                            Result
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {eccentricitySummary.positions.map(
                          (position) => (
                            <tr
                              key={position.position}
                              className="border-b border-slate-100 last:border-b-0"
                            >

                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {position.position}
                              </td>

                              <td className="px-4 py-3 text-right text-slate-700">
                                {position.referenceWeight.toFixed(
                                  3
                                )}{" "}
                                kg
                              </td>

                              <td className="px-4 py-3 text-right font-medium text-slate-900">
                                {position.observedWeight.toFixed(
                                  3
                                )}{" "}
                                kg
                              </td>

                             <td className="px-4 py-3 text-right font-medium text-slate-900">
  {position.error >=
  0
    ? "+"
    : ""}
  {position.error.toFixed(
    3
  )} kg
</td>

                              <td className="px-4 py-3 text-center">

                                <span
                                  className={
                                    position.result ===
                                    "PASS"
                                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600"
                                      : "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                                  }
                                >
                                  {position.result}
                                </span>

                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>

              </>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No completed eccentricity test found
                for the latest completed inspection.
              </p>
            )}

          </div>

          {/* ------------------------------------------------
              DATE-WISE HISTORICAL TREND
          ------------------------------------------------ */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center gap-3">

              <TrendingUp
                size={20}
                className="text-slate-700"
              />

              <div>

                <h2 className="font-semibold text-slate-900">
                  Date-wise Measurement Trend
                </h2>

                <p className="text-sm text-slate-500">
                  Historical absolute measurement error
                  from weighing performance records.
                </p>

              </div>

            </div>

            {data.trend.length === 0 ? (
              <p className="text-sm text-slate-500">
                No dated measurements available.
              </p>
            ) : (
              <div className="space-y-3">

                {data.trend.map(
                  (point, index) => (
                    <div
                      key={`${point.date}-${index}`}
                      className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >

                      <span className="text-sm text-slate-600">
                        {point.date}
                      </span>
<span className="font-semibold text-slate-900">
  Error:{" "}
  {point.error.toFixed(4)} kg
</span>

                      <span
                        className={
                          point.result ===
                          "PASS"
                            ? "font-semibold text-emerald-600"
                            : "font-semibold text-red-600"
                        }
                      >
                        {point.result}
                      </span>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

          {/* ------------------------------------------------
              RECALIBRATION RECOMMENDATION
          ------------------------------------------------ */}

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">

            <div className="flex gap-3">

              <AlertTriangle
                size={21}
                className="mt-0.5 text-indigo-600"
              />

              <div>

                <h2 className="font-semibold text-indigo-900">
                  Recalibration Recommendation
                </h2>

                <p className="mt-1 text-sm text-indigo-800">
                  {data.recalibrationRecommendation}
                </p>

              </div>

            </div>

          </div>

          {/* ------------------------------------------------
              DISCLAIMER
          ------------------------------------------------ */}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">

            <strong>
              Research disclaimer:
            </strong>{" "}

            Health Score, Environment Impact Score and
            Recalibration Prediction are experimental
            research metrics. They do not replace the
            OIML-oriented regulatory PASS/FAIL rule engine.

          </div>

        </>
      )}

    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  status,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  status: string;
  className: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="mb-4 flex items-center gap-3 text-slate-500">

        {icon}

        <span className="text-sm font-medium">
          {title}
        </span>

      </div>

      <div
        className={`text-2xl font-bold ${className}`}
      >
        {value}
      </div>

      <div className="mt-2 text-xs font-semibold uppercase text-slate-400">
        {status}
      </div>

    </div>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

function DetailItem({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-xs font-medium uppercase text-slate-400">
        {title}
      </p>

      <p className="mt-1 font-semibold text-slate-900">
        {value}
      </p>

    </div>
  );
}

