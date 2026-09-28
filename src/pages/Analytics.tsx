import { useEffect, useMemo, useState } from "react";

import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  Gauge,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Thermometer,
  TrendingUp,
  XCircle,
  Scale,
  MapPin,
  History,
  Users,
  Database,
  Activity,
  FileSearch,
  Brain,
  AlertTriangle,
  CircleGauge,
  Sparkles,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "../services/api";

/* ========================================================== */
/* TYPES */
/* ========================================================== */

type AnalyticsData = {
  totalInspections: number;
  passInspections: number;
  failInspections: number;
  pendingInspections: number;

  totalTestRecords: number;
  passTestRecords: number;
  failTestRecords: number;

  inspectionPassPercentage: number;
  inspectionFailPercentage: number;

  testPassPercentage: number;
  testFailPercentage: number;
};

type TestRecord = {
  id: number;
  inspectionId: number;
  testType: string;
  referenceWeight: number;
  observedWeight: number;
  error: number;
  mpe: number;
  temperature: number;
  humidity: number;
  vibration: number;
  result: string;
  createdAt?: string | null;
};

type Instrument = {
  id: number;
  serialNumber: string;
  manufacturer: string;
  model: string;
  instrumentClass: string;
  capacity?: number;
  minCapacity?: number;
  scaleInterval?: number;
  status?: string;
};

 type Inspection = {
  id: number;
  instrumentId: number;
  inspectorId?: number | null;
  status?: string | null;
  overallResult?: string | null;
};

type EccentricityRecord = {
  id: number;
  inspectionId: number;
  position: string;
  referenceWeight: number;
  observedWeight: number;
};

type RepeatabilityRecord = {
  id: number;
  inspectionId: number;
  testRunId: number | null;
  referenceWeight: number;
  observedWeight: number;
  readingNumber: number;
};

type AuditLog = {
  id: number;
  userId: number;
  action: string;
  entity: string;
  entityId: number;
  oldValue?: string | null;
  newValue?: string | null;
  timestamp?: string | null;
};

type EnvironmentRecord = {
  id: number;
  inspectionId: number;
  temperature: number | null;
  humidity: number | null;
  vibration: number | null;
  source: string;
  status: string;
};

type RiskResult = {
  riskScore?: number;
  riskLevel?: string;
};

type EccentricitySummary = {
  inspectionId: number;
  instrumentId: number | null;
  serialNumber: string;
  readings: number;
  minimumWeight: number;
  maximumWeight: number;
  maximumDifference: number;
  centerWeight: number | null;
};

type RepeatabilitySummary = {
  inspectionId: number;
  instrumentId: number | null;
  serialNumber: string;
  readings: number;
  averageWeight: number;
  minimumWeight: number;
  maximumWeight: number;
  range: number;
};

/* ========================================================== */
/* STEP 13 — DRIFT TYPES */
/* ========================================================== */

type DriftAnalysis = {
  instrumentId: number;
  totalRecords?: number;
  averageError?: number;
  averageAbsoluteError?: number;
  maximumAbsoluteError?: number;
  driftScore?: number;
  status?: string;
};

type PredictionPoint = {
  testRecordId: number;
  referenceWeight: number;
  observedWeight: number;
  error: number;
};

type MlPrediction = {
  instrumentId: number;
  predictionStatus?: string;
  currentAverageError?: number;
  predictedNextError?: number;
  trendSlope?: number;
  confidence?: number;
  predictedRisk?: string;
  explanation?: string;
  history?: PredictionPoint[];
};

/* ========================================================== */
/* EMPTY ANALYTICS */
/* ========================================================== */

const emptyAnalytics: AnalyticsData = {
  totalInspections: 0,
  passInspections: 0,
  failInspections: 0,
  pendingInspections: 0,

  totalTestRecords: 0,
  passTestRecords: 0,
  failTestRecords: 0,

  inspectionPassPercentage: 0,
  inspectionFailPercentage: 0,

  testPassPercentage: 0,
  testFailPercentage: 0,
};

/* ========================================================== */
/* HELPERS */
/* ========================================================== */

function num(value: unknown): number {
  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
}

function normalizeAnalytics(raw: any): AnalyticsData {
  return {
    totalInspections: num(raw?.totalInspections),
    passInspections: num(raw?.passInspections),
    failInspections: num(raw?.failInspections),
    pendingInspections: num(raw?.pendingInspections),

    totalTestRecords: num(raw?.totalTestRecords),
    passTestRecords: num(raw?.passTestRecords),
    failTestRecords: num(raw?.failTestRecords),

    inspectionPassPercentage: num(
      raw?.inspectionPassPercentage
    ),

    inspectionFailPercentage: num(
      raw?.inspectionFailPercentage
    ),

    testPassPercentage: num(
      raw?.testPassPercentage
    ),

    testFailPercentage: num(
      raw?.testFailPercentage
    ),
  };
}

function formatDate(
  dateString?: string | null
): string {
  if (!dateString) {
    return "Date unavailable";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(
  dateString?: string | null
): string {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizePosition(
  position: string
): string {
  return String(position || "")
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeAuditText(
  value?: string | null
): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/* ========================================================== */
/* MAIN COMPONENT */
/* ========================================================== */

export default function Analytics() {
  const [analytics, setAnalytics] =
    useState<AnalyticsData>(emptyAnalytics);

  const [tests, setTests] =
    useState<TestRecord[]>([]);

  const [instruments, setInstruments] =
    useState<Instrument[]>([]);

  const [inspections, setInspections] =
    useState<Inspection[]>([]);

  const [
    eccentricityRecords,
    setEccentricityRecords,
  ] = useState<EccentricityRecord[]>([]);

  const [
    repeatabilityRecords,
    setRepeatabilityRecords,
  ] = useState<RepeatabilityRecord[]>([]);

  const [auditLogs, setAuditLogs] =
    useState<AuditLog[]>([]);

    const [
  environmentRecords,
  setEnvironmentRecords,
] = useState<EnvironmentRecord[]>([]);

  const [riskLevels, setRiskLevels] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* ======================================================== */
  /* STEP 13 STATES */
  /* ======================================================== */

  const [
    selectedInstrumentId,
    setSelectedInstrumentId,
  ] = useState<number | "">("");

  const [driftAnalysis, setDriftAnalysis] =
    useState<DriftAnalysis | null>(null);

  const [mlPrediction, setMlPrediction] =
    useState<MlPrediction | null>(null);

  const [selectedRiskResult, setSelectedRiskResult] =
    useState<RiskResult | null>(null);

  const [
    predictionLoading,
    setPredictionLoading,
  ] = useState(false);

  const [
    predictionError,
    setPredictionError,
  ] = useState("");

  /* ======================================================== */
  /* LOAD ANALYTICS */
  /* ======================================================== */

  const loadAnalytics = async () => {
    setLoading(true);
    setError("");

    try {
      const [
  analyticsResponse,
  testsResponse,
  instrumentsResponse,
  inspectionsResponse,
  eccentricityResponse,
  repeatabilityResponse,
  auditResponse,
  environmentResponse,
] = await Promise.all([
  api.get("/analytics"),

  api.get("/test-records"),

  api.get("/instruments"),

  api.get("/inspections"),

  api.get("/eccentricity"),

  api.get("/repeatability"),

  api.get("/audit-logs"),

  api.get("/environment"),
]);

      const normalized =
        normalizeAnalytics(
          analyticsResponse.data
        );

      setAnalytics(normalized);

      setTests(
        Array.isArray(
          testsResponse.data
        )
          ? testsResponse.data
          : []
      );

      setInstruments(
        Array.isArray(
          instrumentsResponse.data
        )
          ? instrumentsResponse.data
          : []
      );

      setInspections(
        Array.isArray(
          inspectionsResponse.data
        )
          ? inspectionsResponse.data
          : []
      );

      setEccentricityRecords(
        Array.isArray(
          eccentricityResponse.data
        )
          ? eccentricityResponse.data
          : []
      );

      setRepeatabilityRecords(
        Array.isArray(
          repeatabilityResponse.data
        )
          ? repeatabilityResponse.data
          : []
      );

      setAuditLogs(
        Array.isArray(
          auditResponse.data
        )
          ? auditResponse.data
          : []
      );

      setEnvironmentRecords(
  Array.isArray(
    environmentResponse.data
  )
    ? environmentResponse.data
    : []
);

      const instrumentList =
        Array.isArray(
          instrumentsResponse.data
        )
          ? instrumentsResponse.data
          : [];

      const riskResponses =
        await Promise.all(
          instrumentList.map(
            async (
              instrument: Instrument
            ) => {
              try {
                const response =
                  await api.get(
                    `/risk/instrument/${instrument.id}`
                  );

                const result =
                  response.data as RiskResult;

                return (
                  result?.riskLevel ||
                  "UNKNOWN"
                );
              } catch {
                return "UNKNOWN";
              }
            }
          )
        );

      setRiskLevels(
        riskResponses
      );
    } catch (err: any) {
      console.error(
        "Analytics error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to load analytics."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================== */
  /* STEP 13 — LOAD DRIFT + ML */
  /* ======================================================== */

  const loadPredictionAnalysis =
    async (
      instrumentId: number
    ) => {
      setPredictionLoading(
        true
      );

      setPredictionError("");

      try {
        const [
          driftResponse,
          mlResponse,
        ] = await Promise.all([
          api.get(
            `/drift/instrument/${instrumentId}`
          ),

          api.get(
            `/ml/prediction/instrument/${instrumentId}`
          ),
        ]);

        setDriftAnalysis(
          driftResponse.data ||
            null
        );

        setMlPrediction(
          mlResponse.data ||
            null
        );
      } catch (err: any) {
        console.error(
          "Prediction analysis error:",
          err
        );

        setDriftAnalysis(null);

        setMlPrediction(null);

        setPredictionError(
          err?.response?.data
            ?.message ||
            "Unable to load drift and prediction analysis."
        );
      } finally {
        setPredictionLoading(
          false
        );
      }
    };

  /* ======================================================== */
  /* INSTRUMENT CHANGE */
  /* ======================================================== */

  const handleInstrumentChange =
    (value: string) => {
      if (!value) {
        setSelectedInstrumentId(
          ""
        );

        setDriftAnalysis(
          null
        );

        setMlPrediction(
          null
        );

        setSelectedRiskResult(null);

        setPredictionError("");

        return;
      }

      const instrumentId =
        Number(value);

      if (
        !Number.isFinite(
          instrumentId
        )
      ) {
        return;
      }

      setSelectedInstrumentId(
        instrumentId
      );

      api.get(`/risk/instrument/${instrumentId}`)
        .then((response) => {
          setSelectedRiskResult(response.data || null);
        })
        .catch(() => {
          setSelectedRiskResult(null);
        });

      loadPredictionAnalysis(
        instrumentId
      );
    };

  /* ======================================================== */
  /* AUTO-SELECT BEST PREDICTION DATASET */
  /* ======================================================== */

  useEffect(() => {
    if (
      selectedInstrumentId !== "" ||
      tests.length === 0 ||
      instruments.length === 0 ||
      inspections.length === 0
    ) {
      return;
    }

    // TestRecord is linked to an inspection, not directly to an instrument.
    // Resolve the instrument through inspection.instrumentId before counting
    // historical WP records for automatic prediction selection.
    const inspectionInstrument = new Map(
      inspections.map((inspection) => [
        inspection.id,
        inspection.instrumentId,
      ])
    );

    const eligible = instruments
      .map((instrument) => {
        const records = tests.filter((test) =>
          inspectionInstrument.get(test.inspectionId) === instrument.id &&
          String(test.testType || "").toUpperCase() === "WEIGHING_PERFORMANCE" &&
          test.createdAt &&
          Number.isFinite(Number(test.error))
        );

        return { instrument, count: records.length };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const best =
      eligible.find((item) => item.count >= 3) ||
      eligible[0];

    if (best) {
      handleInstrumentChange(String(best.instrument.id));
    }
  }, [tests, instruments, inspections, selectedInstrumentId]);

  /* ======================================================== */
  /* INITIAL LOAD */
  /* ======================================================== */

  useEffect(() => {
    loadAnalytics();
  }, []);

  /* ======================================================== */
  /* DATE-WISE MEASUREMENT DRIFT */
  /* ======================================================== */

  const driftData =
    useMemo(() => {
      return [...tests]
        .filter(
          (test) =>
            test.createdAt &&
            !Number.isNaN(
              new Date(
                test.createdAt
              ).getTime()
            ) &&
            Number.isFinite(
              Number(test.error)
            )
        )
        .sort(
          (a, b) =>
            new Date(
              a.createdAt!
            ).getTime() -
            new Date(
              b.createdAt!
            ).getTime()
        )
        .map(
          (test) => ({
            date: formatDate(
              test.createdAt
            ),

            time: formatTime(
              test.createdAt
            ),

            error: Number(
              Math.abs(
                num(test.error)
              ).toFixed(4)
            ),
          })
        );
    }, [tests]);

  /* ======================================================== */
  /* TEMPERATURE VS ERROR */
  /* ======================================================== */

  const temperatureData =
    useMemo(() => {
      return tests
        .filter(
          (test) =>
            test.temperature !==
              null &&
            test.temperature !==
              undefined &&
            test.error !==
              null &&
            test.error !==
              undefined &&
            Number.isFinite(
              Number(
                test.temperature
              )
            ) &&
            Number.isFinite(
              Number(test.error)
            )
        )
        .map(
          (test) => ({
            temperature:
              num(
                test.temperature
              ),

            error: Number(
              Math.abs(
                num(test.error)
              ).toFixed(4)
            ),
          })
        );
    }, [tests]);

  /* ======================================================== */
  /* HUMIDITY VS ERROR */
  /* ======================================================== */

  const humidityData =
    useMemo(() => {
      return tests
        .filter(
          (test) =>
            test.humidity !==
              null &&
            test.humidity !==
              undefined &&
            test.error !==
              null &&
            test.error !==
              undefined &&
            Number.isFinite(
              Number(
                test.humidity
              )
            ) &&
            Number.isFinite(
              Number(test.error)
            )
        )
        .map(
          (test) => ({
            humidity:
              num(
                test.humidity
              ),

            error: Number(
              Math.abs(
                num(test.error)
              ).toFixed(4)
            ),
          })
        );
    }, [tests]);

  /* ======================================================== */
  /* GENERAL ERROR METRICS */
  /* ======================================================== */

  const errorMetrics =
    useMemo(() => {
      if (!tests.length) {
        return {
          average: 0,
          maximum: 0,
          absoluteAverage: 0,
        };
      }

      const errors =
        tests.map(
          (test) =>
            Math.abs(
              num(test.error)
            )
        );

      const average =
        errors.reduce(
          (sum, value) =>
            sum + value,
          0
        ) /
        errors.length;

      const maximum =
        Math.max(...errors);

      return {
        average: Number(
          average.toFixed(4)
        ),

        maximum: Number(
          maximum.toFixed(4)
        ),

        absoluteAverage:
          Number(
            average.toFixed(4)
          ),
      };
    }, [tests]);

  /* ======================================================== */
  /* RISK DISTRIBUTION */
  /* ======================================================== */

  const riskData =
    useMemo(() => {
      const counts = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        UNKNOWN: 0,
      };

      riskLevels.forEach(
        (level) => {
          const normalized =
            String(
              level
            ).toUpperCase();

          if (
            normalized ===
            "LOW"
          ) {
            counts.LOW++;
          } else if (
            normalized ===
            "MEDIUM"
          ) {
            counts.MEDIUM++;
          } else if (
            normalized ===
            "HIGH"
          ) {
            counts.HIGH++;
          } else {
            counts.UNKNOWN++;
          }
        }
      );

      return [
        {
          name: "LOW",
          value: counts.LOW,
        },

        {
          name: "MEDIUM",
          value: counts.MEDIUM,
        },

        {
          name: "HIGH",
          value: counts.HIGH,
        },

        {
          name: "UNKNOWN",
          value: counts.UNKNOWN,
        },
      ].filter(
        (item) =>
          item.value > 0
      );
    }, [riskLevels]);

  /* ======================================================== */
  /* STEP 10 — ECCENTRICITY */
  /* ======================================================== */

  const eccentricitySummary =
    useMemo(() => {
      const groups =
        new Map<
          number,
          EccentricityRecord[]
        >();

      eccentricityRecords.forEach(
        (record) => {
          const existing =
            groups.get(
              record.inspectionId
            ) || [];

          existing.push(record);

          groups.set(
            record.inspectionId,
            existing
          );
        }
      );

      const result: EccentricitySummary[] =
        [];

      groups.forEach(
        (
          records,
          inspectionId
        ) => {
          const observedWeights =
            records
              .map(
                (record) =>
                  Number(
                    record.observedWeight
                  )
              )
              .filter(
                (value) =>
                  Number.isFinite(
                    value
                  )
              );

          if (
            !observedWeights.length
          ) {
            return;
          }

          const minimumWeight =
            Math.min(
              ...observedWeights
            );

          const maximumWeight =
            Math.max(
              ...observedWeights
            );

          const maximumDifference =
            maximumWeight -
            minimumWeight;

          const inspection =
            inspections.find(
              (item) =>
                item.id ===
                inspectionId
            );

          const instrument =
            instruments.find(
              (item) =>
                item.id ===
                inspection?.instrumentId
            );

          const centerRecord =
            records.find(
              (record) =>
                normalizePosition(
                  record.position
                ) === "CENTER"
            );

          result.push({
            inspectionId,

            instrumentId:
              inspection?.instrumentId ??
              null,

            serialNumber:
              instrument?.serialNumber ||
              "Unknown",

            readings:
              records.length,

            minimumWeight:
              Number(
                minimumWeight.toFixed(
                  4
                )
              ),

            maximumWeight:
              Number(
                maximumWeight.toFixed(
                  4
                )
              ),

            maximumDifference:
              Number(
                maximumDifference.toFixed(
                  4
                )
              ),

            centerWeight:
              centerRecord
                ? Number(
                    Number(
                      centerRecord.observedWeight
                    ).toFixed(4)
                  )
                : null,
          });
        }
      );

      return result.sort(
        (a, b) =>
          b.maximumDifference -
          a.maximumDifference
      );
    }, [
      eccentricityRecords,
      inspections,
      instruments,
    ]);

  /* ======================================================== */
  /* POSITION-WISE ECCENTRICITY */
  /* ======================================================== */

  const eccentricityPositionData =
    useMemo(() => {
      const positions = [
  "CENTER",
  "LEFT",
  "RIGHT",
  "FRONT",
  "BACK",
];

      return positions.map(
        (position) => {
          const records =
            eccentricityRecords.filter(
              (record) =>
                normalizePosition(
                  record.position
                ) === position
            );

          if (!records.length) {
            return {
              position,
              average: 0,
              minimum: 0,
              maximum: 0,
            };
          }

          const values =
            records
              .map(
                (record) =>
                  Number(
                    record.observedWeight
                  )
              )
              .filter(
                (value) =>
                  Number.isFinite(
                    value
                  )
              );

          if (!values.length) {
            return {
              position,
              average: 0,
              minimum: 0,
              maximum: 0,
            };
          }

          const average =
            values.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            values.length;

          return {
            position,

            average:
              Number(
                average.toFixed(4)
              ),

            minimum:
              Number(
                Math.min(
                  ...values
                ).toFixed(4)
              ),

            maximum:
              Number(
                Math.max(
                  ...values
                ).toFixed(4)
              ),
          };
        }
      );
    }, [
      eccentricityRecords,
    ]);

  /* ======================================================== */
  /* ECCENTRICITY METRICS */
  /* ======================================================== */

  const eccentricityMetrics =
    useMemo(() => {
      if (
        !eccentricityRecords.length
      ) {
        return {
          inspections: 0,
          readings: 0,
          maximumDifference: 0,
          averageDifference: 0,
        };
      }

      const differences =
        eccentricitySummary.map(
          (item) =>
            item.maximumDifference
        );

      const averageDifference =
        differences.length
          ? differences.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            differences.length
          : 0;

      const maximumDifference =
        differences.length
          ? Math.max(
              ...differences
            )
          : 0;

      return {
        inspections:
          eccentricitySummary.length,

        readings:
          eccentricityRecords.length,

        maximumDifference:
          Number(
            maximumDifference.toFixed(
              4
            )
          ),

        averageDifference:
          Number(
            averageDifference.toFixed(
              4
            )
          ),
      };
    }, [
      eccentricityRecords,
      eccentricitySummary,
    ]);

  /* ======================================================== */
  /* STEP 11 — REPEATABILITY */
  /* ======================================================== */

  const repeatabilitySummary =
    useMemo(() => {
      const groups =
        new Map<
          number,
          RepeatabilityRecord[]
        >();

      repeatabilityRecords.forEach(
        (record) => {
          const existing =
            groups.get(
              record.inspectionId
            ) || [];

          existing.push(record);

          groups.set(
            record.inspectionId,
            existing
          );
        }
      );

      const result: RepeatabilitySummary[] =
  [];

groups.forEach(
  (
    records,
    inspectionId
  ) => {

    /*
     * Keep only records that have
     * a valid testRunId.
     *
     * Records with null testRunId
     * are incomplete / old records.
     */
    const validRecords =
      records.filter(
        (record) =>
          record.testRunId !== null &&
          record.testRunId !== undefined &&
          Number.isFinite(
            Number(record.testRunId)
          )
      );

    if (!validRecords.length) {
      return;
    }

    /*
     * Group records by testRunId.
     *
     * This allows one inspection to have
     * multiple repeatability test runs.
     */
    const runGroups =
      new Map<
        number,
        RepeatabilityRecord[]
      >();

    validRecords.forEach(
      (record) => {

        const testRunId =
          Number(
            record.testRunId
          );

        const existing =
          runGroups.get(
            testRunId
          ) || [];

        existing.push(
          record
        );

        runGroups.set(
          testRunId,
          existing
        );
      }
    );

    /*
     * Find one complete repeatability run.
     *
     * A valid run must contain:
     * Reading 1
     * Reading 2
     * Reading 3
     * Reading 4
     * Reading 5
     */
    const completeRun =
      [...runGroups.values()].find(
        (runRecords) => {

          if (
            runRecords.length !== 5
          ) {
            return false;
          }

          const readingNumbers =
            runRecords
              .map(
                (record) =>
                  Number(
                    record.readingNumber
                  )
              )
              .sort(
                (a, b) =>
                  a - b
              );

          return (
            readingNumbers[0] === 1 &&
            readingNumbers[1] === 2 &&
            readingNumbers[2] === 3 &&
            readingNumbers[3] === 4 &&
            readingNumbers[4] === 5
          );
        }
      );

    /*
     * No complete run means
     * incomplete repeatability data.
     */
    if (!completeRun) {
      return;
    }

    /*
     * Extract observed weights
     * from the complete run only.
     */
    const values =
      completeRun
        .map(
          (record) =>
            Number(
              record.observedWeight
            )
        )
        .filter(
          (value) =>
            Number.isFinite(
              value
            )
        );

    /*
     * Safety check:
     * exactly 5 valid measurements required.
     */
    if (
      values.length !== 5
    ) {
      return;
    }

    /*
     * Calculate minimum weight.
     */
    const minimumWeight =
      Math.min(
        ...values
      );

    /*
     * Calculate maximum weight.
     */
    const maximumWeight =
      Math.max(
        ...values
      );

    /*
     * Calculate average weight.
     */
    const averageWeight =
      values.reduce(
        (sum, value) =>
          sum + value,
        0
      ) /
      values.length;

    /*
     * Calculate repeatability range.
     */
    const range =
      maximumWeight -
      minimumWeight;

    /*
     * Find inspection.
     */
    const inspection =
      inspections.find(
        (item) =>
          item.id ===
          inspectionId
      );

    /*
     * Find related instrument.
     */
    const instrument =
      instruments.find(
        (item) =>
          item.id ===
          inspection?.instrumentId
      );

    /*
     * Add complete run to analytics.
     */
    result.push({
      inspectionId,

      instrumentId:
        inspection?.instrumentId ??
        null,

      serialNumber:
        instrument?.serialNumber ||
        "Unknown",

      readings:
        values.length,

      averageWeight:
        Number(
          averageWeight.toFixed(
            4
          )
        ),

      minimumWeight:
        Number(
          minimumWeight.toFixed(
            4
          )
        ),

      maximumWeight:
        Number(
          maximumWeight.toFixed(
            4
          )
        ),

      range:
        Number(
          range.toFixed(
            4
          )
        ),
    });
  }
);

return result.sort(
  (a, b) =>
    b.range -
    a.range
);
}, [
  repeatabilityRecords,
  inspections,
  instruments,
]);
  /* ======================================================== */
  /* REPEATABILITY METRICS */
  /* ======================================================== */

  const repeatabilityMetrics =
    useMemo(() => {
      if (
        !repeatabilityRecords.length
      ) {
        return {
          inspections: 0,
          readings: 0,
          averageRange: 0,
          maximumRange: 0,
        };
      }

      const ranges =
        repeatabilitySummary.map(
          (item) =>
            item.range
        );

      const averageRange =
        ranges.length
          ? ranges.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            ranges.length
          : 0;

      const maximumRange =
        ranges.length
          ? Math.max(...ranges)
          : 0;

      return {
        inspections:
          repeatabilitySummary.length,

        readings:
          repeatabilitySummary.reduce(
            (sum, item) =>
              sum + Number(item.readings || 0),
            0
          ),

        averageRange:
          Number(
            averageRange.toFixed(
              4
            )
          ),

        maximumRange:
          Number(
            maximumRange.toFixed(
              4
            )
          ),
      };
    }, [
      repeatabilityRecords,
      repeatabilitySummary,
    ]);  


/* ======================================================== */
/* COMBINED TEST METRICS */
/* ======================================================== */

const combinedTestMetrics = useMemo(() => {
  const weighingPerformanceCount = tests.length;

  const repeatabilityCount =
    repeatabilitySummary.length;

  const eccentricityCount =
    eccentricitySummary.length;

  const totalTests =
    weighingPerformanceCount +
    repeatabilityCount +
    eccentricityCount;

  return {
    weighingPerformanceCount,
    repeatabilityCount,
    eccentricityCount,
    totalTests,
  };
}, [
  tests,
  repeatabilitySummary,
  eccentricitySummary,
]);

/* ======================================================== */
/* EXPLAINABLE RISK ANALYSIS */
/* ======================================================== */

const explainableRisk = useMemo(() => {
  if (selectedInstrumentId === "") {
    return null;
  }

  const instrument = instruments.find(
    (item) => item.id === selectedInstrumentId
  );

  if (!instrument) {
    return null;
  }

  const instrumentInspections = inspections.filter(
    (item) => item.instrumentId === selectedInstrumentId
  );

  const inspectionIds = new Set(
    instrumentInspections.map((item) => item.id)
  );

  const instrumentTests = tests.filter((test) =>
    inspectionIds.has(test.inspectionId)
  );

  const passedInspections = instrumentInspections.filter(
    (item) => String(item.overallResult || "").toUpperCase() === "PASS"
  ).length;

  const passRate = instrumentInspections.length
    ? (passedInspections / instrumentInspections.length) * 100
    : null;

  const errors = instrumentTests
    .map((test) => Math.abs(num(test.error)))
    .filter((value) => Number.isFinite(value));

  const mpes = instrumentTests
    .map((test) => Math.abs(num(test.mpe)))
    .filter((value) => Number.isFinite(value) && value > 0);

  const averageError = errors.length
    ? errors.reduce((sum, value) => sum + value, 0) / errors.length
    : null;

  const averageMpe = mpes.length
    ? mpes.reduce((sum, value) => sum + value, 0) / mpes.length
    : null;

  const errorRatio =
    averageError !== null && averageMpe !== null && averageMpe > 0
      ? averageError / averageMpe
      : null;

  const repeatability = repeatabilitySummary.filter(
    (item) => item.instrumentId === selectedInstrumentId
  );

  const maximumRepeatabilityRange = repeatability.length
    ? Math.max(...repeatability.map((item) => num(item.range)))
    : null;

  const scaleInterval = num(instrument.scaleInterval);

  const repeatabilityRatio =
    maximumRepeatabilityRange !== null && scaleInterval > 0
      ? maximumRepeatabilityRange / scaleInterval
      : null;

  const eccentricity = eccentricitySummary.filter(
    (item) => item.instrumentId === selectedInstrumentId
  );

  const maximumEccentricitySpread = eccentricity.length
    ? Math.max(...eccentricity.map((item) => num(item.maximumDifference)))
    : null;

  const eccentricityRatio =
    maximumEccentricitySpread !== null && scaleInterval > 0
      ? maximumEccentricitySpread / scaleInterval
      : null;

  const datedTests = instrumentTests
    .filter((test) => test.createdAt && !Number.isNaN(new Date(test.createdAt).getTime()))
    .sort(
      (a, b) =>
        new Date(a.createdAt!).getTime() -
        new Date(b.createdAt!).getTime()
    );

  let trend = "NO DATA";

  if (datedTests.length >= 2) {
    const split = Math.max(1, Math.floor(datedTests.length / 2));
    const first = datedTests.slice(0, split);
    const latest = datedTests.slice(split);

    const avg = (items: TestRecord[]) =>
      items.reduce((sum, item) => sum + Math.abs(num(item.error)), 0) /
      Math.max(items.length, 1);

    const firstAverage = avg(first);
    const latestAverage = avg(latest);
    const difference = latestAverage - firstAverage;

    trend =
      difference > 0.0005
        ? "INCREASING"
        : difference < -0.0005
          ? "DECREASING"
          : "STABLE";
  }

  return {
    instrument,
    passRate,
    averageError,
    averageMpe,
    errorRatio,
    maximumRepeatabilityRange,
    repeatabilityRatio,
    maximumEccentricitySpread,
    eccentricityRatio,
    trend,
    backendRisk: selectedRiskResult?.riskLevel || "UNKNOWN",
    backendRiskScore: selectedRiskResult?.riskScore ?? null,
  };
}, [
  selectedInstrumentId,
  instruments,
  inspections,
  tests,
  repeatabilitySummary,
  eccentricitySummary,
  selectedRiskResult,
]);

/* ======================================================== */
/* CURRENT INSPECTION ANALYSIS */
/* ======================================================== */

const [selectedInspectionId, setSelectedInspectionId] =
  useState<number | "">("");


const currentInspection =
  useMemo(() => {

    if (selectedInspectionId === "") {
      return null;
    }

    const inspection =
      inspections.find(
        (item) =>
          item.id === selectedInspectionId
      );

    if (!inspection) {
      return null;
    }

    const instrument =
      instruments.find(
        (item) =>
          item.id === inspection.instrumentId
      );

    const inspectionTests =
      tests.filter(
        (test) =>
          test.inspectionId ===
          inspection.id
      );

    const weighingTests =
      inspectionTests.filter(
        (test) =>
          String(
            test.testType
          ).toUpperCase() ===
          "WEIGHING_PERFORMANCE"
      );

    const finalWeighing =
      weighingTests.length > 0
        ? weighingTests[
            weighingTests.length - 1
          ]
        : null;

    const inspectionRepeatability =
      repeatabilityRecords.filter(
        (record) =>
          record.inspectionId ===
          inspection.id
      );

    const validRepeatability =
      inspectionRepeatability.filter(
        (record) =>
          record.testRunId !== null &&
          record.testRunId !== undefined
      );

    const runGroups =
      new Map<
        number,
        RepeatabilityRecord[]
      >();

    validRepeatability.forEach(
      (record) => {

        const runId =
          Number(
            record.testRunId
          );

        const existing =
          runGroups.get(
            runId
          ) || [];

        existing.push(
          record
        );

        runGroups.set(
          runId,
          existing
        );
      }
    );

    const completeRun =
      [...runGroups.values()].find(
        (records) => {

          if (
            records.length !== 5
          ) {
            return false;
          }

          const readingNumbers =
            records
              .map(
                (record) =>
                  Number(
                    record.readingNumber
                  )
              )
              .sort(
                (a, b) =>
                  a - b
              );

          return (
            readingNumbers[0] === 1 &&
            readingNumbers[1] === 2 &&
            readingNumbers[2] === 3 &&
            readingNumbers[3] === 4 &&
            readingNumbers[4] === 5
          );
        }
      );

    const repeatabilityValues =
      completeRun
        ? completeRun
            .map(
              (record) =>
                Number(
                  record.observedWeight
                )
            )
            .filter(
              (value) =>
                Number.isFinite(
                  value
                )
            )
        : [];

    const repeatabilityAverage =
      repeatabilityValues.length
        ? repeatabilityValues.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          repeatabilityValues.length
        : null;

    const repeatabilityRange =
      repeatabilityValues.length
        ? Math.max(
            ...repeatabilityValues
          ) -
          Math.min(
            ...repeatabilityValues
          )
        : null;

    const inspectionEccentricity =
      eccentricityRecords.filter(
        (record) =>
          record.inspectionId ===
          inspection.id
      );

    const eccentricityValues =
      inspectionEccentricity
        .map(
          (record) =>
            Number(
              record.observedWeight
            )
        )
        .filter(
          (value) =>
            Number.isFinite(
              value
            )
        );

    const eccentricityMaximumDifference =
      eccentricityValues.length
        ? Math.max(
            ...eccentricityValues
          ) -
          Math.min(
            ...eccentricityValues
          )
        : null;

    const environment =
      environmentRecords
        .filter(
          (record) =>
            record.inspectionId ===
            inspection.id
        )
        .slice(-1)[0] || null;

    const inspectionAuditLogs =
      auditLogs
        .filter(
          (log) =>
            normalizeAuditText(
              log.entity
            ) === "INSPECTION" &&
            Number(
              log.entityId
            ) === inspection.id
        )
        .sort(
          (a, b) => {

            const first =
              a.timestamp
                ? new Date(
                    a.timestamp
                  ).getTime()
                : 0;

            const second =
              b.timestamp
                ? new Date(
                    b.timestamp
                  ).getTime()
                : 0;

            return (
              first - second
            );
          }
        );

    return {
      inspection,
      instrument,

      tests:
        inspectionTests,

      weighingTests,

      finalWeighing,

      repeatabilityValues,

      repeatabilityAverage,

      repeatabilityRange,

      eccentricityRecords:
        inspectionEccentricity,

      eccentricityMaximumDifference,

      environment,

      auditLogs:
        inspectionAuditLogs,
    };

  }, [
    selectedInspectionId,
    inspections,
    instruments,
    tests,
    repeatabilityRecords,
    eccentricityRecords,
    environmentRecords,
    auditLogs,
  ]);

  /* ======================================================== */
  /* ======================================================== */
/* DEFAULT CURRENT INSPECTION */
/* ======================================================== */

  useEffect(() => {
    if (selectedInspectionId !== "" || inspections.length === 0) return;
    const latestInspection = [...inspections].sort((a, b) => Number(b.id) - Number(a.id))[0];
    if (latestInspection) setSelectedInspectionId(latestInspection.id);
  }, [selectedInspectionId, inspections]);

  /* READING-WISE REPEATABILITY */
  /* ======================================================== */

  const repeatabilityReadingData =
    useMemo(() => {
      const groups =
        new Map<
          number,
          RepeatabilityRecord[]
        >();

      repeatabilityRecords.forEach(
        (record) => {
          const existing =
            groups.get(
              record.readingNumber
            ) || [];

          existing.push(record);

          groups.set(
            record.readingNumber,
            existing
          );
        }
      );

      return [...groups.entries()]
        .sort(
          (a, b) =>
            a[0] - b[0]
        )
        .map(
          ([
            readingNumber,
            records,
          ]) => {
            const values =
              records
                .map(
                  (record) =>
                    Number(
                      record.observedWeight
                    )
                )
                .filter(
                  (value) =>
                    Number.isFinite(
                      value
                    )
                );

            const average =
              values.length
                ? values.reduce(
                    (
                      sum,
                      value
                    ) =>
                      sum + value,
                    0
                  ) /
                  values.length
                : 0;

            return {
              reading:
                `Reading ${readingNumber}`,

              average:
                Number(
                  average.toFixed(
                    4
                  )
                ),
            };
          }
        );
    }, [
      repeatabilityRecords,
    ]);

  /* ======================================================== */
  /* STEP 12 — AUDIT METRICS */
  /* ======================================================== */

  const auditMetrics =
    useMemo(() => {
      if (!auditLogs.length) {
        return {
          totalEvents: 0,
          uniqueUsers: 0,
          uniqueEntities: 0,
          recentEvents: 0,
        };
      }

      const users =
        new Set<number>();

      const entities =
        new Set<string>();

      const now =
        Date.now();

      let recentEvents =
        0;

      auditLogs.forEach(
        (log) => {
          if (
            Number.isFinite(
              Number(
                log.userId
              )
            )
          ) {
            users.add(
              Number(
                log.userId
              )
            );
          }

          const entityKey =
            `${normalizeAuditText(
              log.entity
            )}-${log.entityId}`;

          entities.add(
            entityKey
          );

          if (
            log.timestamp
          ) {
            const timestamp =
              new Date(
                log.timestamp
              ).getTime();

            if (
              Number.isFinite(
                timestamp
              ) &&
              now - timestamp <=
                24 *
                  60 *
                  60 *
                  1000
            ) {
              recentEvents++;
            }
          }
        }
      );

      return {
        totalEvents:
          auditLogs.length,

        uniqueUsers:
          users.size,

        uniqueEntities:
          entities.size,

        recentEvents,
      };
    }, [auditLogs]);

  /* ======================================================== */
  /* AUDIT ACTION DATA */
  /* ======================================================== */

  const auditActionData =
    useMemo(() => {
      const counts =
        new Map<
          string,
          number
        >();

      auditLogs.forEach(
        (log) => {
          const action =
            normalizeAuditText(
              log.action
            ) || "UNKNOWN";

          counts.set(
            action,
            (counts.get(
              action
            ) || 0) + 1
          );
        }
      );

      return [...counts.entries()]
        .map(
          ([
            action,
            count,
          ]) => ({
            action,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count -
            a.count
        );
    }, [auditLogs]);

  /* ======================================================== */
  /* AUDIT ENTITY DATA */
  /* ======================================================== */

  const auditEntityData =
    useMemo(() => {
      const counts =
        new Map<
          string,
          number
        >();

      auditLogs.forEach(
        (log) => {
          const entity =
            normalizeAuditText(
              log.entity
            ) || "UNKNOWN";

          counts.set(
            entity,
            (counts.get(
              entity
            ) || 0) + 1
          );
        }
      );

      return [...counts.entries()]
        .map(
          ([
            entity,
            count,
          ]) => ({
            entity,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count -
            a.count
        );
    }, [auditLogs]);

  /* ======================================================== */
  /* AUDIT USER DATA */
  /* ======================================================== */

  const auditUserData =
    useMemo(() => {
      const counts =
        new Map<
          number,
          number
        >();

      auditLogs.forEach(
        (log) => {
          const userId =
            Number(
              log.userId
            );

          if (
            !Number.isFinite(
              userId
            )
          ) {
            return;
          }

          counts.set(
            userId,
            (counts.get(
              userId
            ) || 0) + 1
          );
        }
      );

      return [...counts.entries()]
        .map(
          ([
            userId,
            count,
          ]) => ({
            user:
              `User ${userId}`,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count -
            a.count
        );
    }, [auditLogs]);

  /* ======================================================== */
  /* AUDIT DATE DATA */
  /* ======================================================== */

  const auditDateData =
    useMemo(() => {
      const counts =
        new Map<
          string,
          number
        >();

      auditLogs.forEach(
        (log) => {
          if (!log.timestamp) {
            return;
          }

          const date =
            new Date(
              log.timestamp
            );

          if (
            Number.isNaN(
              date.getTime()
            )
          ) {
            return;
          }

          const formatted =
            formatDate(
              log.timestamp
            );

          counts.set(
            formatted,
            (counts.get(
              formatted
            ) || 0) + 1
          );
        }
      );

      return [...counts.entries()]
        .map(
          ([
            date,
            count,
          ]) => ({
            date,
            count,
          })
        );
    }, [auditLogs]);

  /* ======================================================== */
  /* RECENT AUDIT LOGS */
  /* ======================================================== */

  const recentAuditLogs =
    useMemo(() => {
      return [...auditLogs]
        .sort(
          (a, b) => {
            const first =
              a.timestamp
                ? new Date(
                    a.timestamp
                  ).getTime()
                : 0;

            const second =
              b.timestamp
                ? new Date(
                    b.timestamp
                  ).getTime()
                : 0;

            return (
              second - first
            );
          }
        )
        .slice(0, 10);
    }, [auditLogs]);

  /* ======================================================== */
  /* AUDIT CHANGE METRICS */
  /* ======================================================== */

  const auditChangeMetrics =
    useMemo(() => {
      const changes =
        auditLogs.filter(
          (log) =>
            log.oldValue !==
              null &&
            log.oldValue !==
              undefined &&
            log.newValue !==
              null &&
            log.newValue !==
              undefined
        );

      return {
        totalChanges:
          changes.length,

        changePercentage:
          auditLogs.length
            ? Number(
                (
                  (changes.length /
                    auditLogs.length) *
                  100
                ).toFixed(2)
              )
            : 0,
      };
    }, [auditLogs]);

  /* ======================================================== */
  /* OUTCOME DATA */
  /* ======================================================== */

  const outcomeData = [
    {
      name: "Inspections",

      Pass:
        analytics.passInspections,

      Fail:
        analytics.failInspections,

      Pending:
        analytics.pendingInspections,
    },

    {
      name: "Tests",

      Pass:
        analytics.passTestRecords,

      Fail:
        analytics.failTestRecords,

      Pending: 0,
    },
  ];



  /* ======================================================== */
  /* PHASE 1 — BETTER ANALYTICS */
  /* ======================================================== */

  const betterAnalytics = useMemo(() => {
    const normalizedInspections = inspections.map((inspection) => ({
      ...inspection,
      result: String(inspection.overallResult || "PENDING").toUpperCase(),
    }));

    const passed = normalizedInspections.filter(
      (item) => item.result === "PASS"
    ).length;

    const failed = normalizedInspections.filter(
      (item) => item.result === "FAIL"
    ).length;

    const pending = normalizedInspections.filter(
      (item) => !["PASS", "FAIL"].includes(item.result)
    ).length;

    const inspectionPassRate = normalizedInspections.length
      ? Number(((passed / normalizedInspections.length) * 100).toFixed(1))
      : 0;

    const testResults = tests.map((test) =>
      String(test.result || "PENDING").toUpperCase()
    );

    const passedTests = testResults.filter((result) => result === "PASS").length;
    const failedTests = testResults.filter((result) => result === "FAIL").length;
    const pendingTests = testResults.filter(
      (result) => !["PASS", "FAIL"].includes(result)
    ).length;

    const testPassRate = tests.length
      ? Number(((passedTests / tests.length) * 100).toFixed(1))
      : 0;

    const errorValues = tests
      .map((test) => Math.abs(num(test.error)))
      .filter((value) => Number.isFinite(value));

    const averageAbsoluteError = errorValues.length
      ? Number(
          (
            errorValues.reduce((sum, value) => sum + value, 0) /
            errorValues.length
          ).toFixed(4)
        )
      : 0;

    const maximumAbsoluteError = errorValues.length
      ? Number(Math.max(...errorValues).toFixed(4))
      : 0;

    const latestTests = [...tests]
      .filter((test) => test.createdAt)
      .sort(
        (a, b) =>
          new Date(b.createdAt!).getTime() -
          new Date(a.createdAt!).getTime()
      );

    const recentActivity = latestTests.slice(0, 6).map((test) => {
      const inspection = inspections.find(
        (item) => item.id === test.inspectionId
      );
      const instrument = instruments.find(
        (item) => item.id === inspection?.instrumentId
      );

      return {
        id: test.id,
        inspectionId: test.inspectionId,
        serialNumber:
          instrument?.serialNumber ||
          `Instrument ${inspection?.instrumentId ?? "—"}`,
        testType: String(test.testType || "TEST").replace(/_/g, " "),
        result: String(test.result || "PENDING").toUpperCase(),
        error: Number(Math.abs(num(test.error)).toFixed(4)),
        createdAt: test.createdAt,
      };
    });

    const testTrendMap = new Map<
      string,
      { date: string; passed: number; failed: number; total: number }
    >();

    latestTests.forEach((test) => {
      if (!test.createdAt) return;

      const date = new Date(test.createdAt);
      if (Number.isNaN(date.getTime())) return;

      const key = date.toISOString().slice(0, 10);
      const existing = testTrendMap.get(key) || {
        date: formatDate(test.createdAt),
        passed: 0,
        failed: 0,
        total: 0,
      };

      const result = String(test.result || "PENDING").toUpperCase();

      existing.total += 1;
      if (result === "PASS") existing.passed += 1;
      if (result === "FAIL") existing.failed += 1;

      testTrendMap.set(key, existing);
    });

    const trendData = [...testTrendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([, value]) => value);

    const instrumentPerformance = instruments
      .map((instrument) => {
        const instrumentInspections = inspections.filter(
          (inspection) => inspection.instrumentId === instrument.id
        );

        const inspectionIds = new Set(
          instrumentInspections.map((inspection) => inspection.id)
        );

        const instrumentTests = tests.filter((test) =>
          inspectionIds.has(test.inspectionId)
        );

        const passedInspections = instrumentInspections.filter(
          (inspection) =>
            String(inspection.overallResult || "").toUpperCase() === "PASS"
        ).length;

        const instrumentPassRate = instrumentInspections.length
          ? Number(
              (
                (passedInspections / instrumentInspections.length) *
                100
              ).toFixed(1)
            )
          : 0;

        const instrumentErrors = instrumentTests
          .map((test) => Math.abs(num(test.error)))
          .filter((value) => Number.isFinite(value));

        const avgError = instrumentErrors.length
          ? Number(
              (
                instrumentErrors.reduce(
                  (sum, value) => sum + value,
                  0
                ) / instrumentErrors.length
              ).toFixed(4)
            )
          : 0;

        const instrumentIndex = instruments.findIndex(
          (item) => item.id === instrument.id
        );

        return {
          id: instrument.id,
          serialNumber: instrument.serialNumber || `#${instrument.id}`,
          model: instrument.model || "Unknown model",
          inspections: instrumentInspections.length,
          tests: instrumentTests.length,
          passRate: instrumentPassRate,
          averageError: avgError,
          risk: String(
            riskLevels[instrumentIndex] || "UNKNOWN"
          ).toUpperCase(),
        };
      })
      .filter((item) => item.inspections > 0)
      .sort((a, b) => {
        if (b.inspections !== a.inspections) {
          return b.inspections - a.inspections;
        }
        return b.passRate - a.passRate;
      })
      .slice(0, 8);

    const environmentValues = environmentRecords.filter(
      (record) =>
        record.temperature !== null ||
        record.humidity !== null ||
        record.vibration !== null
    );

    const temperatures = environmentValues
      .map((record) => record.temperature)
      .filter((value): value is number => value !== null && Number.isFinite(num(value)));

    const humidities = environmentValues
      .map((record) => record.humidity)
      .filter((value): value is number => value !== null && Number.isFinite(num(value)));

    const vibrations = environmentValues
      .map((record) => record.vibration)
      .filter((value): value is number => value !== null && Number.isFinite(num(value)));

    const avgTemperature = temperatures.length
      ? Number(
          (
            temperatures.reduce((sum, value) => sum + num(value), 0) /
            temperatures.length
          ).toFixed(1)
        )
      : 0;

    const avgHumidity = humidities.length
      ? Number(
          (
            humidities.reduce((sum, value) => sum + num(value), 0) /
            humidities.length
          ).toFixed(1)
        )
      : 0;

    const avgVibration = vibrations.length
      ? Number(
          (
            vibrations.reduce((sum, value) => sum + num(value), 0) /
            vibrations.length
          ).toFixed(3)
        )
      : 0;

    const riskSummary = riskLevels.reduce(
      (acc, level) => {
        const normalized = String(level || "UNKNOWN").toUpperCase();

        if (normalized === "LOW") acc.low += 1;
        else if (normalized === "MEDIUM") acc.medium += 1;
        else if (normalized === "HIGH") acc.high += 1;
        else acc.unknown += 1;

        return acc;
      },
      { low: 0, medium: 0, high: 0, unknown: 0 }
    );

    return {
      passed,
      failed,
      pending,
      inspectionPassRate,
      passedTests,
      failedTests,
      pendingTests,
      testPassRate,
      averageAbsoluteError,
      maximumAbsoluteError,
      recentActivity,
      trendData,
      instrumentPerformance,
      environmentCount: environmentValues.length,
      avgTemperature,
      avgHumidity,
      avgVibration,
      riskSummary,
    };
  }, [
    inspections,
    tests,
    instruments,
    environmentRecords,
    riskLevels,
  ]);

  const betterOutcomeData = [
    {
      name: "Inspections",
      pass: betterAnalytics.passed,
      fail: betterAnalytics.failed,
      pending: betterAnalytics.pending,
    },
    {
      name: "Tests",
      pass: betterAnalytics.passedTests,
      fail: betterAnalytics.failedTests,
      pending: betterAnalytics.pendingTests,
    },
  ];


  /* ======================================================== */
  /* PHASE 2 — ENVIRONMENT VS ERROR ANALYSIS */
  /* ======================================================== */

  const environmentErrorAnalysis = useMemo(() => {
    type EnvironmentGroup = {
      temperature: number[];
      humidity: number[];
      vibration: number[];
    };

    const groupedEnvironment = new Map<number, EnvironmentGroup>();

    environmentRecords.forEach((record) => {
      const inspectionId = Number(record.inspectionId);
      if (!Number.isFinite(inspectionId)) return;

      const group = groupedEnvironment.get(inspectionId) || {
        temperature: [],
        humidity: [],
        vibration: [],
      };

      if (record.temperature !== null && Number.isFinite(Number(record.temperature))) {
        group.temperature.push(Number(record.temperature));
      }
      if (record.humidity !== null && Number.isFinite(Number(record.humidity))) {
        group.humidity.push(Number(record.humidity));
      }
      if (record.vibration !== null && Number.isFinite(Number(record.vibration))) {
        group.vibration.push(Number(record.vibration));
      }

      groupedEnvironment.set(inspectionId, group);
    });

    const testsByInspection = new Map<number, number[]>();

    tests.forEach((test) => {
      const inspectionId = Number(test.inspectionId);
      const errorValue = Math.abs(Number(test.error));

      if (!Number.isFinite(inspectionId) || !Number.isFinite(errorValue)) return;

      const errors = testsByInspection.get(inspectionId) || [];
      errors.push(errorValue);
      testsByInspection.set(inspectionId, errors);
    });

    const average = (values: number[]) =>
      values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null;

    const points = Array.from(groupedEnvironment.entries())
      .map(([inspectionId, environment]) => {
        const errors = testsByInspection.get(inspectionId) || [];
        if (!errors.length) return null;

        return {
          inspectionId,
          temperature: average(environment.temperature),
          humidity: average(environment.humidity),
          vibration: average(environment.vibration),
          error: average(errors),
        };
      })
      .filter(
        (point): point is {
          inspectionId: number;
          temperature: number | null;
          humidity: number | null;
          vibration: number | null;
          error: number | null;
        } => point !== null
      );

    const correlation = (values: Array<{ x: number; y: number }>) => {
      if (values.length < 2) return null;

      const meanX = values.reduce((sum, item) => sum + item.x, 0) / values.length;
      const meanY = values.reduce((sum, item) => sum + item.y, 0) / values.length;

      let numerator = 0;
      let denominatorX = 0;
      let denominatorY = 0;

      values.forEach((item) => {
        const dx = item.x - meanX;
        const dy = item.y - meanY;
        numerator += dx * dy;
        denominatorX += dx * dx;
        denominatorY += dy * dy;
      });

      if (denominatorX === 0 || denominatorY === 0) return null;

      return Number((numerator / Math.sqrt(denominatorX * denominatorY)).toFixed(3));
    };

    const temperaturePoints = points
      .filter((point) => point.temperature !== null && point.error !== null)
      .map((point) => ({
        inspectionId: point.inspectionId,
        temperature: Number(point.temperature!.toFixed(2)),
        error: Number(point.error!.toFixed(4)),
      }));

    const humidityPoints = points
      .filter((point) => point.humidity !== null && point.error !== null)
      .map((point) => ({
        inspectionId: point.inspectionId,
        humidity: Number(point.humidity!.toFixed(2)),
        error: Number(point.error!.toFixed(4)),
      }));

    const vibrationPoints = points
      .filter((point) => point.vibration !== null && point.error !== null)
      .map((point) => ({
        inspectionId: point.inspectionId,
        vibration: Number(point.vibration!.toFixed(3)),
        error: Number(point.error!.toFixed(4)),
      }));

    const averageError = points
      .map((point) => point.error)
      .filter((value): value is number => value !== null);

    return {
      matchedInspections: points.length,
      environmentRecords: environmentRecords.length,
      temperaturePoints,
      humidityPoints,
      vibrationPoints,
      averageError: average(averageError) || 0,
      temperatureCorrelation: correlation(
        temperaturePoints.map((point) => ({ x: point.temperature, y: point.error }))
      ),
      humidityCorrelation: correlation(
        humidityPoints.map((point) => ({ x: point.humidity, y: point.error }))
      ),
      vibrationCorrelation: correlation(
        vibrationPoints.map((point) => ({ x: point.vibration, y: point.error }))
      ),
    };
  }, [environmentRecords, tests]);

  /* ======================================================== */
  /* PHASE 2 — ERROR TREND ANALYSIS */
  /* ======================================================== */

  const errorTrendAnalysis = useMemo(() => {
    type DayBucket = {
      dateKey: string;
      date: string;
      errors: number[];
      passed: number;
      failed: number;
      total: number;
    };

    const buckets = new Map<string, DayBucket>();

    tests.forEach((test) => {
      if (!test.createdAt) return;
      const date = new Date(test.createdAt);
      if (Number.isNaN(date.getTime())) return;

      const dateKey = date.toISOString().slice(0, 10);
      const existing = buckets.get(dateKey) || {
        dateKey, date: formatDate(test.createdAt), errors: [], passed: 0, failed: 0, total: 0,
      };

      const absoluteError = Math.abs(Number(test.error));
      if (Number.isFinite(absoluteError)) existing.errors.push(absoluteError);

      const result = String(test.result || "PENDING").toUpperCase();
      existing.total += 1;
      if (result === "PASS") existing.passed += 1;
      if (result === "FAIL") existing.failed += 1;
      buckets.set(dateKey, existing);
    });

    const dailyData = [...buckets.values()]
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map((day) => {
        const averageError = day.errors.length
          ? day.errors.reduce((sum, value) => sum + value, 0) / day.errors.length
          : 0;
        const maximumError = day.errors.length ? Math.max(...day.errors) : 0;
        const passRate = day.total ? (day.passed / day.total) * 100 : 0;
        return {
          dateKey: day.dateKey, date: day.date,
          averageError: Number(averageError.toFixed(4)),
          maximumError: Number(maximumError.toFixed(4)),
          passRate: Number(passRate.toFixed(1)),
          total: day.total, passed: day.passed, failed: day.failed,
        };
      })
      .slice(-10);

    const firstError = dailyData[0]?.averageError ?? 0;
    const latestError = dailyData[dailyData.length - 1]?.averageError ?? 0;
    const errorChange = latestError - firstError;

    let direction = "STABLE";
    if (errorChange > 0.0005) direction = "INCREASING";
    else if (errorChange < -0.0005) direction = "DECREASING";

    const timestampedTests = dailyData.reduce((sum, item) => sum + item.total, 0);
    const passedTests = dailyData.reduce((sum, item) => sum + item.passed, 0);
    const overallPassRate = timestampedTests ? (passedTests / timestampedTests) * 100 : 0;
    const recentMaximum = dailyData.length ? Math.max(...dailyData.map((item) => item.maximumError)) : 0;

    return {
      dailyData, direction,
      errorChange: Number(errorChange.toFixed(4)),
      latestAverageError: Number(latestError.toFixed(4)),
      recentMaximum: Number(recentMaximum.toFixed(4)),
      overallPassRate: Number(overallPassRate.toFixed(1)),
      timestampedTests,
    };
  }, [tests]);

  /* LOADING */
  /* ======================================================== */

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2
          size={36}
          className="animate-spin text-blue-600"
        />
      </div>
    );
  }

  /* ======================================================== */
  /* UI */
  /* ======================================================== */

  return (
    <div className="space-y-6">

      {/* ==================================================== */}
      {/* HEADER */}
      {/* ==================================================== */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

        <div>
          <p className="text-sm font-bold text-blue-600">
            Research Analytics
          </p>

          <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">
            Advanced Analytics
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Compliance outcomes, environmental
            correlation, measurement drift,
            eccentricity behavior,
            repeatability analysis,
            instrument risk, predictive
            intelligence and complete
            audit-trail analytics.
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw size={17} />

          Refresh
        </button>
      </div>

      {/* ==================================================== */}
      {/* ERROR */}
      {/* ==================================================== */}

      {error && (
  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
    {error}
  </div>
)}


{/* ==================================================== */}
{/* PHASE 1 — BETTER ANALYTICS */}
{/* ==================================================== */}

<div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-lg">
  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <div className="flex items-center gap-2 text-sm font-black text-blue-300">
        <Sparkles size={17} />
        PHASE 1 • BETTER ANALYTICS
      </div>
      <h2 className="mt-2 text-2xl font-black md:text-3xl">
        SmartMetrix Operations Overview
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
        A compact dashboard for inspection outcomes, test quality, measurement
        error, instrument activity, environment coverage and risk.
      </p>
    </div>

    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        Data Coverage
      </p>
      <p className="mt-1 text-2xl font-black">
        {instruments.length} instruments
      </p>
      <p className="text-xs text-slate-400">
        {inspections.length} inspections • {tests.length} WP records
      </p>
    </div>
  </div>
</div>

<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <MetricCard
    title="Total Instruments"
    value={instruments.length}
    icon={<Scale size={22} />}
  />
  <MetricCard
    title="Total Inspections"
    value={inspections.length}
    icon={<ClipboardCheck size={22} />}
  />
  <MetricCard
    title="Inspection Pass Rate"
    value={`${betterAnalytics.inspectionPassRate}%`}
    icon={<CheckCircle2 size={22} />}
    positive={betterAnalytics.inspectionPassRate >= 80}
  />
  <MetricCard
    title="Average Absolute Error"
    value={betterAnalytics.averageAbsoluteError.toFixed(4)}
    icon={<Gauge size={22} />}
  />
</div>

<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
          Passed
        </p>
        <p className="mt-1 text-3xl font-black text-emerald-900">
          {betterAnalytics.passed}
        </p>
      </div>
      <CheckCircle2 className="text-emerald-600" size={28} />
    </div>
    <p className="mt-2 text-xs font-semibold text-emerald-700">
      {betterAnalytics.passedTests} test records also passed
    </p>
  </div>

  <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-red-700">
          Failed
        </p>
        <p className="mt-1 text-3xl font-black text-red-900">
          {betterAnalytics.failed}
        </p>
      </div>
      <XCircle className="text-red-600" size={28} />
    </div>
    <p className="mt-2 text-xs font-semibold text-red-700">
      {betterAnalytics.failedTests} test records failed
    </p>
  </div>

  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-amber-700">
          Pending / Other
        </p>
        <p className="mt-1 text-3xl font-black text-amber-900">
          {betterAnalytics.pending}
        </p>
      </div>
      <AlertTriangle className="text-amber-600" size={28} />
    </div>
    <p className="mt-2 text-xs font-semibold text-amber-700">
      {betterAnalytics.pendingTests} test records are not PASS/FAIL
    </p>
  </div>
</div>

<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
  <ChartCard
    title="Inspection & Test Outcomes"
    description="Side-by-side view of completed outcomes and pending records."
    icon={<BarChart3 size={20} />}
  >
    {betterOutcomeData.some(
      (item) => item.pass + item.fail + item.pending > 0
    ) ? (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={betterOutcomeData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="pass" name="Pass" fill="#16a34a" radius={[6, 6, 0, 0]} />
          <Bar dataKey="fail" name="Fail" fill="#dc2626" radius={[6, 6, 0, 0]} />
          <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <EmptyChart text="No outcome data available yet." />
    )}
  </ChartCard>

  <ChartCard
    title="Recent Test Activity"
    description="Latest timestamped weighing-performance measurements."
    icon={<History size={20} />}
  >
    {betterAnalytics.recentActivity.length ? (
      <div className="h-full overflow-auto pr-1">
        <div className="space-y-3">
          {betterAnalytics.recentActivity.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {item.serialNumber}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {item.testType}
                  </p>
                </div>

                <span
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${
                    item.result === "PASS"
                      ? "bg-emerald-100 text-emerald-700"
                      : item.result === "FAIL"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {item.result}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                <span>Inspection #{item.inspectionId}</span>
                <span>Abs. error {item.error.toFixed(4)}</span>
                <span>{formatDate(item.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <EmptyChart text="No timestamped test activity is available yet." />
    )}
  </ChartCard>
</div>

<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
        <Activity size={21} />
      </div>
      <div>
        <h3 className="font-black text-slate-900">Test Quality</h3>
        <p className="text-xs text-slate-500">Current system-level quality</p>
      </div>
    </div>

    <div className="mt-5 space-y-4">
      <ResearchRow label="Total test records" value={tests.length} />
      <ResearchRow label="Test pass rate" value={`${betterAnalytics.testPassRate}%`} />
      <ResearchRow label="Maximum abs. error" value={betterAnalytics.maximumAbsoluteError.toFixed(4)} />
      <ResearchRow label="Repeatability runs" value={repeatabilitySummary.length} />
      <ResearchRow label="Eccentricity inspections" value={eccentricitySummary.length} />
    </div>
  </div>

  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-cyan-50 p-3 text-cyan-600">
        <Thermometer size={21} />
      </div>
      <div>
        <h3 className="font-black text-slate-900">Environment Coverage</h3>
        <p className="text-xs text-slate-500">Observed during inspections</p>
      </div>
    </div>

    <div className="mt-5 space-y-4">
      <ResearchRow label="Environment records" value={betterAnalytics.environmentCount} />
      <ResearchRow label="Average temperature" value={`${betterAnalytics.avgTemperature.toFixed(1)} °C`} />
      <ResearchRow label="Average humidity" value={`${betterAnalytics.avgHumidity.toFixed(1)} %`} />
      <ResearchRow label="Average vibration" value={betterAnalytics.avgVibration.toFixed(3)} />
    </div>
  </div>

  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
        <ShieldAlert size={21} />
      </div>
      <div>
        <h3 className="font-black text-slate-900">Risk Overview</h3>
        <p className="text-xs text-slate-500">Current instrument risk categories</p>
      </div>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-emerald-50 p-4">
        <p className="text-xs font-black text-emerald-700">LOW</p>
        <p className="mt-1 text-2xl font-black text-emerald-900">
          {betterAnalytics.riskSummary.low}
        </p>
      </div>

      <div className="rounded-xl bg-amber-50 p-4">
        <p className="text-xs font-black text-amber-700">MEDIUM</p>
        <p className="mt-1 text-2xl font-black text-amber-900">
          {betterAnalytics.riskSummary.medium}
        </p>
      </div>

      <div className="rounded-xl bg-red-50 p-4">
        <p className="text-xs font-black text-red-700">HIGH</p>
        <p className="mt-1 text-2xl font-black text-red-900">
          {betterAnalytics.riskSummary.high}
        </p>
      </div>

      <div className="rounded-xl bg-slate-100 p-4">
        <p className="text-xs font-black text-slate-600">UNKNOWN</p>
        <p className="mt-1 text-2xl font-black text-slate-900">
          {betterAnalytics.riskSummary.unknown}
        </p>
      </div>
    </div>
  </div>
</div>

<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
  <ChartCard
    title="Recent Test Trend"
    description="Pass/fail movement based on records that contain timestamps."
    icon={<TrendingUp size={20} />}
  >
    {betterAnalytics.trendData.length ? (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={betterAnalytics.trendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="passed"
            name="Passed"
            stroke="#16a34a"
            strokeWidth={3}
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="failed"
            name="Failed"
            stroke="#dc2626"
            strokeWidth={3}
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    ) : (
      <EmptyChart text="Timestamped test data is required to show the trend." />
    )}
  </ChartCard>

  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">
          Instrument-wise Performance
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Instruments with inspection activity, ordered by inspection volume.
        </p>
      </div>
      <Scale className="text-blue-600" size={22} />
    </div>

    <div className="mt-5 overflow-x-auto">
      {betterAnalytics.instrumentPerformance.length ? (
        <table className="w-full min-w-[700px] text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wide text-slate-400">
              <th className="pb-3 pr-4">Instrument</th>
              <th className="pb-3 pr-4">Inspections</th>
              <th className="pb-3 pr-4">Tests</th>
              <th className="pb-3 pr-4">Pass rate</th>
              <th className="pb-3 pr-4">Avg. error</th>
              <th className="pb-3">Risk</th>
            </tr>
          </thead>

          <tbody>
            {betterAnalytics.instrumentPerformance.map((item) => (
              <tr
                key={item.id}
                className="border-b border-slate-50 last:border-0"
              >
                <td className="py-3 pr-4">
                  <p className="text-sm font-black text-slate-900">
                    {item.serialNumber}
                  </p>
                  <p className="text-xs text-slate-400">{item.model}</p>
                </td>

                <td className="py-3 pr-4 text-sm font-bold text-slate-700">
                  {item.inspections}
                </td>

                <td className="py-3 pr-4 text-sm font-bold text-slate-700">
                  {item.tests}
                </td>

                <td className="py-3 pr-4">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                      item.passRate >= 80
                        ? "bg-emerald-100 text-emerald-700"
                        : item.passRate >= 50
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.passRate}%
                  </span>
                </td>

                <td className="py-3 pr-4 text-sm font-black text-slate-800">
                  {item.averageError.toFixed(4)}
                </td>

                <td className="py-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${
                      item.risk === "LOW"
                        ? "bg-emerald-100 text-emerald-700"
                        : item.risk === "MEDIUM"
                          ? "bg-amber-100 text-amber-700"
                          : item.risk === "HIGH"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.risk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyChart text="No instrument has inspection activity yet." />
      )}
    </div>
  </div>
</div>

<div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-800">
  <div className="flex items-start gap-3">
    <Brain className="mt-0.5 shrink-0 text-blue-600" size={19} />
    <div>
      <p className="font-black">Analytics scope</p>
      <p className="mt-1">
        This Phase 1 dashboard summarizes existing SmartMetrix data only.
        Phase 2 starts below with environment-vs-error analysis. Dedicated error trends
        and explainable risk prediction remain later Phase 2 items.
      </p>
    </div>
  </div>
</div>

{/* ==================================================== */}
{/* PHASE 2 — ENVIRONMENT VS ERROR */}
{/* ==================================================== */}

<div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-6 shadow-sm">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
          <Thermometer size={22} />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-700">Phase 2 · Environmental Analysis</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">
            Environment vs Measurement Error
          </h2>
        </div>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        Each environment record is matched with the test records from the same inspection.
        The charts use average absolute error per inspection, so this is a research signal
        rather than a legal OIML environmental limit.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[360px]">
      <div className="rounded-xl bg-white/80 p-4 ring-1 ring-emerald-100">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Environment records</p>
        <p className="mt-1 text-2xl font-black text-slate-900">
          {environmentErrorAnalysis.environmentRecords}
        </p>
      </div>
      <div className="rounded-xl bg-white/80 p-4 ring-1 ring-emerald-100">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Matched inspections</p>
        <p className="mt-1 text-2xl font-black text-slate-900">
          {environmentErrorAnalysis.matchedInspections}
        </p>
      </div>
      <div className="rounded-xl bg-white/80 p-4 ring-1 ring-emerald-100 col-span-2 sm:col-span-1">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Avg. abs. error</p>
        <p className="mt-1 text-2xl font-black text-slate-900">
          {environmentErrorAnalysis.averageError.toFixed(4)}
        </p>
      </div>
    </div>
  </div>
</div>

<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
  <ChartCard
    title="Temperature vs Error"
    description={`Pearson r: ${environmentErrorAnalysis.temperatureCorrelation ?? "N/A"}`}
    icon={<Thermometer size={20} />}
  >
    {environmentErrorAnalysis.temperaturePoints.length ? (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 18, bottom: 12, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="temperature"
            name="Temperature"
            unit=" °C"
          />
          <YAxis
            type="number"
            dataKey="error"
            name="Absolute error"
            unit=""
          />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter
            name="Inspection"
            data={environmentErrorAnalysis.temperaturePoints}
            fill="#059669"
          />
        </ScatterChart>
      </ResponsiveContainer>
    ) : (
      <EmptyChart text="Matched temperature and error data is required." />
    )}
  </ChartCard>

  <ChartCard
    title="Humidity vs Error"
    description={`Pearson r: ${environmentErrorAnalysis.humidityCorrelation ?? "N/A"}`}
    icon={<Droplets size={20} />}
  >
    {environmentErrorAnalysis.humidityPoints.length ? (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 18, bottom: 12, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="humidity"
            name="Humidity"
            unit=" %"
          />
          <YAxis
            type="number"
            dataKey="error"
            name="Absolute error"
          />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter
            name="Inspection"
            data={environmentErrorAnalysis.humidityPoints}
            fill="#2563eb"
          />
        </ScatterChart>
      </ResponsiveContainer>
    ) : (
      <EmptyChart text="Matched humidity and error data is required." />
    )}
  </ChartCard>

  <ChartCard
    title="Vibration vs Error"
    description={`Pearson r: ${environmentErrorAnalysis.vibrationCorrelation ?? "N/A"}`}
    icon={<Activity size={20} />}
  >
    {environmentErrorAnalysis.vibrationPoints.length ? (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 18, bottom: 12, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="vibration"
            name="Vibration"
          />
          <YAxis
            type="number"
            dataKey="error"
            name="Absolute error"
          />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter
            name="Inspection"
            data={environmentErrorAnalysis.vibrationPoints}
            fill="#7c3aed"
          />
        </ScatterChart>
      </ResponsiveContainer>
    ) : (
      <EmptyChart text="Matched vibration and error data is required." />
    )}
  </ChartCard>
</div>

<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
  <div className="flex items-start gap-3">
    <Brain className="mt-0.5 shrink-0 text-emerald-600" size={19} />
    <div>
      <p className="font-black text-slate-900">How to read the correlation</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Pearson r ranges from -1 to +1. A positive value means the two variables tend to
        increase together, while a negative value means one tends to decrease as the other
        increases. Values near 0 indicate little linear relationship. Correlation does not
        prove that an environmental condition caused the measurement error.
      </p>
    </div>
  </div>
</div>

{/* ==================================================== */}
{/* PHASE 2 — ERROR TREND */}
{/* ==================================================== */}

<div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-6 shadow-sm">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-100 p-3 text-violet-700"><TrendingUp size={22} /></div>
        <div>
          <p className="text-sm font-bold text-violet-700">Phase 2 · Error Trend</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">Measurement Error Trend</h2>
        </div>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        Timestamped test records are grouped by test date to show how average and maximum
        absolute measurement error changes over time. This is a historical research indicator,
        not a prediction or regulatory decision.
      </p>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl bg-white p-4 ring-1 ring-violet-100"><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Days</p><p className="mt-1 text-2xl font-black text-slate-900">{errorTrendAnalysis.dailyData.length}</p></div>
      <div className="rounded-xl bg-white p-4 ring-1 ring-violet-100"><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Latest avg.</p><p className="mt-1 text-2xl font-black text-slate-900">{errorTrendAnalysis.latestAverageError.toFixed(4)}</p></div>
      <div className="rounded-xl bg-white p-4 ring-1 ring-violet-100"><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Recent max.</p><p className="mt-1 text-2xl font-black text-slate-900">{errorTrendAnalysis.recentMaximum.toFixed(4)}</p></div>
      <div className="rounded-xl bg-white p-4 ring-1 ring-violet-100"><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Direction</p><p className={`mt-1 text-lg font-black ${errorTrendAnalysis.direction === "INCREASING" ? "text-red-600" : errorTrendAnalysis.direction === "DECREASING" ? "text-emerald-600" : "text-slate-700"}`}>{errorTrendAnalysis.direction}</p></div>
    </div>
  </div>
</div>

<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
  <div className="xl:col-span-2">
    <ChartCard title="Average vs Maximum Absolute Error" description="Daily error movement from timestamped test records." icon={<TrendingUp size={20} />}>
      {errorTrendAnalysis.dailyData.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={errorTrendAnalysis.dailyData} margin={{ top: 10, right: 18, bottom: 12, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="averageError" name="Average absolute error" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="maximumError" name="Maximum absolute error" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : <EmptyChart text="Timestamped test records are required for error trend analysis." />}
    </ChartCard>
  </div>
  <ChartCard title="Daily Test Pass Rate" description="Pass percentage for timestamped tests on each day." icon={<CheckCircle2 size={20} />}>
    {errorTrendAnalysis.dailyData.length ? (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={errorTrendAnalysis.dailyData} margin={{ top: 10, right: 18, bottom: 12, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="passRate" name="Pass rate %" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    ) : <EmptyChart text="No timestamped test outcomes are available." />}
  </ChartCard>
</div>

<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <ResearchRow label="Timestamped tests" value={errorTrendAnalysis.timestampedTests} />
    <ResearchRow label="Recent test pass rate" value={`${errorTrendAnalysis.overallPassRate}%`} />
    <ResearchRow label="Change in average error" value={`${errorTrendAnalysis.errorChange >= 0 ? "+" : ""}${errorTrendAnalysis.errorChange.toFixed(4)}`} />
  </div>
  <div className="mt-4 flex items-start gap-3 rounded-xl bg-violet-50 p-4 text-sm leading-6 text-violet-900">
    <Brain className="mt-0.5 shrink-0 text-violet-600" size={18} />
    <p>The direction label compares the first and latest available daily average error in this historical window. It does not predict future behavior; later roadmap work will handle predictive risk analysis separately.</p>
  </div>
</div>

{/* ==================================================== */}
{/* CURRENT INSPECTION ANALYSIS */}
{/* ==================================================== */}

<div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 shadow-sm">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <p className="text-sm font-bold text-blue-600">Current Inspection Analysis</p>
      <h2 className="mt-1 text-2xl font-black text-slate-900">Selected Inspection</h2>
      <p className="mt-1 text-sm text-slate-600">Review the latest authoritative test state before exploring historical research analytics.</p>
    </div>

    <div className="w-full lg:max-w-md">
      <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Inspection</label>
      <select
        value={selectedInspectionId}
        onChange={(event) =>
          setSelectedInspectionId(
            event.target.value === ""
              ? ""
              : Number(event.target.value)
          )
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">Select an inspection</option>
        {[...inspections]
          .sort((a, b) => Number(b.id) - Number(a.id))
          .map((inspection) => (
            <option key={inspection.id} value={inspection.id}>
              #{inspection.id} • {
                instruments.find((item) => item.id === inspection.instrumentId)?.serialNumber ||
                `Instrument ${inspection.instrumentId}`
              }
            </option>
          ))}
      </select>
    </div>
  </div>

  {currentInspection ? (
    <>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          title="Overall Result"
          value={String(currentInspection.inspection.overallResult || "PENDING")}
          subtitle={`Inspection #${currentInspection.inspection.id}`}
          icon={<ShieldAlert size={20} />}
          danger={String(currentInspection.inspection.overallResult).toUpperCase() === "FAIL"}
        />
        <InsightCard
          title="Weighing Result"
          value={String(currentInspection.finalWeighing?.result || "PENDING")}
          subtitle={currentInspection.finalWeighing ? `Final record #${currentInspection.finalWeighing.id}` : "No weighing record"}
          icon={<Scale size={20} />}
          danger={String(currentInspection.finalWeighing?.result).toUpperCase() === "FAIL"}
        />
        <InsightCard
          title="Repeatability Range"
          value={currentInspection.repeatabilityRange !== null ? currentInspection.repeatabilityRange.toFixed(4) : "—"}
          subtitle={currentInspection.repeatabilityValues.length ? "Current complete 5-reading run" : "No complete run"}
          icon={<Gauge size={20} />}
        />
        <InsightCard
          title="Eccentricity Spread"
          value={currentInspection.eccentricityMaximumDifference !== null ? currentInspection.eccentricityMaximumDifference.toFixed(4) : "—"}
          subtitle={currentInspection.eccentricityRecords.length ? "Highest minus lowest reading" : "No eccentricity readings"}
          icon={<Activity size={20} />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Instrument</p>
          <h3 className="mt-2 text-lg font-black text-slate-900">
            {currentInspection.instrument?.manufacturer || "Unknown manufacturer"}
          </h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p><span className="font-bold text-slate-800">Model:</span> {currentInspection.instrument?.model || "—"}</p>
            <p><span className="font-bold text-slate-800">Serial:</span> {currentInspection.instrument?.serialNumber || "—"}</p>
            <p><span className="font-bold text-slate-800">Class:</span> {currentInspection.instrument?.instrumentClass || "—"}</p>
            <p><span className="font-bold text-slate-800">Capacity:</span> {currentInspection.instrument?.capacity ?? "—"}</p>
            <p><span className="font-bold text-slate-800">Scale interval:</span> {currentInspection.instrument?.scaleInterval ?? "—"}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Current Measurements</p>
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Final observed weight</span><span className="font-black text-slate-900">{currentInspection.finalWeighing ? `${num(currentInspection.finalWeighing.observedWeight).toFixed(4)} kg` : "—"}</span></div>
            <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Signed error</span><span className="font-black text-slate-900">{currentInspection.finalWeighing ? `${num(currentInspection.finalWeighing.error) >= 0 ? "+" : ""}${num(currentInspection.finalWeighing.error).toFixed(4)} kg` : "—"}</span></div>
            <div className="flex items-center justify-between gap-3"><span className="text-slate-500">MPE</span><span className="font-black text-slate-900">{currentInspection.finalWeighing ? `±${num(currentInspection.finalWeighing.mpe).toFixed(4)} kg` : "—"}</span></div>
            <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Repeatability average</span><span className="font-black text-slate-900">{currentInspection.repeatabilityAverage !== null ? `${currentInspection.repeatabilityAverage.toFixed(4)} kg` : "—"}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Environment</p>
          {currentInspection.environment ? (
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-500"><Thermometer size={16} /> Temperature</span><span className="font-black text-slate-900">{currentInspection.environment.temperature ?? "—"} °C</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-500"><Droplets size={16} /> Humidity</span><span className="font-black text-slate-900">{currentInspection.environment.humidity ?? "—"} %</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-500"><Activity size={16} /> Vibration</span><span className="font-black text-slate-900">{currentInspection.environment.vibration ?? "—"}</span></div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-slate-500">Status</span><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{currentInspection.environment.status || "UNKNOWN"}</span></div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No recorded environment observation for this inspection.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Workflow Timeline</p>
            <h3 className="mt-1 text-lg font-black text-slate-900">Inspection activity</h3>
          </div>
          <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">{currentInspection.inspection.status || "UNKNOWN"}</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {currentInspection.auditLogs.length > 0 ? currentInspection.auditLogs.map((log) => (
            <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-black text-slate-500">{String(log.action || "EVENT").replace(/_/g, " ")}</p>
              <p className="mt-1 text-xs text-slate-400">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "Timestamp unavailable"}</p>
            </div>
          )) : (
            <p className="text-sm text-slate-500">No inspection audit events available.</p>
          )}
        </div>
      </div>
    </>
  ) : (
    <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <FileSearch className="mx-auto text-slate-400" size={30} />
      <p className="mt-3 font-bold text-slate-700">Select an inspection to view its current analysis.</p>
      <p className="mt-1 text-sm text-slate-500">Historical research analytics remain available below.</p>
    </div>
  )}
</div>



<div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="flex items-start gap-3">
    <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
      <Database size={22} />
    </div>
    <div>
      <p className="text-sm font-bold text-slate-500">Historical / Research Analytics</p>
      <h2 className="mt-1 text-xl font-black text-slate-900">System-wide Analytical Evidence</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Aggregated historical measurements, test outcomes, environmental observations, audit activity and predictive research indicators.</p>
    </div>
  </div>
</div>

{/* ==================================================== */}
{/* MAIN STATISTICS */}
{/* ==================================================== */}

<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

  <MetricCard
    title="Total Inspections"
    value={
      analytics.totalInspections
    }
          icon={
            <ClipboardCheck
              size={22}
            />
          }
        />

        <MetricCard
          title="Inspection Pass Rate"
          value={`${analytics.inspectionPassPercentage.toFixed(
            2
          )}%`}
          icon={
            <CheckCircle2
              size={22}
            />
          }
          positive
        />

       <MetricCard
  title="Total Tests"
  value={combinedTestMetrics.totalTests}
  icon={<Gauge size={22} />}
/>

        <MetricCard
          title="Test Pass Rate"
          value={`${analytics.testPassPercentage.toFixed(
            2
          )}%`}
          icon={
            <BarChart3
              size={22}
            />
          }
          positive
        />
      </div>

      {/* ==================================================== */}
      {/* MEASUREMENT INTELLIGENCE */}
      {/* ==================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <InsightCard
          title="Average Absolute Error"
          value={errorMetrics.absoluteAverage.toFixed(
            4
          )}
          subtitle="Across recorded test measurements"
          icon={
            <TrendingUp
              size={20}
            />
          }
        />

        <InsightCard
          title="Maximum Absolute Error"
          value={errorMetrics.maximum.toFixed(
            4
          )}
          subtitle="Highest observed measurement deviation"
          icon={
            <XCircle size={20} />
          }
          danger
        />

      <InsightCard
  title="Historical Measurements"
  value={combinedTestMetrics.totalTests}
  subtitle="WP, Repeatability and Eccentricity test executions"
  icon={<BarChart3 size={20} />}
/>
      </div>

      {/* ==================================================== */}
      {/* STEP 10 — ECCENTRICITY HEADER */}
      {/* ==================================================== */}

      <SectionHeader
        step="Step 10 • Eccentricity Analytics"
        title="Load Distribution Analysis"
        description="Analysis of observed weights at different platform positions to identify measurement spread and possible eccentric loading behavior."
        icon={
          <Scale size={23} />
        }
      />

      {/* ==================================================== */}
      {/* ECCENTRICITY METRICS */}
      {/* ==================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <InsightCard
          title="Eccentricity Inspections"
          value={
            eccentricityMetrics.inspections
          }
          subtitle="Inspections containing eccentricity readings"
          icon={
            <ClipboardCheck
              size={20}
            />
          }
        />

        <InsightCard
          title="Eccentricity Readings"
          value={
            eccentricityMetrics.readings
          }
          subtitle="Total platform-position measurements"
          icon={
            <Scale size={20} />
          }
        />

        <InsightCard
          title="Average Spread"
          value={eccentricityMetrics.averageDifference.toFixed(
            4
          )}
          subtitle="Average max-minus-min observed weight"
          icon={
            <TrendingUp
              size={20}
            />
          }
        />

        <InsightCard
          title="Maximum Spread"
          value={eccentricityMetrics.maximumDifference.toFixed(
            4
          )}
          subtitle="Highest observed eccentricity spread"
          icon={
            <XCircle size={20} />
          }
          danger
        />
      </div>

      {/* ==================================================== */}
      {/* ECCENTRICITY INSPECTION CHART */}
      {/* ==================================================== */}

      <ChartCard
        title="Inspection-wise Eccentricity Spread"
        description="Maximum observed weight minus minimum observed weight for each eccentricity inspection."
        icon={
          <Scale size={20} />
        }
      >
        {eccentricitySummary.length >
        0 ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                eccentricitySummary
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="inspectionId"
              />

              <YAxis />

              <Tooltip
                formatter={(
                  value
                ) => [
                  value,
                  "Maximum Spread",
                ]}
                labelFormatter={(
                  label
                ) =>
                  `Inspection ${label}`
                }
              />

              <Bar
                dataKey="maximumDifference"
                name="Maximum Spread"
                fill="#2563eb"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart
            text="No eccentricity readings available."
          />
        )}
      </ChartCard>

      {/* ==================================================== */}
      {/* POSITION-WISE ECCENTRICITY */}
      {/* ==================================================== */}

      <ChartCard
        title="Position-wise Eccentricity Analysis"
        description="Average observed weight at each platform position across recorded eccentricity tests."
        icon={
          <MapPin size={20} />
        }
      >
        {eccentricityRecords.length >
        0 ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                eccentricityPositionData
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="position"
                interval={0}
                angle={-15}
                textAnchor="end"
                height={65}
              />

              <YAxis />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="average"
                name="Average Observed Weight"
                fill="#0f766e"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart
            text="No position-wise eccentricity data available."
          />
        )}
      </ChartCard>

      {/* ==================================================== */}
      {/* ECCENTRICITY TABLE */}
      {/* ==================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-900">
            Eccentricity Inspection Details
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Inspection-level measurement spread
            and instrument identification.
          </p>
        </div>

        {eccentricitySummary.length ===
        0 ? (
          <EmptyChart
            text="No eccentricity inspection data available."
          />
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[760px] text-left">

              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">

                  <th className="px-4 py-3">
                    Inspection
                  </th>

                  <th className="px-4 py-3">
                    Instrument
                  </th>

                  <th className="px-4 py-3">
                    Readings
                  </th>

                  <th className="px-4 py-3">
                    Minimum
                  </th>

                  <th className="px-4 py-3">
                    Maximum
                  </th>

                  <th className="px-4 py-3">
                    Center
                  </th>

                  <th className="px-4 py-3">
                    Spread
                  </th>

                </tr>
              </thead>

              <tbody>

                {eccentricitySummary.map(
                  (item) => (
                    <tr
                      key={
                        item.inspectionId
                      }
                      className="border-b border-slate-100 last:border-0"
                    >

                      <td className="px-4 py-4 font-bold text-slate-900">
                        #{item.inspectionId}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {
                            item.serialNumber
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.readings}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                        {item.minimumWeight.toFixed(
                          4
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                        {item.maximumWeight.toFixed(
                          4
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                        {item.centerWeight !==
                        null
                          ? item.centerWeight.toFixed(
                              4
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-black text-blue-700">
                          {item.maximumDifference.toFixed(
                            4
                          )}
                        </span>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* STEP 11 — REPEATABILITY */}
      {/* ==================================================== */}

      <SectionHeader
        step="Step 11 • Repeatability Analytics"
        title="Repeated Measurement Stability"
        description="Analysis of repeated measurements from the same inspection to identify weight variation, measurement stability and repeatability range."
        icon={
          <Gauge size={23} />
        }
      />

      {/* ==================================================== */}
      {/* REPEATABILITY METRICS */}
      {/* ==================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <InsightCard
          title="Repeatability Inspections"
          value={
            repeatabilityMetrics.inspections
          }
          subtitle="Inspections containing repeated readings"
          icon={
            <ClipboardCheck
              size={20}
            />
          }
        />

        <InsightCard
          title="Total Readings"
          value={
            repeatabilityMetrics.readings
          }
          subtitle="Repeated weight measurements"
          icon={
            <Gauge size={20} />
          }
        />

        <InsightCard
          title="Average Range"
          value={repeatabilityMetrics.averageRange.toFixed(
            4
          )}
          subtitle="Average maximum-minus-minimum variation"
          icon={
            <TrendingUp
              size={20}
            />
          }
        />

        <InsightCard
          title="Maximum Range"
          value={repeatabilityMetrics.maximumRange.toFixed(
            4
          )}
          subtitle="Highest observed repeatability variation"
          icon={
            <XCircle size={20} />
          }
          danger
        />

      </div>

      {/* ==================================================== */}
      {/* READING-WISE REPEATABILITY */}
      {/* ==================================================== */}

      <ChartCard
        title="Reading-wise Repeatability"
        description="Average observed weight for each repeated reading number across available inspections."
        icon={
          <Gauge size={20} />
        }
      >
        {repeatabilityReadingData.length >
        0 ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                repeatabilityReadingData
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="reading"
              />

              <YAxis />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="average"
                name="Average Observed Weight"
                fill="#2563eb"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart
            text="No repeatability readings available."
          />
        )}
      </ChartCard>

      {/* ==================================================== */}
      {/* INSPECTION-WISE REPEATABILITY */}
      {/* ==================================================== */}

      <ChartCard
        title="Inspection-wise Repeatability Range"
        description="Maximum observed weight minus minimum observed weight for each repeatability inspection."
        icon={
          <TrendingUp size={20} />
        }
      >
        {repeatabilitySummary.length >
        0 ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                repeatabilitySummary
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="inspectionId"
              />

              <YAxis />

              <Tooltip
                formatter={(
                  value
                ) => [
                  value,
                  "Repeatability Range",
                ]}
                labelFormatter={(
                  label
                ) =>
                  `Inspection ${label}`
                }
              />

              <Bar
                dataKey="range"
                name="Repeatability Range"
                fill="#0f766e"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart
            text="No repeatability inspection data available."
          />
        )}
      </ChartCard>

      {/* ==================================================== */}
      {/* REPEATABILITY TABLE */}
      {/* ==================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5">

          <h2 className="text-lg font-black text-slate-900">
            Repeatability Inspection Details
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Inspection-level statistics for
            repeated measurements.
          </p>

        </div>

        {repeatabilitySummary.length ===
        0 ? (
          <EmptyChart
            text="No repeatability inspection data available."
          />
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[800px] text-left">

              <thead>

                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">

                  <th className="px-4 py-3">
                    Inspection
                  </th>

                  <th className="px-4 py-3">
                    Instrument
                  </th>

                  <th className="px-4 py-3">
                    Readings
                  </th>

                  <th className="px-4 py-3">
                    Average
                  </th>

                  <th className="px-4 py-3">
                    Minimum
                  </th>

                  <th className="px-4 py-3">
                    Maximum
                  </th>

                  <th className="px-4 py-3">
                    Range
                  </th>

                </tr>

              </thead>

              <tbody>

                {repeatabilitySummary.map(
                  (item) => (
                    <tr
                      key={
                        item.inspectionId
                      }
                      className="border-b border-slate-100 last:border-0"
                    >

                      <td className="px-4 py-4 font-bold text-slate-900">
                        #{item.inspectionId}
                      </td>

                      <td className="px-4 py-4">

                        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {
                            item.serialNumber
                          }
                        </span>

                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.readings}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                        {item.averageWeight.toFixed(
                          4
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                        {item.minimumWeight.toFixed(
                          4
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                        {item.maximumWeight.toFixed(
                          4
                        )}
                      </td>

                      <td className="px-4 py-4">

                        <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-black text-blue-700">
                          {item.range.toFixed(
                            4
                          )}
                        </span>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* STEP 12 — AUDIT */}
      {/* ==================================================== */}

      <SectionHeader
        step="Step 12 • Audit Analytics"
        title="Complete Audit Trail Intelligence"
        description="Traceability analysis of user actions, entity changes and workflow events recorded by SmartMetrix. This layer supports accountability, security, reproducibility and research auditability."
        icon={
          <History size={23} />
        }
        purple
      />

      {/* ==================================================== */}
      {/* AUDIT METRICS */}
      {/* ==================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <InsightCard
          title="Total Audit Events"
          value={
            auditMetrics.totalEvents
          }
          subtitle="All recorded audit-trail events"
          icon={
            <History size={20} />
          }
        />

        <InsightCard
          title="Unique Users"
          value={
            auditMetrics.uniqueUsers
          }
          subtitle="Users responsible for recorded actions"
          icon={
            <Users size={20} />
          }
        />

        <InsightCard
          title="Tracked Entities"
          value={
            auditMetrics.uniqueEntities
          }
          subtitle="Distinct entity records appearing in the audit trail"
          icon={
            <Database size={20} />
          }
        />

        <InsightCard
          title="Events in Last 24h"
          value={
            auditMetrics.recentEvents
          }
          subtitle="Recent activity based on audit timestamps"
          icon={
            <Activity size={20} />
          }
        />

      </div>

      {/* ==================================================== */}
      {/* AUDIT CHANGES */}
      {/* ==================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        <InsightCard
          title="Tracked Value Changes"
          value={
            auditChangeMetrics.totalChanges
          }
          subtitle="Audit events containing both old and new values"
          icon={
            <FileSearch size={20} />
          }
        />

        <InsightCard
          title="Change Event Percentage"
          value={`${auditChangeMetrics.changePercentage.toFixed(
            2
          )}%`}
          subtitle="Share of audit events containing old/new value transitions"
          icon={
            <TrendingUp size={20} />
          }
        />

      </div>

      {/* ==================================================== */}
      {/* AUDIT ACTION */}
      {/* ==================================================== */}

      <ChartCard
        title="Audit Action Distribution"
        description="Frequency of recorded actions across the SmartMetrix audit trail."
        icon={
          <Activity size={20} />
        }
      >
        {auditActionData.length >
        0 ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                auditActionData
              }
              layout="vertical"
              margin={{
                left: 30,
                right: 20,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                type="number"
                allowDecimals={false}
              />

              <YAxis
                type="category"
                dataKey="action"
                width={120}
              />

              <Tooltip />

              <Bar
                dataKey="count"
                name="Audit Events"
                fill="#4f46e5"
                radius={[
                  0,
                  6,
                  6,
                  0,
                ]}
              />

            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart
            text="No audit action data available."
          />
        )}
      </ChartCard>

      {/* ==================================================== */}
      {/* AUDIT ENTITY */}
      {/* ==================================================== */}

      <ChartCard
        title="Entity-wise Audit Activity"
        description="Distribution of audit events across tracked entities such as instruments, inspections and tests."
        icon={
          <Database size={20} />
        }
      >
        {auditEntityData.length >
        0 ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                auditEntityData
              }
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="entity"
                interval={0}
                angle={-20}
                textAnchor="end"
                height={75}
              />

              <YAxis
                allowDecimals={false}
              />

              <Tooltip />

              <Legend />

              <Bar
                dataKey="count"
                name="Audit Events"
                fill="#0f766e"
                radius={[
                  6,
                  6,
                  0,
                  0,
                ]}
              />

            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart
            text="No entity-wise audit data available."
          />
        )}
      </ChartCard>

      {/* ==================================================== */}
      {/* USER + DATE AUDIT */}
      {/* ==================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        <ChartCard
          title="User-wise Audit Activity"
          description="Number of audit events generated by each user."
          icon={
            <Users size={20} />
          }
        >
          {auditUserData.length >
          0 ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  auditUserData
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="user"
                />

                <YAxis
                  allowDecimals={false}
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  name="Audit Events"
                  fill="#2563eb"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart
              text="No user-wise audit data available."
            />
          )}
        </ChartCard>

        <ChartCard
          title="Date-wise Audit Activity"
          description="Recorded audit events grouped by their audit timestamp."
          icon={
            <History size={20} />
          }
        >
          {auditDateData.length >
          0 ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={
                  auditDateData
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="date"
                />

                <YAxis
                  allowDecimals={false}
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="count"
                  name="Audit Events"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                  }}
                  activeDot={{
                    r: 7,
                  }}
                />

              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart
              text="No dated audit events available."
            />
          )}
        </ChartCard>

      </div>

      {/* ==================================================== */}
      {/* RECENT AUDIT */}
      {/* ==================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5 flex items-start gap-3">

          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
            <History size={21} />
          </div>

          <div>

            <h2 className="text-lg font-black text-slate-900">
              Recent Audit Events
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest ten audit events recorded by
              SmartMetrix.
            </p>

          </div>

        </div>

        {recentAuditLogs.length ===
        0 ? (
          <EmptyChart
            text="No audit events available."
          />
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px] text-left">

              <thead>

                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">

                  <th className="px-4 py-3">
                    Event
                  </th>

                  <th className="px-4 py-3">
                    User
                  </th>

                  <th className="px-4 py-3">
                    Action
                  </th>

                  <th className="px-4 py-3">
                    Entity
                  </th>

                  <th className="px-4 py-3">
                    Entity ID
                  </th>

                  <th className="px-4 py-3">
                    Old Value
                  </th>

                  <th className="px-4 py-3">
                    New Value
                  </th>

                  <th className="px-4 py-3">
                    Timestamp
                  </th>

                </tr>

              </thead>

              <tbody>

                {recentAuditLogs.map(
                  (log) => (
                    <tr
                      key={
                        log.id
                      }
                      className="border-b border-slate-100 last:border-0"
                    >

                      <td className="px-4 py-4">

                        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                          #{log.id}
                        </span>

                      </td>

                      <td className="px-4 py-4">

                        <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          User{" "}
                          {
                            log.userId
                          }
                        </span>

                      </td>

                      <td className="px-4 py-4">

                        <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                          {
                            normalizeAuditText(
                              log.action
                            )
                          }
                        </span>

                      </td>

                      <td className="px-4 py-4">

                        <span className="text-sm font-bold text-slate-700">
                          {
                            normalizeAuditText(
                              log.entity
                            )
                          }
                        </span>

                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                        #{log.entityId}
                      </td>

                      <td className="max-w-[220px] px-4 py-4">

                        <div className="truncate text-xs text-slate-500">
                          {
                            log.oldValue ||
                            "—"
                          }
                        </div>

                      </td>

                      <td className="max-w-[220px] px-4 py-4">

                        <div className="truncate text-xs font-semibold text-slate-700">
                          {
                            log.newValue ||
                            "—"
                          }
                        </div>

                      </td>

                      <td className="px-4 py-4">

                        <div className="text-xs font-semibold text-slate-700">
                          {
                            formatDate(
                              log.timestamp
                            )
                          }
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {
                            formatTime(
                              log.timestamp
                            )
                          }
                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* STEP 13 — DRIFT + ML PREDICTION */}
      {/* ==================================================== */}

      {explainableRisk && (
        <section className="mb-8 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-amber-700">Phase 2 · Explainable Risk</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Why this instrument has this risk?</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                The risk view breaks the current backend risk category into measurable historical factors.
                These are research and early-warning indicators, not regulatory certification decisions.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Backend risk</p>
              <p className="mt-1 text-xl font-black text-slate-900">{explainableRisk.backendRisk}</p>
              {explainableRisk.backendRiskScore !== null && (
                <p className="text-xs text-slate-500">Score {Number(explainableRisk.backendRiskScore).toFixed(1)}</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Inspection pass rate",
                value: explainableRisk.passRate === null ? "NO DATA" : `${explainableRisk.passRate.toFixed(1)}%`,
                detail: "Historical inspection outcomes",
                state: explainableRisk.passRate === null ? "NO DATA" : explainableRisk.passRate >= 80 ? "STABLE" : "WATCH",
              },
              {
                label: "Error / MPE",
                value: explainableRisk.errorRatio === null ? "NO DATA" : `${(explainableRisk.errorRatio * 100).toFixed(1)}%`,
                detail: explainableRisk.averageError === null ? "No timestamped measurement basis" : `Avg error ${explainableRisk.averageError.toFixed(4)}`,
                state: explainableRisk.errorRatio === null ? "NO DATA" : explainableRisk.errorRatio >= 1 ? "CONCERN" : explainableRisk.errorRatio >= 0.75 ? "WATCH" : "STABLE",
              },
              {
                label: "Repeatability variation",
                value: explainableRisk.repeatabilityRatio === null ? "NO DATA" : `${(explainableRisk.repeatabilityRatio * 100).toFixed(1)}%`,
                detail: explainableRisk.maximumRepeatabilityRange === null ? "No repeatability records" : `Max range ${explainableRisk.maximumRepeatabilityRange.toFixed(4)}`,
                state: explainableRisk.repeatabilityRatio === null ? "NO DATA" : explainableRisk.repeatabilityRatio >= 1 ? "CONCERN" : explainableRisk.repeatabilityRatio >= 0.75 ? "WATCH" : "STABLE",
              },
              {
                label: "Eccentricity spread",
                value: explainableRisk.eccentricityRatio === null ? "NO DATA" : `${(explainableRisk.eccentricityRatio * 100).toFixed(1)}%`,
                detail: explainableRisk.maximumEccentricitySpread === null ? "No eccentricity records" : `Max spread ${explainableRisk.maximumEccentricitySpread.toFixed(4)}`,
                state: explainableRisk.eccentricityRatio === null ? "NO DATA" : explainableRisk.eccentricityRatio >= 1 ? "CONCERN" : explainableRisk.eccentricityRatio >= 0.75 ? "WATCH" : "STABLE",
              },
            ].map((factor) => (
              <div key={factor.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{factor.label}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{factor.state}</span>
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900">{factor.value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{factor.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Recent measurement direction</p>
                <p className="mt-1 text-xs text-slate-500">Based on timestamped tests for the selected instrument.</p>
              </div>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{explainableRisk.trend}</span>
            </div>
          </div>
        </section>
      )}

      {selectedInstrumentId !== "" && !predictionLoading && (
        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-600">Prediction readiness</p>
              <h3 className="mt-1 text-lg font-black text-purple-950">Historical data sufficiency check</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-purple-800">
                The prototype forecast uses timestamped weighing-performance records. At least 3 valid records are required before a next-error forecast is treated as meaningful.
              </p>
            </div>
            <span className={`rounded-full px-3 py-2 text-xs font-black ${
              (mlPrediction?.history?.length ?? driftAnalysis?.totalRecords ?? 0) >= 3
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {(mlPrediction?.history?.length ?? driftAnalysis?.totalRecords ?? 0) >= 3
                ? "READY FOR FORECAST"
                : "NEEDS MORE DATA"}
            </span>
          </div>
        </div>
      )}

      <SectionHeader
        step="Step 13 • Predictive Intelligence"
        title="Historical Drift & ML Prediction"
        description="Historical measurement behavior is analyzed to identify drift patterns and estimate the next measurement error using an explainable statistical prediction model. The selected instrument is automatically initialized with the richest available timestamped weighing-performance history."
        icon={
          <Brain size={23} />
        }
        purple
      />

      {/* ==================================================== */}
      {/* INSTRUMENT SELECTOR */}
      {/* ==================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex items-start gap-3">

          <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
            <Gauge size={22} />
          </div>

          <div>

            <h2 className="text-lg font-black text-slate-900">
              Instrument Prediction Analysis
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Select an instrument to analyze its
              historical drift and predictive
              measurement behavior.
            </p>

          </div>

        </div>

        <div className="mt-6 max-w-xl">

          <label className="mb-2 block text-sm font-bold text-slate-700">
            Select Instrument
          </label>

          <select
            value={
              selectedInstrumentId
            }
            onChange={(event) =>
              handleInstrumentChange(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          >

            <option value="">
              Select an instrument
            </option>

            {instruments.map(
              (instrument) => (
                <option
                  key={
                    instrument.id
                  }
                  value={
                    instrument.id
                  }
                >
                  {
                    instrument.serialNumber
                  }{" "}
                  •{" "}
                  {
                    instrument.manufacturer
                  }{" "}
                  {
                    instrument.model
                  }
                </option>
              )
            )}

          </select>

        </div>

      </div>

      {/* ==================================================== */}
      {/* PREDICTION ERROR */}
      {/* ==================================================== */}

      {predictionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {predictionError}
        </div>
      )}

      {/* ==================================================== */}
      {/* PREDICTION LOADING */}
      {/* ==================================================== */}

      {predictionLoading && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">

          <div className="flex items-center gap-3 text-sm font-bold text-purple-600">

            <Loader2
              size={22}
              className="animate-spin"
            />

            Loading drift and prediction
            analysis...

          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* DRIFT ANALYSIS */}
      {/* ==================================================== */}

      {selectedInstrumentId !==
        "" &&
        !predictionLoading &&
        driftAnalysis && (
          <>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-start gap-3">

                <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                  <TrendingUp
                    size={22}
                  />
                </div>

                <div>

                  <p className="text-sm font-bold text-orange-600">
                    Historical Drift Analysis
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-900">
                    Instrument Measurement Stability
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Drift indicators are calculated
                    from historical weighing-performance
                    measurements for the selected
                    instrument.
                  </p>

                </div>

              </div>

            </div>

            {/* DRIFT METRICS */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

              <InsightCard
                title="Historical Records"
                value={
                  driftAnalysis.totalRecords ??
                  0
                }
                subtitle="Weighing-performance records analyzed"
                icon={
                  <Database size={20} />
                }
              />

              <InsightCard
                title="Average Error"
                value={num(
                  driftAnalysis.averageError
                ).toFixed(4)}
                subtitle="Mean signed measurement error"
                icon={
                  <Activity size={20} />
                }
              />

              <InsightCard
                title="Average Absolute Error"
                value={num(
                  driftAnalysis.averageAbsoluteError
                ).toFixed(4)}
                subtitle="Mean absolute measurement deviation"
                icon={
                  <Gauge size={20} />
                }
              />

              <InsightCard
                title="Maximum Absolute Error"
                value={num(
                  driftAnalysis.maximumAbsoluteError
                ).toFixed(4)}
                subtitle="Largest historical absolute error"
                icon={
                  <AlertTriangle
                    size={20}
                  />
                }
                danger
              />

              <InsightCard
                title="Drift Score"
                value={num(
                  driftAnalysis.driftScore
                ).toFixed(2)}
                subtitle="Prototype historical drift indicator"
                icon={
                  <CircleGauge
                    size={20}
                  />
                }
              />

            </div>

            {/* DRIFT STATUS */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <h2 className="text-lg font-black text-slate-900">
                    Drift Status
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Current historical stability
                    classification.
                  </p>

                </div>

                <span
                  className={`rounded-xl px-4 py-2 text-sm font-black ${
                    String(
                      driftAnalysis.status ||
                        ""
                    ).toUpperCase() ===
                    "STABLE"
                      ? "bg-green-50 text-green-700"
                      : String(
                          driftAnalysis.status ||
                            ""
                        ).toUpperCase() ===
                        "WARNING"
                      ? "bg-yellow-50 text-yellow-700"
                      : String(
                          driftAnalysis.status ||
                            ""
                        ).toUpperCase() ===
                        "HIGH_DRIFT"
                      ? "bg-red-50 text-red-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {String(
                    driftAnalysis.status ||
                      "UNKNOWN"
                  ).replace(
                    /_/g,
                    " "
                  )}
                </span>

              </div>

            </div>

          </>
        )}

      {/* ==================================================== */}
      {/* ML PREDICTION */}
      {/* ==================================================== */}

      {selectedInstrumentId !==
        "" &&
        !predictionLoading &&
        mlPrediction && (
          <>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-start gap-3">

                <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
                  <Sparkles
                    size={22}
                  />
                </div>

                <div>

                  <p className="text-sm font-bold text-purple-600">
                    Explainable Prediction
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-900">
                    Next Measurement Error Forecast
                  </h2>

                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                    A prototype linear trend model
                    estimates the next expected
                    measurement error from the
                    historical sequence.
                  </p>

                </div>

              </div>

            </div>

            {/* ML METRICS */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

              <InsightCard
                title="Current Average Error"
                value={num(
                  mlPrediction.currentAverageError
                ).toFixed(4)}
                subtitle="Historical average measurement error"
                icon={
                  <Activity size={20} />
                }
              />

              <InsightCard
                title="Predicted Next Error"
                value={
                  (mlPrediction.history?.length ?? 0) < 3
                    ? "INSUFFICIENT DATA"
                    : num(mlPrediction.predictedNextError).toFixed(4)
                }
                subtitle="Estimated next measurement error"
                icon={
                  <TrendingUp
                    size={20}
                  />
                }
                danger={
                  (mlPrediction.history?.length ?? 0) >= 3 &&
                  Math.abs(num(mlPrediction.predictedNextError)) >= 0.05
                }
              />

              <InsightCard
                title="Trend Slope"
                value={num(
                  mlPrediction.trendSlope
                ).toFixed(6)}
                subtitle="Historical error trend direction"
                icon={
                  <TrendingUp
                    size={20}
                  />
                }
              />

              <InsightCard
                title="Prediction Confidence"
                value={
                  (mlPrediction.history?.length ?? 0) < 3
                    ? "0%"
                    : `${num(mlPrediction.confidence).toFixed(0)}%`
                }
                subtitle="Prototype confidence indicator"
                icon={
                  <CircleGauge
                    size={20}
                  />
                }
              />

              <InsightCard
                title="Predicted Risk"
                value={
                  (mlPrediction.history?.length ?? 0) < 3
                    ? "UNKNOWN"
                    : mlPrediction.predictedRisk || "UNKNOWN"
                }
                subtitle={
                  (mlPrediction.history?.length ?? 0) < 3
                    ? "Requires at least 3 valid records"
                    : "Prototype predictive risk category"
                }
                icon={
                  <ShieldAlert
                    size={20}
                  />
                }
                danger={
                  String(
                    mlPrediction.predictedRisk ||
                      ""
                  ).toUpperCase() ===
                  "HIGH"
                }
              />

            </div>

          </>
        )}

      {/* ==================================================== */}
      {/* PREDICTION HISTORY */}
      {/* ==================================================== */}

      {selectedInstrumentId !==
        "" &&
        !predictionLoading &&
        mlPrediction &&
        mlPrediction.history &&
        mlPrediction.history.length >
          0 && (
          <ChartCard
            title="Historical Error Trend"
            description="Historical measurement error sequence used by the prediction model."
            icon={
              <TrendingUp
                size={20}
              />
            }
          >

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <LineChart
                data={
                  mlPrediction.history
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="testRecordId"
                  label={{
                    value:
                      "Test Record",
                    position:
                      "insideBottom",
                    offset: -5,
                  }}
                />

                <YAxis
                  label={{
                    value:
                      "Measurement Error (Kg)",
                    angle: -90,
                    position:
                      "insideLeft",
                  }}
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="error"
                  name="Measurement Error"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                  }}
                  activeDot={{
                    r: 7,
                  }}
                />

              </LineChart>

            </ResponsiveContainer>

          </ChartCard>
        )}

      {/* ==================================================== */}
      {/* PREDICTION HISTORY TABLE */}
      {/* ==================================================== */}

      {selectedInstrumentId !==
        "" &&
        !predictionLoading &&
        mlPrediction &&
        mlPrediction.history &&
        mlPrediction.history.length >
          0 && (

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5">

              <h2 className="text-lg font-black text-slate-900">
                Prediction History Data
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Historical measurements used as
                input for the prediction model.
              </p>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[700px] text-left">

                <thead>

                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">

                    <th className="px-4 py-3">
                      Test Record
                    </th>

                    <th className="px-4 py-3">
                      Reference Weight
                    </th>

                    <th className="px-4 py-3">
                      Observed Weight
                    </th>

                    <th className="px-4 py-3">
                      Error
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {mlPrediction.history.map(
                    (point) => (
                      <tr
                        key={
                          point.testRecordId
                        }
                        className="border-b border-slate-100 last:border-0"
                      >

                        <td className="px-4 py-4 font-bold text-slate-900">
                          #
                          {
                            point.testRecordId
                          }
                        </td>

                       <td className="px-4 py-4 text-sm font-semibold text-slate-700">
  {num(
    point.referenceWeight
  ).toFixed(
    4
  )} kg
</td>

                        <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                          {num(
                            point.observedWeight
                          ).toFixed(
                            4
                          )}Kg
                        </td>

                        <td className="px-4 py-4">

                          <span
                            className={`rounded-lg px-3 py-1 text-sm font-black ${
                              num(
                                point.error
                              ) >
                              0
                                ? "bg-red-50 text-red-700"
                                : num(
                                    point.error
                                  ) <
                                  0
                                ? "bg-blue-50 text-blue-700"
                                : "bg-green-50 text-green-700"
                            }`}
                          >
                            {num(
                              point.error
                            ).toFixed(
                              5
                            )}Kg
                          </span>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>
        )}

      {/* ==================================================== */}
      {/* EXPLANATION */}
      {/* ==================================================== */}

      {selectedInstrumentId !==
        "" &&
        !predictionLoading &&
        mlPrediction && (

          <div className="rounded-2xl border border-purple-100 bg-purple-50 p-6">

            <div className="flex items-start gap-3">

              <div className="rounded-xl bg-white p-3 text-purple-600">
                <Brain size={21} />
              </div>

              <div>

                <h2 className="text-lg font-black text-purple-900">
                  Prediction Explanation
                </h2>

                <p className="mt-2 text-sm leading-6 text-purple-800">
                  {
                    mlPrediction.explanation ||
                    "No prediction explanation is available."
                  }
                </p>

              </div>

            </div>

          </div>
        )}

      {/* ==================================================== */}
      {/* RESEARCH DISCLAIMER */}
      {/* ==================================================== */}

      {selectedInstrumentId !==
        "" &&
        !predictionLoading &&
        mlPrediction && (

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-6 text-amber-800">

            <strong>
              Research prototype note:
            </strong>{" "}

            Drift score, prediction confidence
            and predicted risk are analytical
            indicators generated by the prototype.
            They do not replace OIML R-76-oriented
            compliance calculations, metrological
            verification or regulatory certification
            decisions.

          </div>
        )}

      {/* ==================================================== */}
      {/* COMPLIANCE OUTCOME */}
      {/* ==================================================== */}

      <ChartCard
        title="Compliance Outcome Overview"
        description="Pass, fail and pending outcomes across inspections and tests."
      >

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <BarChart
            data={outcomeData}
          >

            <CartesianGrid
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="name"
            />

            <YAxis
              allowDecimals={false}
            />

            <Tooltip />

            <Legend />

            <Bar
              dataKey="Pass"
              fill="#16a34a"
              radius={[
                6,
                6,
                0,
                0,
              ]}
            />

            <Bar
              dataKey="Fail"
              fill="#dc2626"
              radius={[
                6,
                6,
                0,
                0,
              ]}
            />

            <Bar
              dataKey="Pending"
              fill="#f59e0b"
              radius={[
                6,
                6,
                0,
                0,
              ]}
            />

          </BarChart>

        </ResponsiveContainer>

      </ChartCard>

      {/* ==================================================== */}
      {/* DATE-WISE DRIFT */}
      {/* ==================================================== */}

      <ChartCard
        title="Date-wise Measurement Drift"
        description="Absolute measurement error plotted against the actual test date."
      >

        {driftData.length >
        0 ? (

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <LineChart
              data={driftData}
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="date"
                label={{
                  value:
                    "Test Date",
                  position:
                    "insideBottom",
                  offset: -5,
                }}
              />

              <YAxis
                label={{
                  value:
                    "Absolute Error",
                  angle: -90,
                  position:
                    "insideLeft",
                }}
              />

              <Tooltip
                formatter={(
                  value
                ) => [
                  value,
                  "Absolute Error",
                ]}
                labelFormatter={(
                  label,
                  payload
                ) => {

                  const item =
                    payload?.[0]
                      ?.payload;

                  return item?.time
                    ? `${label} • ${item.time}`
                    : label;
                }}
              />

              <Line
                type="monotone"
                dataKey="error"
                name="Absolute Error"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{
                  r: 4,
                }}
                activeDot={{
                  r: 7,
                }}
              />

            </LineChart>

          </ResponsiveContainer>

        ) : (

          <EmptyChart
            text="No dated measurement records available. New tests will automatically receive a date."
          />

        )}

      </ChartCard>

      {/* ==================================================== */}
      {/* ENVIRONMENT */}
      {/* ==================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        <ChartCard
          title="Temperature vs Measurement Error"
          description="Research correlation between recorded temperature and absolute measurement error."
          icon={
            <Thermometer
              size={20}
            />
          }
        >

          {temperatureData.length >
          0 ? (

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <ScatterChart>

                <CartesianGrid />

                <XAxis
                  type="number"
                  dataKey="temperature"
                  name="Temperature"
                  unit=" °C"
                />

                <YAxis
                  type="number"
                  dataKey="error"
                  name="Absolute Error"
                />

                <Tooltip />

                <Scatter
                  data={
                    temperatureData
                  }
                  fill="#2563eb"
                />

              </ScatterChart>

            </ResponsiveContainer>

          ) : (

            <EmptyChart
              text="No temperature data available."
            />

          )}

        </ChartCard>

        <ChartCard
          title="Humidity vs Measurement Error"
          description="Research correlation between recorded humidity and absolute measurement error."
          icon={
            <Droplets
              size={20}
            />
          }
        >

          {humidityData.length >
          0 ? (

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <ScatterChart>

                <CartesianGrid />

                <XAxis
                  type="number"
                  dataKey="humidity"
                  name="Humidity"
                  unit="%"
                />

                <YAxis
                  type="number"
                  dataKey="error"
                  name="Absolute Error"
                />

                <Tooltip />

                <Scatter
                  data={
                    humidityData
                  }
                  fill="#0891b2"
                />

              </ScatterChart>

            </ResponsiveContainer>

          ) : (

            <EmptyChart
              text="No humidity data available."
            />

          )}

        </ChartCard>

      </div>

      {/* ==================================================== */}
      {/* RISK */}
      {/* ==================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        <ChartCard
          title="Instrument Risk Distribution"
          description="Current early-warning risk categories across registered instruments."
          icon={
            <ShieldAlert
              size={20}
            />
          }
        >

          {riskData.length >
          0 ? (

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <PieChart>

                <Pie
                  data={riskData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label
                >

                  {riskData.map(
                    (entry) => (

                      <Cell
                        key={
                          entry.name
                        }
                        fill={
                          entry.name ===
                          "LOW"
                            ? "#16a34a"
                            : entry.name ===
                              "MEDIUM"
                            ? "#f59e0b"
                            : entry.name ===
                              "HIGH"
                            ? "#dc2626"
                            : "#64748b"
                        }
                      />

                    )
                  )}

                </Pie>

                <Tooltip />

                <Legend />

              </PieChart>

            </ResponsiveContainer>

          ) : (

            <EmptyChart
              text="No risk data available."
            />

          )}

        </ChartCard>

        {/* RESEARCH INTERPRETATION */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <ShieldAlert
                size={22}
              />
            </div>

            <div>

              <h2 className="text-lg font-black text-slate-900">
                Research Interpretation
              </h2>

              <p className="text-sm text-slate-500">
                Automated analytical indicators
              </p>

            </div>

          </div>

          <div className="mt-6 space-y-4">

            <ResearchRow
              label="Inspection success"
              value={`${analytics.inspectionPassPercentage.toFixed(
                2
              )}%`}
            />

            <ResearchRow
              label="Test success"
              value={`${analytics.testPassPercentage.toFixed(
                2
              )}%`}
            />

            <ResearchRow
              label="Average absolute error"
              value={errorMetrics.absoluteAverage.toFixed(
                4
              )}
            />

            <ResearchRow
              label="Maximum absolute error"
              value={errorMetrics.maximum.toFixed(
                4
              )}
            />

            <ResearchRow
              label="Instruments analyzed"
              value={
                instruments.length
              }
            />

            <ResearchRow
              label="Dated measurements"
              value={
                driftData.length
              }
            />

            <ResearchRow
              label="Eccentricity inspections"
              value={
                eccentricityMetrics.inspections
              }
            />

            <ResearchRow
              label="Maximum eccentricity spread"
              value={eccentricityMetrics.maximumDifference.toFixed(
                4
              )}
            />

            <ResearchRow
              label="Repeatability inspections"
              value={
                repeatabilityMetrics.inspections
              }
            />

            <ResearchRow
              label="Total repeatability readings"
              value={
                repeatabilityMetrics.readings
              }
            />

            <ResearchRow
              label="Average repeatability range"
              value={repeatabilityMetrics.averageRange.toFixed(
                4
              )}
            />

            <ResearchRow
              label="Maximum repeatability range"
              value={repeatabilityMetrics.maximumRange.toFixed(
                4
              )}
            />

            <ResearchRow
              label="Total audit events"
              value={
                auditMetrics.totalEvents
              }
            />

            <ResearchRow
              label="Unique audit users"
              value={
                auditMetrics.uniqueUsers
              }
            />

            <ResearchRow
              label="Tracked audit entities"
              value={
                auditMetrics.uniqueEntities
              }
            />

            <ResearchRow
              label="Recent audit events"
              value={
                auditMetrics.recentEvents
              }
            />

            <ResearchRow
              label="Tracked value changes"
              value={
                auditChangeMetrics.totalChanges
              }
            />

          </div>

          <div className="mt-6 space-y-4">

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
              Eccentricity spread represents
              the observed difference between
              the highest and lowest platform
              readings. It is an analytical
              measurement indicator and does not
              itself establish regulatory PASS/FAIL.
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              Repeatability range represents
              the observed difference between
              the highest and lowest repeated
              measurements within an inspection.
              Lower variation generally indicates
              more stable repeated readings.
              It does not itself establish
              regulatory PASS/FAIL.
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-800">
              Audit analytics provide traceability
              of system actions by user, entity,
              old value, new value and timestamp.
              This supports accountability,
              reproducibility and research
              auditability but does not itself
              determine metrological compliance.
            </div>

          </div>

        </div>

      </div>

      {/* ==================================================== */}
      {/* FINAL RESEARCH NOTE */}
      {/* ==================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">

        <div className="flex items-start gap-4">

          <div className="rounded-xl bg-white/10 p-3">
            <BarChart3
              size={23}
            />
          </div>

          <div>

            <h2 className="text-lg font-black">
              SmartMetrix Research Analytics
            </h2>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
              This analytical layer combines
              historical measurement behavior,
              test dates, eccentricity
              measurements, repeatability
              measurements, environmental
              observations, compliance outcomes,
              instrument risk indicators,
              predictive intelligence and
              complete audit-trail information.
              These outputs are research indicators
              and do not replace applicable
              OIML-oriented measurement rules or
              regulatory certification decisions.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

/* ========================================================== */
/* SECTION HEADER */
/* ========================================================== */

function SectionHeader({
  step,
  title,
  description,
  icon,
  purple,
}: {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  purple?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="flex items-start gap-3">

        <div
          className={`rounded-xl p-3 ${
            purple
              ? "bg-purple-50 text-purple-600"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {icon}
        </div>

        <div>

          <p
            className={`text-sm font-bold ${
              purple
                ? "text-purple-600"
                : "text-blue-600"
            }`}
          >
            {step}
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            {title}
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            {description}
          </p>

        </div>

      </div>

    </div>
  );
}

/* ========================================================== */
/* METRIC CARD */
/* ========================================================== */

function MetricCard({
  title,
  value,
  icon,
  positive,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-3xl font-black ${
              positive
                ? "text-green-600"
                : "text-slate-900"
            }`}
          >
            {value}
          </p>

        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-slate-600">
          {icon}
        </div>

      </div>

    </div>
  );
}

/* ========================================================== */
/* INSIGHT CARD */
/* ========================================================== */

function InsightCard({
  title,
  value,
  subtitle,
  icon,
  danger,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center gap-3">

        <div
          className={`rounded-xl p-3 ${
            danger
              ? "bg-red-50 text-red-600"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          {icon}
        </div>

        <div>

          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p
            className={`mt-1 text-2xl font-black ${
              danger
                ? "text-red-600"
                : "text-slate-900"
            }`}
          >
            {value}
          </p>

        </div>

      </div>

      <p className="mt-4 text-xs text-slate-500">
        {subtitle}
      </p>

    </div>
  );
}

/* ========================================================== */
/* CHART CARD */
/* ========================================================== */

function ChartCard({
  title,
  description,
  children,
  icon,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-6 flex items-start gap-3">

        {icon && (
          <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
            {icon}
          </div>
        )}

        <div>

          <h2 className="text-lg font-black text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>

        </div>

      </div>

      <div className="h-[350px] w-full">
        {children}
      </div>

    </div>
  );
}

/* ========================================================== */
/* EMPTY CHART */
/* ========================================================== */

function EmptyChart({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm font-semibold text-slate-400">
      {text}
    </div>
  );
}

/* ========================================================== */
/* RESEARCH ROW */
/* ========================================================== */

function ResearchRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3">

      <span className="text-sm font-medium text-slate-500">
        {label}
      </span>

      <span className="text-sm font-black text-slate-900">
        {value}
      </span>

    </div>
  );
}