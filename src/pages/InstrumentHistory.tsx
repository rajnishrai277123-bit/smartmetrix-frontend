import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  Activity,
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  RefreshCw,
  Search,
  ShieldCheck,
  TestTube2,
  XCircle,
} from "lucide-react";

import api from "../services/api";

interface Instrument {
  id: number;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  instrumentClass?: string;
  capacity?: number;
  scaleInterval?: number;
  minCapacity?: number;
  status?: string;
}

interface Inspection {
  id: number;
  instrumentId: number;
  inspectorId?: number;
  status?: string;
  overallResult?: string;

  completedAt?: string;
  completionTime?: string;
  submittedAt?: string;
  approvedAt?: string;
  controllerApprovedAt?: string;
  createdAt?: string;
}

interface TestRecord {
  id: number;
  inspectionId: number;
  testType?: string;
  result?: string;

  referenceWeight?: number;
  observedWeight?: number;
  error?: number;
  mpe?: number;

  temperature?: number;
  humidity?: number;
  vibration?: number;

  createdAt?: string;
}

interface RepeatabilityRecord {
  id: number;
  inspectionId: number;
  observedWeight?: number;
  result?: string;
  createdAt?: string;
}

interface EccentricityRecord {
  id: number;
  inspectionId: number;
  position?: string;
  observedWeight?: number;
  result?: string;
  createdAt?: string;
}

interface Certificate {
  id?: number;
  inspectionId?: number;
  certificateNumber?: string;
  status?: string;
  generatedAt?: string;
}

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
  tone: "blue" | "green" | "red" | "amber" | "slate";
  icon: typeof Activity;
  meta?: ReactNode;
}

/* =========================================================
   DATE HELPER
========================================================= */

function formatDate(value?: string) {
  if (!value) {
    return "Date not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   RESULT TONE
========================================================= */

function resultTone(value?: string) {
  const normalized = String(value || "").toUpperCase();

  if (
    normalized.includes("PASS") ||
    normalized.includes("APPROV")
  ) {
    return "green" as const;
  }

  if (
    normalized.includes("FAIL") ||
    normalized.includes("REJECT")
  ) {
    return "red" as const;
  }

  if (
    normalized.includes("PENDING") ||
    normalized.includes("IN_PROGRESS") ||
    normalized.includes("SUBMIT")
  ) {
    return "amber" as const;
  }

  return "blue" as const;
}

/* =========================================================
   RESULT BADGE
========================================================= */

function ResultBadge({
  value,
}: {
  value?: string;
}) {
  const normalized = String(
    value || "N/A"
  ).toUpperCase();

  const passed =
    normalized.includes("PASS") ||
    normalized.includes("APPROV");

  const failed =
    normalized.includes("FAIL") ||
    normalized.includes("REJECT");

  const classes = passed
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : failed
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${classes}`}
    >
      {normalized}
    </span>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {helper}
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function InstrumentHistory() {
  const [instruments, setInstruments] =
    useState<Instrument[]>([]);

  const [inspections, setInspections] =
    useState<Inspection[]>([]);

  const [testRecords, setTestRecords] =
    useState<TestRecord[]>([]);

  const [repeatability, setRepeatability] =
    useState<RepeatabilityRecord[]>([]);

  const [eccentricity, setEccentricity] =
    useState<EccentricityRecord[]>([]);

  const [certificates, setCertificates] =
    useState<Certificate[]>([]);

  const [selectedId, setSelectedId] =
    useState<number | null>(null);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =========================================================
     LOAD DATA
  ========================================================= */

  const loadData = async (
    silent = false
  ) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [
        instrumentRes,
        inspectionRes,
        testRes,
        repeatabilityRes,
        eccentricityRes,
        certificateRes,
      ] = await Promise.all([
        api.get("/instruments"),
        api.get("/inspections"),
        api.get("/test-records"),
        api.get("/repeatability"),
        api.get("/eccentricity"),
        api.get("/certificates"),
      ]);

      const instrumentData =
        Array.isArray(instrumentRes.data)
          ? instrumentRes.data
          : [];

      setInstruments(instrumentData);

      setInspections(
        Array.isArray(inspectionRes.data)
          ? inspectionRes.data
          : []
      );

      setTestRecords(
        Array.isArray(testRes.data)
          ? testRes.data
          : []
      );

      setRepeatability(
        Array.isArray(repeatabilityRes.data)
          ? repeatabilityRes.data
          : []
      );

      setEccentricity(
        Array.isArray(eccentricityRes.data)
          ? eccentricityRes.data
          : []
      );

      setCertificates(
        Array.isArray(certificateRes.data)
          ? certificateRes.data
          : []
      );

      setSelectedId((current) =>
        current &&
        instrumentData.some(
          (item: Instrument) =>
            item.id === current
        )
          ? current
          : instrumentData[0]?.id ?? null
      );
    } catch (err) {
      console.error(
        "Instrument history load failed:",
        err
      );

      setError(
        "Unable to load instrument history. Please refresh and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadData();
  }, []);

  /* =========================================================
     SEARCH
  ========================================================= */

  const filteredInstruments = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    if (!term) {
      return instruments;
    }

    return instruments.filter(
      (item) =>
        [
          item.id,
          item.serialNumber,
          item.model,
          item.manufacturer,
          item.instrumentClass,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(term)
        )
    );
  }, [instruments, search]);

  /* =========================================================
     SELECTED INSTRUMENT
  ========================================================= */

  const selectedInstrument = useMemo(
    () =>
      instruments.find(
        (item) => item.id === selectedId
      ),
    [instruments, selectedId]
  );

  /* =========================================================
     SELECTED INSPECTIONS

     Date priority:
     completedAt
     controllerApprovedAt
     approvedAt
     completionTime
     submittedAt
     createdAt
  ========================================================= */

  const selectedInspections = useMemo(
    () =>
      inspections
        .filter(
          (item) =>
            item.instrumentId === selectedId
        )
        .sort(
          (a, b) =>
            new Date(
              b.completedAt ||
                b.controllerApprovedAt ||
                b.approvedAt ||
                b.completionTime ||
                b.submittedAt ||
                b.createdAt ||
                0
            ).getTime() -
            new Date(
              a.completedAt ||
                a.controllerApprovedAt ||
                a.approvedAt ||
                a.completionTime ||
                a.submittedAt ||
                a.createdAt ||
                0
            ).getTime()
        ),
    [inspections, selectedId]
  );

  /* =========================================================
     INSPECTION IDS
  ========================================================= */

  const selectedInspectionIds = useMemo(
    () =>
      new Set(
        selectedInspections.map(
          (item) => item.id
        )
      ),
    [selectedInspections]
  );

  /* =========================================================
     TESTS
  ========================================================= */

  const selectedTests = useMemo(
    () =>
      testRecords.filter((item) =>
        selectedInspectionIds.has(
          item.inspectionId
        )
      ),
    [testRecords, selectedInspectionIds]
  );

  /* =========================================================
     REPEATABILITY
  ========================================================= */

  const selectedRepeatability = useMemo(
    () =>
      repeatability.filter((item) =>
        selectedInspectionIds.has(
          item.inspectionId
        )
      ),
    [repeatability, selectedInspectionIds]
  );

  /* =========================================================
     ECCENTRICITY
  ========================================================= */

  const selectedEccentricity = useMemo(
    () =>
      eccentricity.filter((item) =>
        selectedInspectionIds.has(
          item.inspectionId
        )
      ),
    [eccentricity, selectedInspectionIds]
  );

  /* =========================================================
     CERTIFICATES
  ========================================================= */

  const selectedCertificates = useMemo(
    () =>
      certificates.filter((item) =>
        selectedInspectionIds.has(
          item.inspectionId ?? -1
        )
      ),
    [certificates, selectedInspectionIds]
  );

  /* =========================================================
     INSPECTION COUNTS
  ========================================================= */

  const passCount =
    selectedInspections.filter(
      (item) =>
        String(
          item.overallResult || ""
        ).toUpperCase() === "PASS"
    ).length;

  const failCount =
    selectedInspections.filter(
      (item) =>
        String(
          item.overallResult || ""
        ).toUpperCase() === "FAIL"
    ).length;

  const pendingCount =
    selectedInspections.filter(
      (item) => {
        const result = String(
          item.overallResult || ""
        ).toUpperCase();

        return (
          result !== "PASS" &&
          result !== "FAIL"
        );
      }
    ).length;

  /* =========================================================
     TIMELINE
  ========================================================= */

  const timeline = useMemo<TimelineItem[]>(
    () => {
      const items: TimelineItem[] = [];

      /* -----------------------------------------------------
         INSPECTIONS
      ----------------------------------------------------- */

      selectedInspections.forEach(
        (inspection) => {
          const result = String(
            inspection.overallResult ||
              inspection.status ||
              "PENDING"
          ).toUpperCase();

          items.push({
            id: `inspection-${inspection.id}`,

            date:
              inspection.completedAt ||
              inspection.controllerApprovedAt ||
              inspection.approvedAt ||
              inspection.completionTime ||
              inspection.submittedAt ||
              inspection.createdAt ||
              "",

            title: `Inspection #${inspection.id}`,

            description:
              `Inspection recorded for Instrument #${inspection.instrumentId}.`,

            tone: resultTone(result),

            icon: ClipboardCheck,

            meta: (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ResultBadge
                  value={
                    inspection.overallResult ||
                    inspection.status
                  }
                />

                <span className="text-xs text-slate-500">
                  Inspector #
                  {inspection.inspectorId ??
                    "N/A"}
                </span>
              </div>
            ),
          });

          /* -------------------------------------------------
             TEST RECORDS
          ------------------------------------------------- */

          const inspectionTests =
            selectedTests.filter(
              (test) =>
                test.inspectionId ===
                inspection.id
            );

          inspectionTests.forEach(
            (test) => {
              const label = String(
                test.testType || "TEST"
              ).replaceAll(
                "_",
                " "
              );

              items.push({
                id: `test-${test.id}`,

                date:
                  test.createdAt ||
                  inspection.completedAt ||
                  inspection.controllerApprovedAt ||
                  inspection.approvedAt ||
                  inspection.completionTime ||
                  inspection.submittedAt ||
                  inspection.createdAt ||
                  "",

                title: label,

                description:
                  test.observedWeight !==
                    undefined &&
                  test.referenceWeight !==
                    undefined
                    ? `Reference ${test.referenceWeight} · Observed ${test.observedWeight} · Error ${test.error ?? "N/A"}`
                    : `Test record #${test.id} linked to Inspection #${inspection.id}.`,

                tone: resultTone(
                  test.result
                ),

                icon: TestTube2,

                meta: (
                  <ResultBadge
                    value={test.result}
                  />
                ),
              });
            }
          );
        }
      );

      /* -----------------------------------------------------
         CERTIFICATES

         Certificate has its own generatedAt timestamp.
      ----------------------------------------------------- */

      selectedCertificates.forEach(
        (certificate) => {
          items.push({
            id: `certificate-${
              certificate.id ??
              certificate.certificateNumber
            }`,

            date:
              certificate.generatedAt ||
              "",

            title:
              "Certificate Generated",

            description:
              certificate.certificateNumber ||
              `Certificate #${
                certificate.id ?? "N/A"
              }`,

            tone: "green",

            icon: Award,

            meta: (
              <ResultBadge
                value={
                  certificate.status ||
                  "ISSUED"
                }
              />
            ),
          });
        }
      );

      /* -----------------------------------------------------
         FINAL TIMELINE SORT
      ----------------------------------------------------- */

      return items.sort(
        (a, b) =>
          new Date(
            b.date || 0
          ).getTime() -
          new Date(
            a.date || 0
          ).getTime()
      );
    },
    [
      selectedInspections,
      selectedTests,
      selectedCertificates,
    ]
  );

  /* =========================================================
     QUALITY
  ========================================================= */

  const quality =
    selectedInspections.length
      ? Math.round(
          (passCount /
            selectedInspections.length) *
            100
        )
      : 0;

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-6 py-7 text-white md:px-8">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-200">

                <Clock3 size={14} />

                Phase 1 · Instrument Traceability

              </div>

              <h1 className="text-2xl font-bold md:text-3xl">
                Instrument History & Timeline
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                View the complete inspection, test
                and certificate journey of each
                weighing instrument in one place.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                loadData(true)
              }
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
            >

              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh History

            </button>

          </div>

        </div>
      </section>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">

        {/* ===================================================
            LEFT - INSTRUMENT LIST
        =================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 p-5">

            <div className="flex items-center justify-between gap-3">

              <div>

                <h2 className="font-bold text-slate-900">
                  Instruments
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Select an instrument to inspect
                  its history.
                </p>

              </div>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {instruments.length}
              </span>

            </div>

            <div className="relative mt-4">

              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search serial, model, ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
              />

            </div>

          </div>

          <div className="max-h-[620px] overflow-y-auto p-3">

            {loading ? (

              <div className="p-8 text-center text-sm text-slate-500">
                Loading instruments...
              </div>

            ) : filteredInstruments.length === 0 ? (

              <div className="p-8 text-center text-sm text-slate-500">
                No instruments found.
              </div>

            ) : (

              filteredInstruments.map(
                (instrument) => {

                  const active =
                    instrument.id ===
                    selectedId;

                  const count =
                    inspections.filter(
                      (item) =>
                        item.instrumentId ===
                        instrument.id
                    ).length;

                  return (
                    <button
                      key={instrument.id}
                      type="button"
                      onClick={() =>
                        setSelectedId(
                          instrument.id
                        )
                      }
                      className={`mb-2 w-full rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-blue-200 bg-blue-50 shadow-sm"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate text-sm font-bold text-slate-900">
                            {instrument.serialNumber ||
                              `Instrument #${instrument.id}`}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {instrument.manufacturer ||
                              "Unknown manufacturer"}

                            {" · "}

                            {instrument.model ||
                              "Model N/A"}
                          </p>

                          <p className="mt-2 text-[11px] font-medium text-slate-400">
                            ID #{instrument.id}
                            {" · "}
                            {count} inspection
                            {count === 1
                              ? ""
                              : "s"}
                          </p>

                        </div>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                            active
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {instrument.instrumentClass ||
                            "N/A"}
                        </span>

                      </div>

                    </button>
                  );
                }
              )

            )}

          </div>

        </section>

        {/* ===================================================
            RIGHT CONTENT
        =================================================== */}

        <div className="space-y-6">

          {selectedInstrument ? (

            <>

              {/* =============================================
                  INSTRUMENT DETAILS
              ============================================= */}

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

                  <div>

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                        Instrument #{selectedInstrument.id}
                      </span>

                      <ResultBadge
                        value={
                          selectedInstrument.status ||
                          "ACTIVE"
                        }
                      />

                    </div>

                    <h2 className="mt-3 text-2xl font-bold text-slate-900">
                      {selectedInstrument.serialNumber ||
                        "Serial number not available"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedInstrument.manufacturer ||
                        "Unknown manufacturer"}

                      {" · "}

                      {selectedInstrument.model ||
                        "Model N/A"}
                    </p>

                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">

                    <div className="rounded-xl bg-slate-50 p-3">

                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Class
                      </p>

                      <p className="mt-1 font-bold text-slate-800">
                        {selectedInstrument.instrumentClass ||
                          "N/A"}
                      </p>

                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">

                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Capacity
                      </p>

                      <p className="mt-1 font-bold text-slate-800">
                        {selectedInstrument.capacity ??
                          "N/A"}
                      </p>

                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">

                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Scale
                      </p>

                      <p className="mt-1 font-bold text-slate-800">
                        {selectedInstrument.scaleInterval ??
                          "N/A"}
                      </p>

                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">

                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Min
                      </p>

                      <p className="mt-1 font-bold text-slate-800">
                        {selectedInstrument.minCapacity ??
                          "N/A"}
                      </p>

                    </div>

                  </div>

                </div>

              </section>

              {/* =============================================
                  STAT CARDS
              ============================================= */}

              <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">

                <StatCard
                  icon={
                    <ClipboardCheck
                      size={19}
                    />
                  }
                  label="Inspections"
                  value={
                    selectedInspections.length
                  }
                  helper="Total recorded"
                />

                <StatCard
                  icon={
                    <CheckCircle2
                      size={19}
                    />
                  }
                  label="Passed"
                  value={passCount}
                  helper={`${quality}% inspection pass rate`}
                />

                <StatCard
                  icon={
                    <XCircle size={19} />
                  }
                  label="Failed"
                  value={failCount}
                  helper="Failed inspections"
                />

                <StatCard
                  icon={
                    <TestTube2 size={19} />
                  }
                  label="Test Records"
                  value={
                    selectedTests.length
                  }
                  helper={`${selectedRepeatability.length} repeatability · ${selectedEccentricity.length} eccentricity`}
                />

                <StatCard
                  icon={
                    <FileCheck2
                      size={19}
                    />
                  }
                  label="Certificates"
                  value={
                    selectedCertificates.length
                  }
                  helper="Linked certificates"
                />

              </div>

              {/* =============================================
                  PENDING INFO
              ============================================= */}

              {pendingCount > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">

                  <div className="flex items-center gap-3">

                    <Clock3
                      size={20}
                      className="text-amber-600"
                    />

                    <div>

                      <p className="text-sm font-bold text-amber-800">
                        {pendingCount} inspection
                        {pendingCount === 1
                          ? ""
                          : "s"} pending
                      </p>

                      <p className="mt-1 text-xs text-amber-700">
                        These inspections do not
                        have a final PASS or FAIL
                        result yet.
                      </p>

                    </div>

                  </div>

                </div>
              )}

              {/* =============================================
                  TIMELINE
              ============================================= */}

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="mb-6 flex items-center justify-between gap-4">

                  <div>

                    <h2 className="text-lg font-bold text-slate-900">
                      Inspection Timeline
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Chronological activity for
                      this instrument.
                    </p>

                  </div>

                  <div className="hidden items-center gap-3 text-xs text-slate-500 sm:flex">

                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Pass
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Fail
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Pending
                    </span>

                  </div>

                </div>

                {timeline.length === 0 ? (

                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">

                    <Clock3
                      size={30}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm font-semibold text-slate-600">
                      No history available yet.
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Complete an inspection to
                      start building this
                      instrument timeline.
                    </p>

                  </div>

                ) : (

                  <div className="relative ml-2 border-l border-slate-200 pl-7">

                    {timeline.map(
                      (item) => {

                        const Icon =
                          item.icon;

                        const dot =
                          item.tone ===
                          "green"
                            ? "bg-emerald-500"
                            : item.tone ===
                                "red"
                              ? "bg-red-500"
                              : item.tone ===
                                  "amber"
                                ? "bg-amber-500"
                                : item.tone ===
                                    "slate"
                                  ? "bg-slate-400"
                                  : "bg-blue-500";

                        return (
                          <div
                            key={item.id}
                            className="relative pb-7 last:pb-0"
                          >

                            <div
                              className={`absolute -left-[43px] top-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white ${dot} text-white shadow-sm`}
                            >
                              <Icon size={13} />
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">

                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                                <div>

                                  <h3 className="font-bold text-slate-900">
                                    {item.title}
                                  </h3>

                                  <p className="mt-1 text-sm text-slate-600">
                                    {item.description}
                                  </p>

                                  {item.meta}

                                </div>

                                <span className="shrink-0 text-xs font-medium text-slate-400">
                                  {formatDate(
                                    item.date
                                  )}
                                </span>

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                )}

              </section>

              {/* =============================================
                  LOWER CARDS
              ============================================= */}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* ===========================================
                    TEST SNAPSHOT
                =========================================== */}

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="flex items-center gap-3">

                    <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                      <BarChart3
                        size={19}
                      />
                    </div>

                    <div>

                      <h2 className="font-bold text-slate-900">
                        Test Snapshot
                      </h2>

                      <p className="text-xs text-slate-500">
                        Latest linked measurement
                        activity
                      </p>

                    </div>

                  </div>

                  <div className="mt-5 space-y-3">

                    {selectedTests
                      .slice(0, 5)
                      .map((test) => (

                        <div
                          key={test.id}
                          className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                        >

                          <div className="flex items-center justify-between gap-3">

                            <p className="text-sm font-semibold text-slate-800">
                              {String(
                                test.testType ||
                                  "TEST"
                              ).replaceAll(
                                "_",
                                " "
                              )}
                            </p>

                            <ResultBadge
                              value={
                                test.result
                              }
                            />

                          </div>

                          <p className="mt-2 text-xs text-slate-500">

                            Inspection #
                            {test.inspectionId}

                            {test.error !==
                              undefined
                              ? ` · Error ${test.error}`
                              : ""}

                            {test.mpe !==
                              undefined
                              ? ` · MPE ${test.mpe}`
                              : ""}

                          </p>

                          {test.createdAt && (
                            <p className="mt-1 text-[11px] text-slate-400">
                              Recorded:{" "}
                              {formatDate(
                                test.createdAt
                              )}
                            </p>
                          )}

                        </div>

                      ))}

                    {selectedTests.length ===
                      0 && (
                      <p className="py-5 text-center text-sm text-slate-500">
                        No test records linked
                        yet.
                      </p>
                    )}

                  </div>

                </section>

                {/* ===========================================
                    CERTIFICATE
                =========================================== */}

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                  <div className="flex items-center gap-3">

                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                      <ShieldCheck
                        size={19}
                      />
                    </div>

                    <div>

                      <h2 className="font-bold text-slate-900">
                        Certificate & Result
                      </h2>

                      <p className="text-xs text-slate-500">
                        Traceability from
                        inspection to
                        certification
                      </p>

                    </div>

                  </div>

                  <div className="mt-5 space-y-3">

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Overall result
                      </p>

                      <div className="mt-2">

                        <ResultBadge
                          value={
                            selectedInspections[0]
                              ?.overallResult ||
                            selectedInspections[0]
                              ?.status ||
                            "N/A"
                          }
                        />

                      </div>

                    </div>

                    {selectedCertificates.length >
                    0 ? (

                      selectedCertificates.map(
                        (certificate) => {

                          return (
                            <div
                              key={
                                certificate.id ??
                                certificate.certificateNumber
                              }
                              className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"
                            >

                              <div className="flex items-center gap-2">

                                <Award
                                  size={17}
                                  className="text-emerald-600"
                                />

                                <p className="text-sm font-bold text-slate-800">
                                  {certificate.certificateNumber ||
                                    `Certificate #${certificate.id}`}
                                </p>

                              </div>

                              <p className="mt-1 text-xs text-slate-500">
                                Status:{" "}
                                {certificate.status ||
                                  "ISSUED"}
                              </p>

                              <p className="mt-1 text-[11px] text-slate-400">
                                Related inspection: #
                                {certificate.inspectionId ??
                                  "N/A"}
                              </p>

                              <p className="mt-1 text-[11px] text-slate-400">
                                Certificate generated:{" "}
                                {formatDate(
                                  certificate.generatedAt
                                )}
                              </p>

                            </div>
                          );
                        }
                      )

                    ) : (

                      <p className="py-5 text-center text-sm text-slate-500">
                        No certificate linked to
                        this instrument yet.
                      </p>

                    )}

                  </div>

                </section>

              </div>

            </>

          ) : (

            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">

              <Activity
                size={34}
                className="mx-auto text-slate-300"
              />

              <h2 className="mt-4 text-lg font-bold text-slate-800">
                Select an instrument
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose an instrument from the
                left to view its complete
                history.
              </p>

            </section>

          )}

        </div>

      </div>

    </div>
  );
}