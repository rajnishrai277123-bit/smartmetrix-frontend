import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Gauge,
  Info,
  RefreshCw,
  Scale,
  WifiOff,
  XCircle,
  ArrowDown,
  ArrowUp,
  Clock3,
  Lock,
  Send,
  ShieldCheck,
} from "lucide-react";

import api from "../services/api";
import {
  getOfflineTests,
  deleteOfflineTest,
} from "../offline/offlineStorage";
import type { OfflineTestRecord } from "../offline/offlineStorage";

type TestType =
  | "WEIGHING_PERFORMANCE"
  | "REPEATABILITY"
  | "ECCENTRICITY";

interface Inspection {
  id: number;
  instrumentId: number;
  inspectorId: number;
  status: string;
  overallResult: string;
  createdAt?: string | null;
  completedAt?: string | null;
  completionTime?: string | null;
}

interface Instrument {
  id: number;
  serialNumber: string;
  manufacturer: string;
  model: string;
  instrumentClass: string;
  capacity: number;
  scaleInterval: number;
  minCapacity: number;
  status: string;
}

interface EnvironmentRecord {
  id: number;
  inspectionId: number;
  temperature?: number | null;
  humidity?: number | null;
  vibration?: number | null;
  source?: string | null;
  status?: string | null;
}

interface TestRecord {
  id: number;
  clientRecordId?: string | null;
  inspectionId: number;
  testType: string;
  referenceWeight: number;
  observedWeight: number;
  error: number;
  mpe: number;
  temperature?: number | null;
  humidity?: number | null;
  vibration?: number | null;
  result: string;
  testStage?: string;
  createdAt?: string | null;
}

interface RepeatabilityRecord {
  id: number;
  inspectionId: number;
  testRunId?: number | null;
  referenceWeight: number;
  observedWeight: number;
  readingNumber: number;
  createdAt?: string | null;
}

interface EccentricityRecord {
  id: number;
  inspectionId: number;
  position: string;
  referenceWeight: number;
  observedWeight: number;
  createdAt?: string | null;
}

interface RepeatabilityReading {
  readingNumber: number;
  observedWeight: string;
}

interface EccentricityReading {
  position: string;
  observedWeight: string;
}

interface RepeatabilitySummary {
  testRunId: number;
  inspectionId: number;
  referenceWeight: number;
  readings: number[];
  average: number;
  averageError: number;
  range: number;
  result: string;
}

interface EccentricitySummary {
  inspectionId: number;
  referenceWeight: number;
  positions: Array<{
    position: string;
    observedWeight: number;
    error?: number;
    result?: string;
  }>;
  maximumDifference: number;
  mpe: number;
  result: string;
}

const repeatabilityPositions = [
  "Reading 1",
  "Reading 2",
  "Reading 3",
  "Reading 4",
  "Reading 5",
];

const eccentricityPositions = [
  "LEFT",
  "RIGHT",
  "FRONT",
  "BACK",
  "CENTER",
];

function getResultClass(result: string) {
  if (result === "PASS") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (result === "FAIL") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-slate-50 text-slate-600 border-slate-200";
}

function getStatusClass(status: string) {
  if (status === "IN_PROGRESS") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "COMPLETED") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "SUBMITTED") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  if (status === "APPROVED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status === "CONTROLLER_APPROVED" ||
    status === "FINAL_APPROVED" ||
    status === "CERTIFIED"
  ) {
    return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function isInspectionLocked(status?: string) {
  return !!status && status !== "IN_PROGRESS";
}
function getInspectionCompletionTime(inspection?: Inspection | null) {
  if (!inspection) return null;

  return (
    inspection.completedAt ??
    inspection.completionTime ??
    null
  );
}

function formatDateTime(createdAt?: string | null) {
  if (!createdAt) {
    return "—";
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}



function FormInput({
  label,
  value,
  onChange,
  type = "number",
  placeholder,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p className="mt-1 truncate text-xl font-bold text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function EccentricityPositionCard({
  record,
  referenceWeight,
}: {
  record: EccentricityRecord;
  referenceWeight: number;
}) {
  const observed = Number(record.observedWeight);
  const difference = observed - referenceWeight;

  const differenceText =
    difference > 0
      ? `+${difference.toFixed(3)}`
      : difference.toFixed(3);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Position
          </p>

          <h3 className="mt-1 font-bold text-slate-900">
            {record.position}
          </h3>
        </div>

        <div
          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
            difference > 0
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : difference < 0
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {differenceText}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Reference
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {referenceWeight.toFixed(3)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Observed
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {observed.toFixed(3)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        {difference > 0 ? (
          <ArrowUp size={14} className="text-blue-600" />
        ) : difference < 0 ? (
          <ArrowDown size={14} className="text-amber-600" />
        ) : (
          <CheckCircle2 size={14} className="text-emerald-600" />
        )}

        <span>
          Difference from reference:{" "}
          <strong className="text-slate-700">
            {differenceText}
          </strong>
        </span>
      </div>
    </div>
  );
}

function EccentricityPlatform({
  records,
}: {
  records: EccentricityRecord[];
}) {
  if (records.length === 0) {
    return null;
  }

  const getRecord = (position: string) =>
    records.find(
      (record) =>
        record.position.toUpperCase() === position.toUpperCase()
    );

  const front = getRecord("FRONT");
  const left = getRecord("LEFT");
  const center = getRecord("CENTER");
  const right = getRecord("RIGHT");
  const back = getRecord("BACK");

  function positionValue(
    record: EccentricityRecord | undefined
  ) {
    if (!record) {
      return "--";
    }

    return Number(record.observedWeight).toFixed(3);
  }

  function positionDifference(
    record: EccentricityRecord | undefined
  ) {
    if (!record) {
      return "";
    }

    const difference =
      Number(record.observedWeight) -
      Number(record.referenceWeight);

    if (difference > 0) {
      return `+${difference.toFixed(3)}`;
    }

    return difference.toFixed(3);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
      <div className="mb-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Platform Orientation
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Front → Center → Back
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
          Front
        </div>

        <div className="relative rounded-[2rem] border-4 border-slate-300 bg-white p-4 shadow-inner sm:p-6">
          <div className="flex justify-center">
            <PlatformPoint
              label="FRONT"
              value={positionValue(front)}
              difference={positionDifference(front)}
              record={front}
            />
          </div>

          <div className="my-4 grid grid-cols-3 items-center gap-3 sm:my-6 sm:gap-5">
            <PlatformPoint
              label="LEFT"
              value={positionValue(left)}
              difference={positionDifference(left)}
              record={left}
            />

            <PlatformPoint
              label="CENTER"
              value={positionValue(center)}
              difference={positionDifference(center)}
              record={center}
              center
            />

            <PlatformPoint
              label="RIGHT"
              value={positionValue(right)}
              difference={positionDifference(right)}
              record={right}
            />
          </div>

          <div className="flex justify-center">
            <PlatformPoint
              label="BACK"
              value={positionValue(back)}
              difference={positionDifference(back)}
              record={back}
            />
          </div>
        </div>

        <div className="mt-2 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
          Back
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border border-slate-300 bg-white" />
          <span>Measured position</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span>Reference-aligned</span>
        </div>
      </div>
    </div>
  );
}

function PlatformPoint({
  label,
  value,
  difference,
  record,
  center = false,
}: {
  label: string;
  value: string;
  difference: string;
  record?: EccentricityRecord;
  center?: boolean;
}) {
  if (!record) {
    return (
      <div
        className={`flex min-h-[105px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 ${
          center ? "w-36 sm:w-44" : "w-full max-w-44"
        }`}
      >
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            No reading
          </p>
        </div>
      </div>
    );
  }

  const differenceNumber =
    Number(record.observedWeight) -
    Number(record.referenceWeight);

  const isPositive = differenceNumber > 0;
  const isNegative = differenceNumber < 0;
  const isZero = differenceNumber === 0;

  return (
    <div
      className={`relative flex min-h-[105px] w-full max-w-44 flex-col items-center justify-center rounded-2xl border-2 bg-white p-3 shadow-sm ${
        center
          ? "border-slate-400"
          : "border-slate-300"
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <span className="mt-1 text-xl font-black text-slate-900">
        {value}
      </span>

      <span
        className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
          isPositive
            ? "bg-blue-50 text-blue-700"
            : isNegative
            ? "bg-amber-50 text-amber-700"
            : isZero
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-50 text-slate-500"
        }`}
      >
        {difference}
      </span>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  active,
  completed,
  locked,
  onClick,
}: {
  number: string;
  title: string;
  description: string;
  active: boolean;
  completed: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-md"
          : completed
          ? "border-emerald-200 bg-emerald-50 text-slate-900"
          : locked
          ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
            active
              ? "bg-white text-slate-900"
              : completed
              ? "bg-emerald-600 text-white"
              : locked
              ? "bg-slate-200 text-slate-400"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {completed ? (
            <CheckCircle2 size={18} />
          ) : locked ? (
            <Lock size={16} />
          ) : (
            number
          )}
        </div>

        <div className="min-w-0">
          <p className="font-bold">{title}</p>

          <p
            className={`mt-0.5 text-xs ${
              active
                ? "text-slate-300"
                : locked
                ? "text-slate-400"
                : completed
                ? "text-emerald-700"
                : "text-slate-500"
            }`}
          >
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function Tests() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [testRecords, setTestRecords] = useState<TestRecord[]>([]);
  const [repeatabilityRecords, setRepeatabilityRecords] =
    useState<RepeatabilityRecord[]>([]);
  const [eccentricityRecords, setEccentricityRecords] =
    useState<EccentricityRecord[]>([]);
  const [offlineTests, setOfflineTests] =
    useState<OfflineTestRecord[]>([]);

  const [repeatabilitySummary, setRepeatabilitySummary] =
    useState<RepeatabilitySummary | null>(null);

  const [eccentricitySummary, setEccentricitySummary] =
    useState<EccentricitySummary | null>(null);

  const [selectedInspectionId, setSelectedInspectionId] =
    useState<string>("");

  const [testType, setTestType] =
    useState<TestType>("WEIGHING_PERFORMANCE");

  const [referenceWeight, setReferenceWeight] = useState("");

  const [observedWeight, setObservedWeight] =
    useState("");

  const [temperature, setTemperature] =
    useState("");

  const [humidity, setHumidity] =
    useState("");

  // Keep vibration as the existing default used by the Tests page.
  const [vibration, setVibration] =
    useState("0.1");

  const [repeatabilityReadings, setRepeatabilityReadings] =
    useState<RepeatabilityReading[]>(
      repeatabilityPositions.map((_, index) => ({
        readingNumber: index + 1,
        observedWeight: "",
      }))
    );

  const [eccentricityReadings, setEccentricityReadings] =
    useState<EccentricityReading[]>(
      eccentricityPositions.map((position) => ({
        position,
        observedWeight: "",
      }))
    );

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedInspection = useMemo(() => {
    if (!selectedInspectionId) {
      return null;
    }

    return (
      inspections.find(
        (inspection) =>
          inspection.id === Number(selectedInspectionId)
      ) ?? null
    );
  }, [inspections, selectedInspectionId]);

  const selectedInstrument = useMemo(() => {
    if (!selectedInspection) {
      return null;
    }

    return (
      instruments.find(
        (instrument) =>
          instrument.id === selectedInspection.instrumentId
      ) ?? null
    );
  }, [selectedInspection, instruments]);

  const inspectionTests = useMemo(() => {
    if (!selectedInspection) {
      return [];
    }

    return testRecords.filter(
      (record) =>
        record.inspectionId === selectedInspection.id &&
        record.testType === "WEIGHING_PERFORMANCE"
    );
  }, [testRecords, selectedInspection]);

  const inspectionRepeatability = useMemo(() => {
    if (!selectedInspection) {
      return [];
    }

    return repeatabilityRecords.filter(
      (record) =>
        record.inspectionId === selectedInspection.id
    );
  }, [repeatabilityRecords, selectedInspection]);

  const inspectionEccentricity = useMemo(() => {
    if (!selectedInspection) {
      return [];
    }

    return eccentricityRecords.filter(
      (record) =>
        record.inspectionId === selectedInspection.id
    );
  }, [eccentricityRecords, selectedInspection]);

  const latestWeighingRecord = useMemo(() => {
    if (inspectionTests.length === 0) {
      return null;
    }

    const sorted = [...inspectionTests].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : NaN;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : NaN;

      if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
        return aTime - bTime;
      }

      return a.id - b.id;
    });

    return sorted.length > 0 ? sorted[sorted.length - 1] : null;
  }, [inspectionTests]);

  const existingReferenceWeight = useMemo(() => {
    if (latestWeighingRecord) {
      return Number(latestWeighingRecord.referenceWeight);
    }

    if (inspectionRepeatability.length > 0) {
      return Number(inspectionRepeatability[0].referenceWeight);
    }

    if (inspectionEccentricity.length > 0) {
      return Number(inspectionEccentricity[0].referenceWeight);
    }

    return null;
  }, [
    latestWeighingRecord,
    inspectionRepeatability,
    inspectionEccentricity,
  ]);

  const inspectionLocked = isInspectionLocked(selectedInspection?.status);

  /*
   * =========================================================
   * COMPLETION STATUS
   * =========================================================
   */

  const weighingComplete = useMemo(() => {
    if (!selectedInspection) {
      return false;
    }

    const onlineComplete =
      inspectionTests.length > 0;

    const offlineComplete = offlineTests.some(
      (test) =>
        Number(test.inspectionId) ===
          selectedInspection.id &&
        test.testType === "WEIGHING_PERFORMANCE"
    );

    return onlineComplete || offlineComplete;
  }, [
    selectedInspection,
    inspectionTests,
    offlineTests,
  ]);

  const latestRepeatabilityRunId = useMemo(() => {
    const runIds = inspectionRepeatability
      .map((record) => record.testRunId)
      .filter((id): id is number => id !== null && id !== undefined);

    return runIds.length > 0 ? Math.max(...runIds) : null;
  }, [inspectionRepeatability]);

  const latestRepeatabilityRecords = useMemo(() => {
    if (latestRepeatabilityRunId === null) {
      return [];
    }

    return inspectionRepeatability.filter(
      (record) => Number(record.testRunId) === latestRepeatabilityRunId
    );
  }, [inspectionRepeatability, latestRepeatabilityRunId]);

  const repeatabilityComplete = useMemo(() => {
    if (!selectedInspection || latestRepeatabilityRunId === null) {
      return false;
    }

    const uniqueReadings = new Set(
      latestRepeatabilityRecords
        .filter(
          (record) =>
            record.readingNumber >= 1 &&
            record.readingNumber <= 5
        )
        .map((record) => record.readingNumber)
    );

    return uniqueReadings.size === 5;
  }, [
    selectedInspection,
    latestRepeatabilityRunId,
    latestRepeatabilityRecords,
  ]);

  const eccentricityComplete = useMemo(() => {
    if (!selectedInspection) {
      return false;
    }

    const positions = new Set(
      inspectionEccentricity.map((record) =>
        record.position.toUpperCase()
      )
    );

    return eccentricityPositions.every(
      (position) => positions.has(position)
    );
  }, [
    selectedInspection,
    inspectionEccentricity,
  ]);

  /*
   * =========================================================
   * AUTHORITATIVE RESULTS
   * =========================================================
   */

  const weighingResult = useMemo(() => {
    return latestWeighingRecord?.result ?? "PENDING";
  }, [latestWeighingRecord]);

  const repeatabilityResult = useMemo(() => {
    if (!repeatabilityComplete) {
      return "PENDING";
    }

    return repeatabilitySummary?.result ?? "PENDING";
  }, [
    repeatabilityComplete,
    repeatabilitySummary,
  ]);

  const eccentricityResult = useMemo(() => {
    if (!eccentricityComplete) {
      return "PENDING";
    }

    return eccentricitySummary?.result ?? "PENDING";
  }, [
    eccentricityComplete,
    eccentricitySummary,
  ]);

  const allTestsComplete =
    weighingComplete &&
    repeatabilityComplete &&
    eccentricityComplete;

  /*
   * Backend inspection overall result is authoritative.
   *
   * We use the inspection result directly when available.
   * The fallback calculation is only used before the
   * inspection has been refreshed.
   */
  const overallResult = useMemo(() => {
    if (!selectedInspection) {
      return "PENDING";
    }

    if (selectedInspection.overallResult && selectedInspection.overallResult !== "PENDING") {
      return selectedInspection.overallResult;
    }

    if (!allTestsComplete) {
      return "PENDING";
    }

    if (
      weighingResult === "FAIL" ||
      repeatabilityResult === "FAIL" ||
      eccentricityResult === "FAIL"
    ) {
      return "FAIL";
    }

    if (
      weighingResult === "PASS" &&
      repeatabilityResult === "PASS" &&
      eccentricityResult === "PASS"
    ) {
      return "PASS";
    }

    return "PENDING";
  }, [
    selectedInspection,
    allTestsComplete,
    weighingResult,
    repeatabilityResult,
    eccentricityResult,
  ]);

  /*
   * Automatically select first incomplete stage.
   */
  useEffect(() => {
    if (!selectedInspection) {
      return;
    }

    if (inspectionLocked) {
      setTestType("WEIGHING_PERFORMANCE");
      return;
    }

    if (!weighingComplete) {
      setTestType("WEIGHING_PERFORMANCE");
      return;
    }

    if (!repeatabilityComplete) {
      setTestType("REPEATABILITY");
      return;
    }

    if (!eccentricityComplete) {
      setTestType("ECCENTRICITY");
    }
  }, [
    selectedInspection,
    weighingComplete,
    repeatabilityComplete,
    eccentricityComplete,
    inspectionLocked,
  ]);

  /*
   * =========================================================
   * SUMMARY CALCULATIONS
   * =========================================================
   */

  const repeatabilityAverage = useMemo(() => {
    if (repeatabilitySummary) {
      return Number(
        repeatabilitySummary.average
      );
    }

    if (latestRepeatabilityRecords.length === 0) {
      return 0;
    }

    const total = latestRepeatabilityRecords.reduce(
      (sum, record) =>
        sum + Number(record.observedWeight),
      0
    );

    return Number(
      (
        total /
        latestRepeatabilityRecords.length
      ).toFixed(3)
    );
  }, [
    repeatabilitySummary,
    latestRepeatabilityRecords,
  ]);

  const repeatabilityRange = useMemo(() => {
    if (repeatabilitySummary) {
      return Number(
        repeatabilitySummary.range
      );
    }

    if (latestRepeatabilityRecords.length === 0) {
      return 0;
    }

    const values =
      latestRepeatabilityRecords.map(
        (record) =>
          Number(record.observedWeight)
      );

    return Number(
      (
        Math.max(...values) -
        Math.min(...values)
      ).toFixed(3)
    );
  }, [
    repeatabilitySummary,
    latestRepeatabilityRecords,
  ]);

  const eccentricityMaximumDifference = useMemo(() => {
    if (eccentricitySummary) {
      return Number(
        eccentricitySummary.maximumDifference
      );
    }

    if (inspectionEccentricity.length === 0) {
      return 0;
    }

    const values =
      inspectionEccentricity.map(
        (record) =>
          Number(record.observedWeight)
      );

    return Number(
      (
        Math.max(...values) -
        Math.min(...values)
      ).toFixed(3)
    );
  }, [
    eccentricitySummary,
    inspectionEccentricity,
  ]);

  const eccentricityReference = useMemo(() => {
    if (eccentricitySummary) {
      return Number(
        eccentricitySummary.referenceWeight
      );
    }

    if (inspectionEccentricity.length === 0) {
      return 0;
    }

    return Number(
      inspectionEccentricity[0].referenceWeight
    );
  }, [
    eccentricitySummary,
    inspectionEccentricity,
  ]);

  const eccentricityHighest = useMemo(() => {
    if (inspectionEccentricity.length === 0) {
      return null;
    }

    return [...inspectionEccentricity].sort(
      (a, b) =>
        Number(b.observedWeight) -
        Number(a.observedWeight)
    )[0];
  }, [inspectionEccentricity]);

  const eccentricityLowest = useMemo(() => {
    if (inspectionEccentricity.length === 0) {
      return null;
    }

    return [...inspectionEccentricity].sort(
      (a, b) =>
        Number(a.observedWeight) -
        Number(b.observedWeight)
    )[0];
  }, [inspectionEccentricity]);

  /*
   * =========================================================
   * LOAD DATA
   * =========================================================
   */

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        inspectionsResponse,
        instrumentsResponse,
        testsResponse,
        repeatabilityResponse,
        eccentricityResponse,
      ] = await Promise.all([
        api.get<Inspection[]>("/inspections"),
        api.get<Instrument[]>("/instruments"),
        api.get<TestRecord[]>("/test-records"),
        api.get<RepeatabilityRecord[]>(
          "/repeatability"
        ),
        api.get<EccentricityRecord[]>(
          "/eccentricity"
        ),
      ]);

      setInspections(
        inspectionsResponse.data
      );

      setInstruments(
        instrumentsResponse.data
      );

      setTestRecords(
        testsResponse.data
      );

      setRepeatabilityRecords(
        repeatabilityResponse.data
      );

      setEccentricityRecords(
        eccentricityResponse.data
      );

      try {
        const offline =
          await getOfflineTests();

        setOfflineTests(offline);
      } catch (offlineError) {
        console.error(
          "Unable to load offline tests:",
          offlineError
        );
      }
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to load test data. Please check the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Load backend summaries whenever inspection data
   * changes.
   */
  async function loadInspectionSummaries(
    inspection?: Inspection | null,
    repeatabilityData = repeatabilityRecords,
    eccentricityData = eccentricityRecords
  ) {
    const currentInspection =
      inspection ?? selectedInspection;

    if (!currentInspection) {
      setRepeatabilitySummary(null);
      setEccentricitySummary(null);
      return;
    }

    /*
     * -------------------------------
     * Repeatability summary
     * -------------------------------
     */
    try {
      const records =
        repeatabilityData.filter(
          (record) =>
            record.inspectionId ===
            currentInspection.id
        );

      const latestRun = [...records]
        .filter(
          (record) =>
            record.testRunId !== null &&
            record.testRunId !== undefined
        )
        .sort(
          (a, b) =>
            Number(b.testRunId) -
            Number(a.testRunId)
        )[0];

      if (latestRun?.testRunId) {
        const response =
          await api.get<RepeatabilitySummary>(
            `/repeatability/run/${latestRun.testRunId}/summary`
          );

        setRepeatabilitySummary(
          response.data
        );
      } else {
        setRepeatabilitySummary(null);
      }
    } catch (error) {
      console.error(
        "Unable to load repeatability summary:",
        error
      );

      setRepeatabilitySummary(null);
    }

    /*
     * -------------------------------
     * Eccentricity summary
     * -------------------------------
     */
    try {
      const records =
        eccentricityData.filter(
          (record) =>
            record.inspectionId ===
            currentInspection.id
        );

      if (records.length >= 5) {
        const response =
          await api.get<EccentricitySummary>(
            `/eccentricity/inspection/${currentInspection.id}/summary`
          );

        setEccentricitySummary(
          response.data
        );
      } else {
        setEccentricitySummary(null);
      }
    } catch (error) {
      console.error(
        "Unable to load eccentricity summary:",
        error
      );

      setEccentricitySummary(null);
    }
  }

  async function loadInspectionEnvironment(
    inspectionId: number
  ) {
    // Temperature and humidity always come from the environment
    // captured for the selected inspection.
    setTemperature("");
    setHumidity("");

    if (!inspectionId) {
      return;
    }

    try {
      const response =
        await api.get<EnvironmentRecord[]>(
          `/environment/inspection/${inspectionId}`
        );

      // The backend returns an array of environment records.
      // Use the latest saved record for this inspection.
      const environments = response.data || [];
      const environment = [...environments].sort(
        (a, b) => Number(b.id) - Number(a.id)
      )[0];

      if (!environment) {
        setTemperature("");
        setHumidity("");
        return;
      }

      setTemperature(
        environment.temperature !== null &&
        environment.temperature !== undefined
          ? String(environment.temperature)
          : ""
      );

      setHumidity(
        environment.humidity !== null &&
        environment.humidity !== undefined
          ? String(environment.humidity)
          : ""
      );

    } catch (error) {
      console.error(
        "Unable to load inspection environment:",
        error
      );

      // No saved environment record for this inspection.
      setTemperature("");
      setHumidity("");
      // Do not change the existing vibration default here.
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedInspection) {
      setTemperature("");
      setHumidity("");
      return;
    }

    loadInspectionEnvironment(
      selectedInspection.id
    );
  }, [selectedInspection?.id]);

  useEffect(() => {
    if (!selectedInspection) {
      setRepeatabilitySummary(null);
      setEccentricitySummary(null);
      return;
    }

    loadInspectionSummaries(
      selectedInspection,
      repeatabilityRecords,
      eccentricityRecords
    );
  }, [
    selectedInspection,
    repeatabilityRecords,
    eccentricityRecords,
  ]);

  useEffect(() => {
    if (!selectedInspection) {
      return;
    }

    if (
      existingReferenceWeight !== null &&
      (inspectionLocked || referenceWeight === "")
    ) {
      setReferenceWeight(String(existingReferenceWeight));
    }
  }, [
    selectedInspection,
    existingReferenceWeight,
    inspectionLocked,
    referenceWeight,
  ]);

  function clearMessages() {
    setMessage("");
    setErrorMessage("");
  }

  /*
   * =========================================================
   * INSPECTION CHANGE
   * =========================================================
   */

  function handleInspectionChange(
    inspectionId: string
  ) {
    setSelectedInspectionId(
      inspectionId
    );

    const existingWeighingRecords = testRecords
      .filter(
        (record) =>
          record.inspectionId === Number(inspectionId) &&
          record.testType === "WEIGHING_PERFORMANCE"
      )
      .sort((a, b) => a.id - b.id);

    const existingWeighing = existingWeighingRecords.length > 0
      ? existingWeighingRecords[existingWeighingRecords.length - 1]
      : undefined;

    const existingRepeatability = repeatabilityRecords.find(
      (record) => record.inspectionId === Number(inspectionId)
    );

    const existingEccentricity = eccentricityRecords.find(
      (record) => record.inspectionId === Number(inspectionId)
    );

    const existingReference =
      existingWeighing?.referenceWeight ??
      existingRepeatability?.referenceWeight ??
      existingEccentricity?.referenceWeight;

    setReferenceWeight(
      existingReference !== undefined
        ? String(existingReference)
        : ""
    );

    setObservedWeight("");

    setTemperature("");
    setHumidity("");
    // Keep the existing vibration default/current value unchanged.

    setRepeatabilitySummary(null);
    setEccentricitySummary(null);

    setRepeatabilityReadings(
      repeatabilityPositions.map(
        (_, index) => ({
          readingNumber: index + 1,
          observedWeight: "",
        })
      )
    );

    setEccentricityReadings(
      eccentricityPositions.map(
        (position) => ({
          position,
          observedWeight: "",
        })
      )
    );

    setTestType(
      "WEIGHING_PERFORMANCE"
    );

    clearMessages();
  }

  /*
   * =========================================================
   * TEST TYPE SELECTION
   * =========================================================
   */

  function handleTestTypeChange(
    type: TestType
  ) {
    if (inspectionLocked) {
      setErrorMessage(
        "This inspection is locked. Test data is read-only after completion."
      );
      return;
    }

    if (
      type === "REPEATABILITY" &&
      !weighingComplete
    ) {
      setErrorMessage(
        "Complete Weighing Performance first."
      );
      return;
    }

    if (
      type === "ECCENTRICITY" &&
      !repeatabilityComplete
    ) {
      setErrorMessage(
        "Complete Repeatability first."
      );
      return;
    }

    setTestType(type);
    clearMessages();
  }

  /*
   * =========================================================
   * WEIGHING PERFORMANCE
   * =========================================================
   */

  async function submitWeighingPerformance() {
    if (inspectionLocked) {
      setErrorMessage("This inspection is locked. Test data cannot be changed.");
      return;
    }

    if (!selectedInspection) {
      setErrorMessage(
        "Please select an inspection."
      );
      return;
    }

    if (
      !referenceWeight ||
      !observedWeight
    ) {
      setErrorMessage(
        "Please enter reference weight and observed weight."
      );
      return;
    }

    const reference =
      Number(referenceWeight);

    const observed =
      Number(observedWeight);

    if (
      Number.isNaN(reference) ||
      Number.isNaN(observed)
    ) {
      setErrorMessage(
        "Please enter valid weight values."
      );
      return;
    }

    if (
      reference <= 0 ||
      observed < 0
    ) {
      setErrorMessage(
        "Please enter valid positive weight values."
      );
      return;
    }

    const clientRecordId =
      typeof crypto !== "undefined" &&
      crypto.randomUUID
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random()}`;

    const record = {
      clientRecordId,
      inspectionId:
        selectedInspection.id,
      testType:
        "WEIGHING_PERFORMANCE",
      referenceWeight: reference,
      observedWeight: observed,
      temperature:
        temperature.trim() === ""
          ? null
          : Number(temperature),
      humidity:
        humidity.trim() === ""
          ? null
          : Number(humidity),
      vibration:
        vibration.trim() === ""
          ? null
          : Number(vibration),
    };

    try {
      setSubmitting(true);
      clearMessages();

      if (!navigator.onLine) {
        const offlineRecord =
          record as OfflineTestRecord;

        const existing =
          await getOfflineTests();

        const updated = [
          ...existing,
          offlineRecord,
        ];

        localStorage.setItem(
          "smartmetrix_offline_tests",
          JSON.stringify(updated)
        );

        setOfflineTests(updated);

        setMessage(
          "Weighing performance test saved offline. You can continue with the next test."
        );

        setObservedWeight("");

        setTestType(
          "REPEATABILITY"
        );

        return;
      }

      await api.post(
        "/sync/test-records",
        {
          records: [record],
        }
      );

      setMessage(
        "Weighing performance test saved successfully. Repeatability is now unlocked."
      );

      setObservedWeight("");

      await loadData();

      setTestType(
        "REPEATABILITY"
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to save the weighing performance test."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * =========================================================
   * REPEATABILITY
   * =========================================================
   */

  async function submitRepeatability() {
  if (inspectionLocked) {
    setErrorMessage("This inspection is locked. Test data cannot be changed.");
    return;
  }

  if (!selectedInspection) {
    setErrorMessage(
      "Please select an inspection."
    );
    return;
  }

  if (!weighingComplete) {
    setErrorMessage(
      "Please complete Weighing Performance first."
    );
    return;
  }

  if (!referenceWeight) {
    setErrorMessage(
      "Please enter the common reference weight."
    );
    return;
  }

  const reference =
    Number(referenceWeight);

  if (
    Number.isNaN(reference) ||
    reference <= 0
  ) {
    setErrorMessage(
      "Please enter a valid reference weight."
    );
    return;
  }

  const emptyReading =
    repeatabilityReadings.find(
      (reading) =>
        reading.observedWeight.trim() === ""
    );

  if (emptyReading) {
    setErrorMessage(
      "Please enter all 5 repeatability readings."
    );
    return;
  }

  const invalidReading =
    repeatabilityReadings.find(
      (reading) => {
        const value =
          Number(reading.observedWeight);

        return (
          Number.isNaN(value) ||
          value < 0
        );
      }
    );

  if (invalidReading) {
    setErrorMessage(
      "Please enter valid repeatability readings."
    );
    return;
  }

  try {
    setSubmitting(true);
    clearMessages();

    // One testRunId for all 5 readings
    const testRunId = Date.now();

    for (
      const reading of repeatabilityReadings
    ) {
      await api.post(
        "/repeatability",
        {
          inspectionId:
            selectedInspection.id,

          testRunId:
            testRunId,

          referenceWeight:
            reference,

          observedWeight:
            Number(
              reading.observedWeight
            ),

          readingNumber:
            reading.readingNumber,
        }
      );
    }

    setMessage(
      "Repeatability test saved successfully. Eccentricity is now unlocked."
    );

    setRepeatabilityReadings(
      repeatabilityPositions.map(
        (_, index) => ({
          readingNumber:
            index + 1,
          observedWeight: "",
        })
      )
    );

    await loadData();

    setTestType(
      "ECCENTRICITY"
    );
  } catch (error: any) {
    console.error(
      "Repeatability save error:",
      error
    );

    console.error(
      "Backend response:",
      error?.response?.data
    );

    setErrorMessage(
      error?.response?.data?.message ??
        "Unable to save the repeatability test."
    );
  } finally {
    setSubmitting(false);
  }
}
  /*
   * =========================================================
   * ECCENTRICITY
   * =========================================================
   */

  async function submitEccentricity() {
    if (inspectionLocked) {
      setErrorMessage("This inspection is locked. Test data cannot be changed.");
      return;
    }

    if (!selectedInspection) {
      setErrorMessage(
        "Please select an inspection."
      );
      return;
    }

    if (!repeatabilityComplete) {
      setErrorMessage(
        "Please complete Repeatability first."
      );
      return;
    }

    if (!referenceWeight) {
      setErrorMessage(
        "Please enter the common reference weight."
      );
      return;
    }

    const reference =
      Number(referenceWeight);

    if (
      Number.isNaN(reference) ||
      reference <= 0
    ) {
      setErrorMessage(
        "Please enter a valid reference weight."
      );
      return;
    }

    const emptyReading =
      eccentricityReadings.find(
        (reading) =>
          reading.observedWeight.trim() === ""
      );

    if (emptyReading) {
      setErrorMessage(
        "Please enter observed weight for all 5 positions."
      );
      return;
    }

    const invalidReading =
      eccentricityReadings.find(
        (reading) => {
          const value =
            Number(
              reading.observedWeight
            );

          return (
            Number.isNaN(value) ||
            value < 0
          );
        }
      );

    if (invalidReading) {
      setErrorMessage(
        "Please enter valid eccentricity readings."
      );
      return;
    }

    try {
      setSubmitting(true);
      clearMessages();

      for (
        const reading of eccentricityReadings
      ) {
        await api.post(
          "/eccentricity",
          {
            inspectionId:
              selectedInspection.id,

            position:
              reading.position,

            referenceWeight:
              reference,

            observedWeight:
              Number(
                reading.observedWeight
              ),
          }
        );
      }

      setMessage(
        "Eccentricity test saved successfully. All three test stages are now complete."
      );

      setEccentricityReadings(
        eccentricityPositions.map(
          (position) => ({
            position,
            observedWeight: "",
          })
        )
      );

      await loadData();

      setTestType(
        "ECCENTRICITY"
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to save the eccentricity test."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (
      testType ===
      "WEIGHING_PERFORMANCE"
    ) {
      await submitWeighingPerformance();
      return;
    }

    if (
      testType ===
      "REPEATABILITY"
    ) {
      await submitRepeatability();
      return;
    }

    await submitEccentricity();
  }

  /*
   * =========================================================
   * INSPECTION WORKFLOW
   * =========================================================
   */

  async function handleCompleteInspection() {
    if (!selectedInspection) {
      setErrorMessage(
        "Please select an inspection."
      );
      return;
    }

    if (!allTestsComplete) {
      setErrorMessage(
        "Complete all three tests before completing the inspection."
      );
      return;
    }

    if (overallResult === "PENDING") {
      setErrorMessage(
        "The overall inspection result is still pending."
      );
      return;
    }

    try {
      setWorkflowLoading(true);
      clearMessages();

      const response =
        await api.post<Inspection>(
          `/inspections/${selectedInspection.id}/complete`
        );

      setInspections((previous) =>
        previous.map((inspection) =>
          inspection.id === response.data.id
            ? response.data
            : inspection
        )
      );

      setMessage(
        "Inspection completed successfully."
      );

      await loadData();
    } catch (error: any) {
      console.error(error);

      setErrorMessage(
        error?.response?.data?.message ??
          "Unable to complete the inspection."
      );
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function handleSubmitInspection() {
    if (!selectedInspection) {
      setErrorMessage(
        "Please select an inspection."
      );
      return;
    }

    if (
      selectedInspection.status !==
      "COMPLETED"
    ) {
      setErrorMessage(
        "Inspection must be COMPLETED before submission."
      );
      return;
    }

    try {
      setWorkflowLoading(true);
      clearMessages();

      const response =
        await api.post<Inspection>(
          `/inspections/${selectedInspection.id}/submit`
        );

      setInspections((previous) =>
        previous.map((inspection) =>
          inspection.id === response.data.id
            ? response.data
            : inspection
        )
      );

      setMessage(
        "Inspection submitted successfully for Senior Officer approval."
      );

      await loadData();
    } catch (error: any) {
      console.error(error);

      setErrorMessage(
        error?.response?.data?.message ??
          "Unable to submit the inspection."
      );
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function handleSeniorApproval() {
    if (!selectedInspection) {
      setErrorMessage(
        "Please select an inspection."
      );
      return;
    }

    if (
      selectedInspection.status !==
      "SUBMITTED"
    ) {
      setErrorMessage(
        "Only SUBMITTED inspections can be approved by the Senior Officer."
      );
      return;
    }

    try {
      setWorkflowLoading(true);
      clearMessages();

      const response =
        await api.post<Inspection>(
          `/inspections/${selectedInspection.id}/approve`
        );

      setInspections((previous) =>
        previous.map((inspection) =>
          inspection.id === response.data.id
            ? response.data
            : inspection
        )
      );

      setMessage(
        "Inspection approved by Senior Officer."
      );

      await loadData();
    } catch (error: any) {
      console.error(error);

      setErrorMessage(
        error?.response?.data?.message ??
          "Unable to approve the inspection."
      );
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function handleControllerApproval() {
    if (!selectedInspection) {
      setErrorMessage(
        "Please select an inspection."
      );
      return;
    }

    if (
      selectedInspection.status !==
      "APPROVED"
    ) {
      setErrorMessage(
        "Only Senior Officer approved inspections can be sent for Controller approval."
      );
      return;
    }

    try {
      setWorkflowLoading(true);
      clearMessages();

      const response =
        await api.post<Inspection>(
          `/inspections/${selectedInspection.id}/controller-approve`
        );

      setInspections((previous) =>
        previous.map((inspection) =>
          inspection.id === response.data.id
            ? response.data
            : inspection
        )
      );

      setMessage(
        "Inspection approved by Controller successfully."
      );

      await loadData();
    } catch (error: any) {
      console.error(error);

      setErrorMessage(
        error?.response?.data?.message ??
          "Unable to approve the inspection by Controller."
      );
    } finally {
      setWorkflowLoading(false);
    }
  }

  /*
   * =========================================================
   * OFFLINE
   * =========================================================
   */

  async function handleDeleteOfflineTest(
    clientRecordId: string
  ) {
    try {
      await deleteOfflineTest(
        clientRecordId
      );

      const updated =
        await getOfflineTests();

      setOfflineTests(updated);

      setMessage(
        "Offline test removed."
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to remove offline test."
      );
    }
  }

  async function handleSyncOfflineTests() {
    if (!navigator.onLine) {
      setErrorMessage(
        "Internet connection is not available."
      );
      return;
    }

    if (offlineTests.length === 0) {
      setMessage(
        "There are no offline tests to sync."
      );
      return;
    }

    try {
      setSubmitting(true);
      clearMessages();

      let syncedCount = 0;

      for (
        const test of offlineTests
      ) {
        try {
          await api.post(
            "/sync/test-records",
            {
              records: [test],
            }
          );

          await deleteOfflineTest(
            test.clientRecordId
          );

          syncedCount++;
        } catch (error) {
          console.error(
            `Failed to sync ${test.clientRecordId}`,
            error
          );
        }
      }

      const remaining =
        await getOfflineTests();

      setOfflineTests(
        remaining
      );

      setMessage(
        `${syncedCount} offline test(s) synchronized successfully.`
      );

      await loadData();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Unable to synchronize offline tests."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateRepeatabilityReading(
    index: number,
    value: string
  ) {
    setRepeatabilityReadings(
      (previous) =>
        previous.map(
          (
            reading,
            readingIndex
          ) =>
            readingIndex === index
              ? {
                  ...reading,
                  observedWeight:
                    value,
                }
              : reading
        )
    );
  }

  function updateEccentricityReading(
    index: number,
    value: string
  ) {
    setEccentricityReadings(
      (previous) =>
        previous.map(
          (
            reading,
            readingIndex
          ) =>
            readingIndex === index
              ? {
                  ...reading,
                  observedWeight:
                    value,
                }
              : reading
        )
    );
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-sm">
              <ClipboardCheck size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Inspection Tests
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Perform weighing performance,
                repeatability and eccentricity tests.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <XCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>{errorMessage}</span>
        </div>
      )}

      {/* =====================================================
          STEP 1 - SELECT INSPECTION
          ===================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
            <ClipboardCheck size={19} />
          </div>

          <div>
            <h2 className="font-bold text-slate-900">
              Select Inspection
            </h2>

            <p className="text-xs text-slate-500">
              Select an inspection to perform or review its tests.
              Completed and approved inspections are read-only.
            </p>
          </div>
        </div>

        <select
          value={selectedInspectionId}
          onChange={(e) =>
            handleInspectionChange(
              e.target.value
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        >
          <option value="">
            Select an inspection
          </option>

          {inspections.map(
            (inspection) => (
              <option
                key={inspection.id}
                value={inspection.id}
              >
                Inspection #{inspection.id} — Instrument #{inspection.instrumentId} — {inspection.status}
                {inspection.status !== "IN_PROGRESS" ? " — READ-ONLY" : ""}
              </option>
            )
          )}
        </select>

        {selectedInspection &&
          selectedInstrument && (
            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Serial Number"
                value={
                  selectedInstrument.serialNumber
                }
                icon={
                  <Scale size={18} />
                }
              />

              <SummaryCard
                label="Model"
                value={
                  selectedInstrument.model
                }
                icon={
                  <Gauge size={18} />
                }
              />

              <SummaryCard
                label="Class"
                value={
                  selectedInstrument.instrumentClass
                }
                icon={
                  <FlaskConical
                    size={18}
                  />
                }
              />

              <SummaryCard
                label="Scale Interval"
                value={
                  selectedInstrument.scaleInterval
                }
                icon={
                  <Scale size={18} />
                }
              />
            </div>
          )}
      </section>

      {/* =====================================================
          COMMON REFERENCE WEIGHT
          ===================================================== */}
      {selectedInspection && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5 text-white">
              <Scale size={19} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Common Reference Weight
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Enter this once. The same reference
                weight is reused automatically for
                Weighing Performance, Repeatability
                and Eccentricity.
              </p>
            </div>
          </div>

          <div className="max-w-md">
            {inspectionLocked ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recorded Reference Weight
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {referenceWeight ? `${Number(referenceWeight).toFixed(3)} kg` : "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Loaded from the saved inspection test records.
                </p>
              </div>
            ) : (
              <FormInput
                label="Reference Weight"
                value={referenceWeight}
                onChange={setReferenceWeight}
                placeholder="e.g. 10"
                step="0.001"
              />
            )}
          </div>

          {referenceWeight && (
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              Common reference:
              <strong className="ml-1">
                {Number(referenceWeight).toFixed(3)} kg
              </strong>
            </div>
          )}
        </section>
      )}

      {/* =====================================================
          STEP 2 - SEQUENTIAL TEST FLOW
          ===================================================== */}
      {selectedInspection && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="font-bold text-slate-900">
              Test Progress
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Complete each stage in sequence.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <StepCard
              number="1"
              title="Weighing Performance"
              description={
                weighingComplete
                  ? "Completed"
                  : "First test"
              }
              active={
                testType ===
                "WEIGHING_PERFORMANCE"
              }
              completed={
                weighingComplete
              }
              locked={inspectionLocked}
              onClick={() =>
                handleTestTypeChange(
                  "WEIGHING_PERFORMANCE"
                )
              }
            />

            <StepCard
              number="2"
              title="Repeatability"
              description={
                repeatabilityComplete
                  ? `Completed — ${repeatabilityResult}`
                  : weighingComplete
                  ? "Unlocked"
                  : "Complete Step 1 first"
              }
              active={
                testType ===
                "REPEATABILITY"
              }
              completed={
                repeatabilityComplete
              }
              locked={
                inspectionLocked || !weighingComplete
              }
              onClick={() =>
                handleTestTypeChange(
                  "REPEATABILITY"
                )
              }
            />

            <StepCard
              number="3"
              title="Eccentricity"
              description={
                eccentricityComplete
                  ? `Completed — ${eccentricityResult}`
                  : repeatabilityComplete
                  ? "Unlocked"
                  : "Complete Step 2 first"
              }
              active={
                testType ===
                "ECCENTRICITY"
              }
              completed={
                eccentricityComplete
              }
              locked={
                inspectionLocked || !repeatabilityComplete
              }
              onClick={() =>
                handleTestTypeChange(
                  "ECCENTRICITY"
                )
              }
            />
          </div>
        </section>
      )}

      {/* =====================================================
          CURRENT TEST FORM
          ===================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">
              {testType ===
                "WEIGHING_PERFORMANCE" &&
                (inspectionLocked
                  ? "Weighing Performance — Read-only"
                  : "Step 1 — Weighing Performance")}

              {testType ===
                "REPEATABILITY" &&
                (inspectionLocked
                  ? "Repeatability — Read-only"
                  : "Step 2 — Repeatability")}

              {testType ===
                "ECCENTRICITY" &&
                (inspectionLocked
                  ? "Eccentricity — Read-only"
                  : "Step 3 — Eccentricity")}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {inspectionLocked
                ? "This inspection is locked. Saved test data can be reviewed below, but cannot be changed."
                : "Only the current test stage is active."}
            </p>
          </div>

          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
            {testType}
          </span>
        </div>

        {!selectedInspection && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Please select an inspection first.
          </div>
        )}

        {/* WEIGHING PERFORMANCE */}
        {selectedInspection &&
          !inspectionLocked &&
          testType ===
            "WEIGHING_PERFORMANCE" && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                    Common Reference
                  </p>

                  <p className="mt-1 text-xl font-bold text-blue-900">
                    {referenceWeight
                      ? Number(
                          referenceWeight
                        ).toFixed(3)
                      : "Not entered"}
                  </p>
                </div>

                <FormInput
                  label="Observed Weight"
                  value={
                    observedWeight
                  }
                  onChange={
                    setObservedWeight
                  }
                  placeholder="e.g. 10.01"
                  step="0.001"
                />
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="mb-4 flex items-center gap-2">
                  <Info
                    size={16}
                    className="text-slate-500"
                  />

                  <p className="text-sm font-semibold text-slate-700">
                    Environmental Conditions
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <FormInput
                    label="Temperature (°C)"
                    value={
                      temperature
                    }
                    onChange={
                      setTemperature
                    }
                    step="0.1"
                  />

                  <FormInput
                    label="Humidity (%)"
                    value={
                      humidity
                    }
                    onChange={
                      setHumidity
                    }
                    step="0.1"
                  />

                  <FormInput
                    label="Vibration"
                    value={
                      vibration
                    }
                    onChange={
                      setVibration
                    }
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          )}

        {/* REPEATABILITY */}
        {selectedInspection &&
          !inspectionLocked &&
          testType ===
            "REPEATABILITY" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                  Common Reference Weight
                </p>

                <p className="mt-1 text-xl font-bold text-blue-900">
                  {referenceWeight
                    ? Number(
                        referenceWeight
                      ).toFixed(3)
                    : "Not entered"}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {repeatabilityReadings.map(
                  (
                    reading,
                    index
                  ) => (
                    <FormInput
                      key={
                        reading.readingNumber
                      }
                      label={`Reading ${reading.readingNumber}`}
                      value={
                        reading.observedWeight
                      }
                      onChange={(
                        value
                      ) =>
                        updateRepeatabilityReading(
                          index,
                          value
                        )
                      }
                      placeholder="Observed weight"
                      step="0.001"
                    />
                  )
                )}
              </div>
            </div>
          )}

        {/* ECCENTRICITY */}
        {selectedInspection &&
          !inspectionLocked &&
          testType ===
            "ECCENTRICITY" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                  Common Reference Weight
                </p>

                <p className="mt-1 text-xl font-bold text-blue-900">
                  {referenceWeight
                    ? Number(
                        referenceWeight
                      ).toFixed(3)
                    : "Not entered"}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {eccentricityReadings.map(
                  (
                    reading,
                    index
                  ) => (
                    <FormInput
                      key={
                        reading.position
                      }
                      label={
                        reading.position
                      }
                      value={
                        reading.observedWeight
                      }
                      onChange={(
                        value
                      ) =>
                        updateEccentricityReading(
                          index,
                          value
                        )
                      }
                      placeholder="Observed weight"
                      step="0.001"
                    />
                  )
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Platform Positions
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  FRONT, LEFT, CENTER, RIGHT and BACK
                  are the backend-supported eccentricity
                  positions.
                </p>
              </div>
            </div>
          )}

        {selectedInspection && inspectionLocked && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <Lock size={18} className="mt-0.5 shrink-0 text-emerald-700" />
              <div>
                <p className="font-bold text-emerald-900">Inspection is read-only</p>
                <p className="mt-1 text-sm leading-6 text-emerald-700">
                  This inspection has already moved beyond In Progress. Test inputs are locked to protect the inspection history.
                </p>
              </div>
            </div>
          </div>
        )}

        {!inspectionLocked && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              !selectedInspection ||
              !referenceWeight
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw
                  size={16}
                  className="animate-spin"
                />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2
                  size={16}
                />
                Save & Continue
              </>
            )}
          </button>
        </div>
        )}
      </section>

      {/* =====================================================
          OVERALL SUMMARY + WORKFLOW
          ===================================================== */}
      {selectedInspection && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Inspection Test Summary
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                All three required test stages.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${getResultClass(
                  overallResult
                )}`}
              >
                {overallResult ===
                "PASS" ? (
                  <CheckCircle2
                    size={16}
                  />
                ) : overallResult ===
                  "FAIL" ? (
                  <XCircle
                    size={16}
                  />
                ) : (
                  <Info
                    size={16}
                  />
                )}

                Overall:{" "}
                {overallResult}
              </span>

              <span
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-bold ${getStatusClass(
                  selectedInspection.status
                )}`}
              >
                {selectedInspection.status}
              </span>
            </div>
          </div>

          {getInspectionCompletionTime(selectedInspection) && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <Clock3 size={16} className="shrink-0" />
              <span>
                Inspection completed at <strong>{formatDateTime(getInspectionCompletionTime(selectedInspection))}</strong>.
              </span>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            {/* Weighing */}
            <div
              className={`rounded-2xl border p-4 ${
                weighingComplete
                  ? weighingResult ===
                    "PASS"
                    ? "border-emerald-200 bg-emerald-50"
                    : weighingResult ===
                      "FAIL"
                    ? "border-red-200 bg-red-50"
                    : "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900">
                  1. Weighing Performance
                </p>

                {weighingComplete ? (
                  weighingResult ===
                  "PASS" ? (
                    <CheckCircle2
                      size={18}
                      className="text-emerald-600"
                    />
                  ) : weighingResult ===
                    "FAIL" ? (
                    <XCircle
                      size={18}
                      className="text-red-600"
                    />
                  ) : (
                    <Info
                      size={18}
                      className="text-amber-600"
                    />
                  )
                ) : (
                  <Lock
                    size={17}
                    className="text-slate-400"
                  />
                )}
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Status:{" "}
                <strong>
                  {weighingComplete
                    ? weighingResult
                    : "PENDING"}
                </strong>
              </p>
            </div>

            {/* Repeatability */}
            <div
              className={`rounded-2xl border p-4 ${
                repeatabilityComplete
                  ? repeatabilityResult ===
                    "PASS"
                    ? "border-emerald-200 bg-emerald-50"
                    : repeatabilityResult ===
                      "FAIL"
                    ? "border-red-200 bg-red-50"
                    : "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900">
                  2. Repeatability
                </p>

                {repeatabilityComplete ? (
                  repeatabilityResult ===
                  "PASS" ? (
                    <CheckCircle2
                      size={18}
                      className="text-emerald-600"
                    />
                  ) : repeatabilityResult ===
                    "FAIL" ? (
                    <XCircle
                      size={18}
                      className="text-red-600"
                    />
                  ) : (
                    <Info
                      size={18}
                      className="text-amber-600"
                    />
                  )
                ) : (
                  <Lock
                    size={17}
                    className="text-slate-400"
                  />
                )}
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Status:{" "}
                <strong>
                  {repeatabilityComplete
                    ? repeatabilityResult
                    : "PENDING"}
                </strong>
              </p>

              {repeatabilitySummary && (
                <p className="mt-1 text-xs text-slate-500">
                  Range:{" "}
                  <strong>
                    {Number(
                      repeatabilitySummary.range
                    ).toFixed(3)}
                  </strong>
                </p>
              )}
            </div>

            {/* Eccentricity */}
            <div
              className={`rounded-2xl border p-4 ${
                eccentricityComplete
                  ? eccentricityResult ===
                    "PASS"
                    ? "border-emerald-200 bg-emerald-50"
                    : eccentricityResult ===
                      "FAIL"
                    ? "border-red-200 bg-red-50"
                    : "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900">
                  3. Eccentricity
                </p>

                {eccentricityComplete ? (
                  eccentricityResult ===
                  "PASS" ? (
                    <CheckCircle2
                      size={18}
                      className="text-emerald-600"
                    />
                  ) : eccentricityResult ===
                    "FAIL" ? (
                    <XCircle
                      size={18}
                      className="text-red-600"
                    />
                  ) : (
                    <Info
                      size={18}
                      className="text-amber-600"
                    />
                  )
                ) : (
                  <Lock
                    size={17}
                    className="text-slate-400"
                  />
                )}
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Status:{" "}
                <strong>
                  {eccentricityComplete
                    ? eccentricityResult
                    : "PENDING"}
                </strong>
              </p>

              {eccentricitySummary && (
                <p className="mt-1 text-xs text-slate-500">
                  Max Difference:{" "}
                  <strong>
                    {Number(
                      eccentricitySummary.maximumDifference
                    ).toFixed(3)}
                  </strong>
                </p>
              )}
            </div>
          </div>


          {/* Detailed result + timestamp for every completed test stage */}
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {/* Weighing Performance detail */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-900">
                  Weighing Performance
                </h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    weighingResult === "PASS"
                      ? "bg-emerald-100 text-emerald-700"
                      : weighingResult === "FAIL"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {weighingComplete ? weighingResult : "PENDING"}
                </span>
              </div>

              {latestWeighingRecord ? (
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>
                    Reference: <strong className="text-slate-700">{Number(latestWeighingRecord.referenceWeight).toFixed(3)}</strong>
                  </p>
                  <p>
                    Observed: <strong className="text-slate-700">{Number(latestWeighingRecord.observedWeight).toFixed(3)}</strong>
                  </p>
                  <p>
                    Error: <strong className="text-slate-700">{Number(latestWeighingRecord.error).toFixed(5)}</strong>
                  </p>
                  <p>
                    Time: <strong className="text-slate-700">{formatDateTime(latestWeighingRecord.createdAt)}</strong>
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">No weighing performance record yet.</p>
              )}
            </div>

            {/* Eccentricity detail */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-900">
                  Eccentricity
                </h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    eccentricityResult === "PASS"
                      ? "bg-emerald-100 text-emerald-700"
                      : eccentricityResult === "FAIL"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {eccentricityComplete ? eccentricityResult : "PENDING"}
                </span>
              </div>

              {inspectionEccentricity.length > 0 ? (
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>
                    Max Difference: <strong className="text-slate-700">{eccentricitySummary ? Number(eccentricitySummary.maximumDifference).toFixed(3) : "—"}</strong>
                  </p>
                  <p>
                    Positions: <strong className="text-slate-700">{inspectionEccentricity.length}</strong>
                  </p>
                  <p>
                    Time: <strong className="text-slate-700">{formatDateTime(
                      [...inspectionEccentricity].sort((a, b) => Number(a.id) - Number(b.id))[inspectionEccentricity.length - 1]?.createdAt
                    )}</strong>
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">No eccentricity record yet.</p>
              )}
            </div>

            {/* Repeatability detail */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-900">
                  Repeatability
                </h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    repeatabilityResult === "PASS"
                      ? "bg-emerald-100 text-emerald-700"
                      : repeatabilityResult === "FAIL"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {repeatabilityComplete ? repeatabilityResult : "PENDING"}
                </span>
              </div>

              {latestRepeatabilityRecords.length > 0 ? (
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>
                    Readings: <strong className="text-slate-700">{latestRepeatabilityRecords.length}</strong>
                  </p>
                  <p>
                    Range: <strong className="text-slate-700">{repeatabilitySummary ? Number(repeatabilitySummary.range).toFixed(3) : "—"}</strong>
                  </p>
                  <p>
                    Time: <strong className="text-slate-700">{formatDateTime(
                      [...latestRepeatabilityRecords].sort((a, b) => Number(a.id) - Number(b.id))[latestRepeatabilityRecords.length - 1]?.createdAt
                    )}</strong>
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">No repeatability record yet.</p>
              )}
            </div>
          </div>

          {!allTestsComplete && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Complete all three required test stages
              before the inspection can be completed.
            </div>
          )}

          {allTestsComplete && (
            <div
              className={`mt-5 rounded-xl border p-4 text-sm ${
                overallResult ===
                "PASS"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : overallResult ===
                    "FAIL"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {overallResult ===
              "PASS"
                ? "All three required test stages are complete and the backend has evaluated the inspection as PASS."
                : overallResult ===
                  "FAIL"
                ? "At least one required test has failed. The backend has evaluated the inspection as FAIL."
                : "All stages are recorded, but the final result is still pending."}
            </div>
          )}

          {/* =================================================
              INSPECTION WORKFLOW
              ================================================= */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-900 p-2.5 text-white">
                <ShieldCheck size={19} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  Inspection Workflow
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Inspection moves through completion,
                  submission and approval stages.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {/* Stage 1 */}
              <div
                className={`rounded-xl border p-4 ${
                  selectedInspection.status ===
                    "IN_PROGRESS"
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Stage 1
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  In Progress
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Inspector performs all tests.
                </p>
              </div>

              {/* Stage 2 */}
              <div
                className={`rounded-xl border p-4 ${
                  selectedInspection.status ===
                    "COMPLETED"
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Stage 2
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  Completed
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Inspector completes the inspection.
                </p>
              </div>

              {/* Stage 3 */}
              <div
                className={`rounded-xl border p-4 ${
                  selectedInspection.status ===
                    "SUBMITTED"
                    ? "border-purple-300 bg-purple-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Stage 3
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  Submitted
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Waiting for Senior Officer approval.
                </p>
              </div>

              {/* Stage 4 */}
              <div
                className={`rounded-xl border p-4 ${
                  selectedInspection.status ===
                    "APPROVED"
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Stage 4
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  Senior Approved
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Senior Officer has approved the inspection.
                </p>
              </div>

              {/* Stage 5 */}
              <div
                className={`rounded-xl border p-4 ${
                  selectedInspection.status ===
                    "CONTROLLER_APPROVED" ||
                  selectedInspection.status ===
                    "FINAL_APPROVED" ||
                  selectedInspection.status ===
                    "CERTIFIED"
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Stage 5
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  Controller Approved
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Final controller approval.
                </p>
              </div>
            </div>

            {/* Workflow actions */}
            <div className="mt-5 flex flex-wrap gap-3">
              {selectedInspection.status ===
                "IN_PROGRESS" && (
                <button
                  type="button"
                  onClick={
                    handleCompleteInspection
                  }
                  disabled={
                    workflowLoading ||
                    !allTestsComplete ||
                    overallResult ===
                      "PENDING"
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {workflowLoading ? (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckCircle2
                      size={16}
                    />
                  )}

                  Complete Inspection
                </button>
              )}

              {selectedInspection.status ===
                "COMPLETED" && (
                <button
                  type="button"
                  onClick={
                    handleSubmitInspection
                  }
                  disabled={
                    workflowLoading
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {workflowLoading ? (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Send
                      size={16}
                    />
                  )}

                  Submit for Senior Approval
                </button>
              )}

              {selectedInspection.status ===
                "SUBMITTED" && (
                <button
                  type="button"
                  onClick={
                    handleSeniorApproval
                  }
                  disabled={
                    workflowLoading
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-300 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {workflowLoading ? (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <ShieldCheck
                      size={16}
                    />
                  )}

                  Senior Approve
                </button>
              )}

              {selectedInspection.status ===
                "APPROVED" && (
                <button
                  type="button"
                  onClick={
                    handleControllerApproval
                  }
                  disabled={
                    workflowLoading
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {workflowLoading ? (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <ShieldCheck
                      size={16}
                    />
                  )}

                  Controller Approve
                </button>
              )}

              {(
                selectedInspection.status ===
                  "CONTROLLER_APPROVED" ||
                selectedInspection.status ===
                  "FINAL_APPROVED" ||
                selectedInspection.status ===
                  "CERTIFIED"
              ) && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">
                  <CheckCircle2
                    size={17}
                  />

                  Inspection Fully Approved
                </div>
              )}
            </div>

            {/* Helpful status message */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              {selectedInspection.status ===
                "IN_PROGRESS" && (
                <p className="text-sm text-slate-600">
                  Complete all three tests. Then the
                  <strong className="mx-1">
                    Complete Inspection
                  </strong>
                  action will become available.
                </p>
              )}

              {selectedInspection.status ===
                "COMPLETED" && (
                <p className="text-sm text-slate-600">
                  The inspection is completed. Submit it
                  to move it to the Senior Officer approval
                  stage.
                </p>
              )}

              {selectedInspection.status ===
                "SUBMITTED" && (
                <p className="text-sm text-purple-700">
                  The inspection has been submitted and is
                  waiting for Senior Officer approval.
                </p>
              )}

              {selectedInspection.status ===
                "APPROVED" && (
                <p className="text-sm text-emerald-700">
                  Senior Officer approval is complete.
                  The inspection is ready for Controller
                  approval.
                </p>
              )}

              {(
                selectedInspection.status ===
                  "CONTROLLER_APPROVED" ||
                selectedInspection.status ===
                  "FINAL_APPROVED" ||
                selectedInspection.status ===
                  "CERTIFIED"
              ) && (
                <p className="text-sm font-semibold text-emerald-700">
                  The inspection has completed the approval
                  workflow.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          OIML RESULT EXPLANATION
          ===================================================== */}
      {selectedInspection && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5 text-white">
              <ClipboardCheck size={19} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                OIML R-76-Oriented Compliance
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Compact result summary for all three required test stages.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Weighing Performance */}
            <div className={`rounded-xl border p-4 ${getResultClass(weighingResult)}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Weighing Performance
                </h3>
                <span className="rounded-full border border-current/20 bg-white/80 px-2.5 py-1 text-[11px] font-bold">
                  {weighingResult}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Error</span>
                  <span className="font-semibold text-slate-800">
                    {latestWeighingRecord
                      ? `${Number(latestWeighingRecord.error) >= 0 ? "+" : ""}${Number(latestWeighingRecord.error).toFixed(3)} kg`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">MPE</span>
                  <span className="font-semibold text-slate-800">
                    {latestWeighingRecord
                      ? `±${Number(latestWeighingRecord.mpe).toFixed(3)} kg`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Stage</span>
                  <span className="font-semibold text-slate-800">
                    {latestWeighingRecord?.testStage ?? "INITIAL"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Time</span>
                  <span className="text-right font-semibold text-slate-800">
                    {latestWeighingRecord?.createdAt
                      ? formatDateTime(latestWeighingRecord.createdAt)
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Repeatability */}
            <div className={`rounded-xl border p-4 ${getResultClass(repeatabilityResult)}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Repeatability
                </h3>
                <span className="rounded-full border border-current/20 bg-white/80 px-2.5 py-1 text-[11px] font-bold">
                  {repeatabilityResult}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Range</span>
                  <span className="font-semibold text-slate-800">
                    {repeatabilityComplete && repeatabilityRange != null
                      ? `${Number(repeatabilityRange).toFixed(3)} kg`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Readings</span>
                  <span className="font-semibold text-slate-800">
                    {latestRepeatabilityRecords.length > 0
                      ? latestRepeatabilityRecords.length
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Average</span>
                  <span className="font-semibold text-slate-800">
                    {repeatabilityComplete && repeatabilityAverage != null
                      ? `${Number(repeatabilityAverage).toFixed(3)} kg`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Time</span>
                  <span className="text-right font-semibold text-slate-800">
                    {latestRepeatabilityRecords.length > 0 && latestRepeatabilityRecords[0].createdAt
                      ? formatDateTime(latestRepeatabilityRecords[0].createdAt)
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Eccentricity */}
            <div className={`rounded-xl border p-4 ${getResultClass(eccentricityResult)}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Eccentricity
                </h3>
                <span className="rounded-full border border-current/20 bg-white/80 px-2.5 py-1 text-[11px] font-bold">
                  {eccentricityResult}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Max Difference</span>
                  <span className="font-semibold text-slate-800">
                    {eccentricityComplete
                      ? `${Number(eccentricityMaximumDifference).toFixed(3)} kg`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Positions</span>
                  <span className="font-semibold text-slate-800">
                    {inspectionEccentricity.length > 0
                      ? inspectionEccentricity.length
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-semibold text-slate-800">
                    {eccentricityComplete && eccentricityReference
                      ? `${eccentricityReference.toFixed(3)} kg`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Time</span>
                  <span className="text-right font-semibold text-slate-800">
                    {inspectionEccentricity.length > 0 && inspectionEccentricity[0].createdAt
                      ? formatDateTime(inspectionEccentricity[0].createdAt)
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Compact overall result */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Inspection Overall Result
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {overallResult}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border bg-white px-3 py-1.5 text-slate-700">
                  WP: {weighingResult}
                </span>
                <span className="rounded-full border bg-white px-3 py-1.5 text-slate-700">
                  Repeatability: {repeatabilityResult}
                </span>
                <span className="rounded-full border bg-white px-3 py-1.5 text-slate-700">
                  Eccentricity: {eccentricityResult}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          WEIGHING PERFORMANCE RECORDS
          ===================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <Scale
              size={19}
              className="text-slate-600"
            />

            <div>
              <h2 className="font-bold text-slate-900">
                Weighing Performance Records
              </h2>

              <p className="text-xs text-slate-500">
                Saved weighing performance measurements
                with recorded timestamps.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">
                  ID
                </th>

                <th className="px-5 py-3">
                  Measurement Type
                </th>

                <th className="px-5 py-3">
                  Inspection
                </th>

                <th className="px-5 py-3">
                  Reference
                </th>

                <th className="px-5 py-3">
                  Observed
                </th>

                <th className="px-5 py-3">
                  Error
                </th>

                <th className="px-5 py-3">
                  MPE
                </th>

                <th className="px-5 py-3">
                  Result
                </th>

                <th className="px-5 py-3">
                  Date & Time
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {inspectionTests.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    No weighing performance
                    records for this
                    inspection.
                  </td>
                </tr>
              ) : (
                inspectionTests.map(
                  (record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        #{record.id}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${latestWeighingRecord?.id === record.id ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                          {latestWeighingRecord?.id === record.id ? "INITIAL" : "HISTORICAL"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        #
                        {
                          record.inspectionId
                        }
                      </td>

                      <td className="px-5 py-4">
                        {
                          record.referenceWeight
                        }
                      </td>

                      <td className="px-5 py-4">
                        {
                          record.observedWeight
                        }
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {Number(record.error) > 0 ? "+" : ""}
                        {Number(record.error).toFixed(5)} kg
                      </td>

                      <td className="px-5 py-4">
                        ±{Number(record.mpe).toFixed(5)} kg
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${getResultClass(
                            record.result
                          )}`}
                        >
                          {record.result ===
                          "PASS" ? (
                            <CheckCircle2
                              size={13}
                            />
                          ) : record.result ===
                            "FAIL" ? (
                            <XCircle
                              size={13}
                            />
                          ) : (
                            <Info
                              size={13}
                            />
                          )}

                          {
                            record.result
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Clock3
                            size={14}
                            className="text-slate-400"
                          />

                          <span className="text-xs font-medium text-slate-600">
                            {formatDateTime(
                              record.createdAt
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================
          REPEATABILITY SUMMARY
          ===================================================== */}
      {inspectionRepeatability.length >
        0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Repeatability Summary
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Backend-calculated summary of repeated observations.
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-bold ${getResultClass(
                repeatabilityResult
              )}`}
            >
              {repeatabilityResult ===
              "PASS" ? (
                <CheckCircle2 size={14} />
              ) : repeatabilityResult ===
                "FAIL" ? (
                <XCircle size={14} />
              ) : (
                <Info size={14} />
              )}

              {repeatabilityResult}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <SummaryCard
              label="Readings"
              value={
                inspectionRepeatability.length
              }
              icon={
                <RefreshCw
                  size={18}
                />
              }
            />

            <SummaryCard
              label="Average"
              value={
                repeatabilityAverage
              }
              icon={
                <Scale size={18} />
              }
            />

            <SummaryCard
              label="Range"
              value={
                repeatabilityRange
              }
              icon={
                <Gauge size={18} />
              }
            />

            <SummaryCard
              label="Result"
              value={
                repeatabilityResult
              }
              icon={
                repeatabilityResult ===
                "PASS" ? (
                  <CheckCircle2
                    size={18}
                  />
                ) : (
                  <Info size={18} />
                )
              }
            />
          </div>

          {repeatabilitySummary && (
            <div
              className={`mt-5 rounded-xl border p-4 ${
                repeatabilitySummary.result ===
                "PASS"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : repeatabilitySummary.result ===
                    "FAIL"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              <p className="text-sm font-semibold">
                Backend Repeatability Decision
              </p>

              <p className="mt-1 text-sm">
                Average:{" "}
                <strong>
                  {Number(
                    repeatabilitySummary.average
                  ).toFixed(3)}
                </strong>
                {" · "}
                Average Error:{" "}
                <strong>
                  {Number(
                    repeatabilitySummary.averageError
                  ).toFixed(3)}
                </strong>
                {" · "}
                Range:{" "}
                <strong>
                  {Number(
                    repeatabilitySummary.range
                  ).toFixed(3)}
                </strong>
              </p>
            </div>
          )}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    Reading
                  </th>

                  <th className="px-5 py-3">
                    Reference Weight
                  </th>

                  <th className="px-5 py-3">
                    Observed Weight
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {latestRepeatabilityRecords.map(
                  (record) => (
                    <tr
                      key={record.id}
                    >
                      <td className="px-5 py-4">
                        Reading #
                        {
                          record.readingNumber
                        }
                      </td>

                      <td className="px-5 py-4">
                        {
                          record.referenceWeight
                        }
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {
                          record.observedWeight
                        }
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =====================================================
          ECCENTRICITY ANALYSIS
          ===================================================== */}
      {inspectionEccentricity.length >
        0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-900 p-2.5 text-white">
                  <Gauge size={19} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Eccentricity Analysis
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Visual comparison of weighing performance
                    across different platform positions.
                  </p>
                </div>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-bold ${getResultClass(
                eccentricityResult
              )}`}
            >
              {eccentricityResult ===
              "PASS" ? (
                <CheckCircle2 size={14} />
              ) : eccentricityResult ===
                "FAIL" ? (
                <XCircle size={14} />
              ) : (
                <Info size={14} />
              )}

              {eccentricityResult}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              label="Positions Tested"
              value={
                inspectionEccentricity.length
              }
              icon={
                <Gauge size={18} />
              }
            />

            <SummaryCard
              label="Reference Weight"
              value={`${eccentricityReference.toFixed(
                3
              )} kg`}
              icon={
                <Scale size={18} />
              }
            />

            <SummaryCard
              label="Maximum Difference"
              value={`${eccentricityMaximumDifference.toFixed(
                3
              )} kg`}
              icon={
                <RefreshCw
                  size={18}
                />
              }
            />

            <SummaryCard
              label="Highest Reading"
              value={
                eccentricityHighest
                  ? `${Number(
                      eccentricityHighest.observedWeight
                    ).toFixed(
                      3
                    )} kg`
                  : "--"
              }
              icon={
                <ArrowUp size={18} />
              }
            />

            <SummaryCard
              label="Lowest Reading"
              value={
                eccentricityLowest
                  ? `${Number(
                      eccentricityLowest.observedWeight
                    ).toFixed(3)} kg`
                  : "--"
              }
              icon={
                <ArrowDown size={18} />
              }
            />
          </div>

          {eccentricitySummary && (
            <div
              className={`mt-5 rounded-xl border p-4 ${
                eccentricitySummary.result ===
                "PASS"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : eccentricitySummary.result ===
                    "FAIL"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              <p className="text-sm font-semibold">
                Backend Eccentricity Decision
              </p>

              <p className="mt-1 text-sm">
                Maximum Difference:{" "}
                <strong>
                  {Number(
                    eccentricitySummary.maximumDifference
                  ).toFixed(3)}
                </strong>
                {" · "}
                MPE:{" "}
                <strong>
                  ±
                  {Number(
                    eccentricitySummary.mpe
                  ).toFixed(3)}
                </strong>
                {" · "}
                Result:{" "}
                <strong>
                  {eccentricitySummary.result}
                </strong>
              </p>
            </div>
          )}

          <div className="mt-6">
            <EccentricityPlatform
              records={
                inspectionEccentricity
              }
            />
          </div>

          <div className="mt-6">
            <div className="mb-4">
              <h3 className="font-bold text-slate-900">
                Position-wise Measurements
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Difference is calculated as observed
                weight minus reference weight.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inspectionEccentricity.map(
                (record) => (
                  <EccentricityPositionCard
                    key={record.id}
                    record={record}
                    referenceWeight={Number(
                      record.referenceWeight
                    )}
                  />
                )
              )}
            </div>
          </div>

          {eccentricityHighest &&
            eccentricityLowest && (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white p-2 text-blue-600">
                      <ArrowUp
                        size={18}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                        Highest Reading
                      </p>

                      <p className="mt-1 font-bold text-blue-900">
                        {
                          eccentricityHighest.position
                        }
                      </p>

                      <p className="mt-1 text-sm text-blue-700">
                        {Number(
                          eccentricityHighest.observedWeight
                        ).toFixed(
                          3
                        )}{" "}
                        kg
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white p-2 text-amber-600">
                      <ArrowDown
                        size={18}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-500">
                        Lowest Reading
                      </p>

                      <p className="mt-1 font-bold text-amber-900">
                        {
                          eccentricityLowest.position
                        }
                      </p>

                      <p className="mt-1 text-sm text-amber-700">
                        {Number(
                          eccentricityLowest.observedWeight
                        ).toFixed(
                          3
                        )}{" "}
                        kg
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <Info
                size={18}
                className="mt-0.5 shrink-0 text-slate-500"
              />

              <div>
                <h3 className="font-bold text-slate-900">
                  Interpretation
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The visualization shows how the observed
                  weight changes when the test load is
                  positioned at different locations on the
                  weighing platform. A larger spread between
                  positions indicates greater eccentricity
                  variation.
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  The backend summary is used as the
                  authoritative prototype result for this
                  test stage.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          OFFLINE TESTS
          ===================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <WifiOff size={19} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Offline Tests
              </h2>

              <p className="text-xs text-slate-500">
                Tests waiting for synchronization.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              handleSyncOfflineTests
            }
            disabled={
              submitting ||
              offlineTests.length ===
                0
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                submitting
                  ? "animate-spin"
                  : ""
              }
            />

            Sync Offline Tests
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">
                  Client ID
                </th>

                <th className="px-5 py-3">
                  Inspection
                </th>

                <th className="px-5 py-3">
                  Test Type
                </th>

                <th className="px-5 py-3">
                  Reference
                </th>

                <th className="px-5 py-3">
                  Observed
                </th>

                <th className="px-5 py-3">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {offlineTests.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-slate-500"
                  >
                    No offline tests
                    pending.
                  </td>
                </tr>
              ) : (
                offlineTests.map(
                  (test) => (
                    <tr
                      key={
                        test.clientRecordId
                      }
                    >
                      <td className="max-w-[180px] truncate px-5 py-4 font-mono text-xs">
                        {
                          test.clientRecordId
                        }
                      </td>

                      <td className="px-5 py-4">
                        #
                        {
                          test.inspectionId
                        }
                      </td>

                      <td className="px-5 py-4">
                        {
                          test.testType
                        }
                      </td>

                      <td className="px-5 py-4">
                        {
                          test.referenceWeight
                        }
                      </td>

                      <td className="px-5 py-4">
                        {
                          test.observedWeight
                        }
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteOfflineTest(
                              test.clientRecordId
                            )
                          }
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}