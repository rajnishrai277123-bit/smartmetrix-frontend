
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Thermometer,
  Droplets,
  Activity,
  XCircle,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import api from "../services/api";

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

interface Inspection {
  id: number;
  instrumentId: number;
  inspectorId: number;
  status: string;
  overallResult: string;
}

interface TestRecord {
  id: number;
  inspectionId: number;
  testType: string;
  referenceWeight: number;
  observedWeight: number;
  error: number;
  mpe: number;
  result: string;
}

interface RepeatabilityRecord {
  id: number;
  inspectionId: number;
  testRunId?: number;
  result?: string;
}

interface EccentricityRecord {
  id: number;
  inspectionId: number;
  result?: string;
}

interface WeatherResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
  };
}

const DEFAULT_VIBRATION = 0.1;

const Inspections = () => {
  /*
   * --------------------------------------------------
   * Navigation
   * --------------------------------------------------
   */

  const navigate = useNavigate();

  const routerLocation = useLocation();

  /*
   * --------------------------------------------------
   * Instrument ID received from Instruments page
   * --------------------------------------------------
   *
   * When a new instrument is created in Instruments.tsx,
   * we navigate here like:
   *
   * navigate("/inspections", {
   *   state: { instrumentId: createdInstrumentId }
   * });
   *
   */

  const incomingInstrumentId =
    routerLocation.state?.instrumentId;

  /*
   * --------------------------------------------------
   * State
   * --------------------------------------------------
   */

  const [instruments, setInstruments] =
    useState<Instrument[]>([]);

  const [inspections, setInspections] =
    useState<Inspection[]>([]);

  const [testRecords, setTestRecords] =
    useState<TestRecord[]>([]);

  const [repeatabilityRecords, setRepeatabilityRecords] =
    useState<RepeatabilityRecord[]>([]);

  const [eccentricityRecords, setEccentricityRecords] =
    useState<EccentricityRecord[]>([]);

  const [repeatabilityResults, setRepeatabilityResults] =
    useState<Record<number, string>>({});

  const [eccentricityResults, setEccentricityResults] =
    useState<Record<number, string>>({});

  const [selectedInstrument, setSelectedInstrument] =
    useState<Instrument | null>(null);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState<number | null>(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /*
   * --------------------------------------------------
   * Environment
   * --------------------------------------------------
   */

  const [location, setLocation] =
    useState("");

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [latitude, setLatitude] =
    useState<number | null>(null);

  const [longitude, setLongitude] =
    useState<number | null>(null);

  const [temperature, setTemperature] =
    useState<number | null>(null);

  const [humidity, setHumidity] =
    useState<number | null>(null);

  const [vibration, setVibration] =
    useState<number>(DEFAULT_VIBRATION);

  const [environmentStatus, setEnvironmentStatus] =
    useState("NOT_ASSESSED");

  const [environmentSaving, setEnvironmentSaving] =
    useState(false);

  /*
   * --------------------------------------------------
   * Initial Load
   * --------------------------------------------------
   */

  useEffect(() => {
    loadData();

    const savedLocation =
      localStorage.getItem(
        "smartmetrix_environment_location"
      );

    if (savedLocation) {
      setLocation(savedLocation);
    }
  }, []);

  /*
   * --------------------------------------------------
   * Load All Data
   * --------------------------------------------------
   */

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        instrumentResponse,
        inspectionResponse,
        testResponse,
        repeatabilityResponse,
        eccentricityResponse,
      ] = await Promise.all([
        api.get("/instruments"),
        api.get("/inspections"),
        api.get("/test-records"),
        api.get("/repeatability"),
        api.get("/eccentricity"),
      ]);

      const loadedInstruments: Instrument[] =
        instrumentResponse.data;

      const loadedInspections: Inspection[] =
        inspectionResponse.data;

      const loadedRepeatabilityRecords:
        RepeatabilityRecord[] =
        repeatabilityResponse.data;

      const loadedEccentricityRecords:
        EccentricityRecord[] =
        eccentricityResponse.data;

      setInstruments(loadedInstruments);

      setInspections(loadedInspections);

      setTestRecords(testResponse.data);

      setRepeatabilityRecords(
        loadedRepeatabilityRecords
      );

      setEccentricityRecords(
        loadedEccentricityRecords
      );

      /*
       * ------------------------------------------------
       * Automatically select instrument received from
       * Instruments page
       * ------------------------------------------------
       */

      if (
        incomingInstrumentId !== undefined &&
        incomingInstrumentId !== null
      ) {
        const instrument =
          loadedInstruments.find(
            (item) =>
              item.id ===
              Number(incomingInstrumentId)
          );

        if (instrument) {
          setSelectedInstrument(instrument);

          setMessage(
            `Instrument #${instrument.id} (${instrument.serialNumber}) selected automatically.`
          );
        }
      }

      /*
       * ------------------------------------------------
       * Repeatability results
       * ------------------------------------------------
       */

      const repeatabilityResultEntries =
        await Promise.all(
          loadedInspections.map(
            async (inspection) => {
              const records =
                loadedRepeatabilityRecords.filter(
                  (record) =>
                    record.inspectionId ===
                    inspection.id
                );

              const latestRunId =
                records
                  .map(
                    (record) =>
                      record.testRunId
                  )
                  .filter(
                    (
                      id
                    ): id is number =>
                      id !== undefined
                  )
                  .sort(
                    (a, b) => b - a
                  )[0];

              if (
                latestRunId ===
                undefined
              ) {
                return [
                  inspection.id,
                  "PENDING",
                ] as const;
              }

              try {
                const response =
                  await api.get(
                    `/repeatability/run/${latestRunId}/summary`
                  );

                return [
                  inspection.id,
                  response.data?.result ||
                    "PENDING",
                ] as const;
              } catch {
                return [
                  inspection.id,
                  "PENDING",
                ] as const;
              }
            }
          )
        );

      /*
       * ------------------------------------------------
       * Eccentricity results
       * ------------------------------------------------
       */

      const eccentricityResultEntries =
        await Promise.all(
          loadedInspections.map(
            async (inspection) => {
              const records =
                loadedEccentricityRecords.filter(
                  (record) =>
                    record.inspectionId ===
                    inspection.id
                );

              if (
                records.length ===
                0
              ) {
                return [
                  inspection.id,
                  "PENDING",
                ] as const;
              }

              try {
                const response =
                  await api.get(
                    `/eccentricity/inspection/${inspection.id}/summary`
                  );

                return [
                  inspection.id,
                  response.data?.result ||
                    "PENDING",
                ] as const;
              } catch {
                return [
                  inspection.id,
                  "PENDING",
                ] as const;
              }
            }
          )
        );

      setRepeatabilityResults(
        Object.fromEntries(
          repeatabilityResultEntries
        )
      );

      setEccentricityResults(
        Object.fromEntries(
          eccentricityResultEntries
        )
      );
    } catch (err) {
      console.error(
        "Failed to load inspection data",
        err
      );

      setError(
        "Unable to load inspection data."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * --------------------------------------------------
   * Filter Instruments
   * --------------------------------------------------
   */

  const filteredInstruments =
    useMemo(() => {
      const value =
        search
          .toLowerCase()
          .trim();

      if (!value) {
        return instruments;
      }

      return instruments.filter(
        (instrument) =>
          instrument.serialNumber
            .toLowerCase()
            .includes(value) ||
          instrument.model
            .toLowerCase()
            .includes(value) ||
          instrument.manufacturer
            .toLowerCase()
            .includes(value)
      );
    }, [
      instruments,
      search,
    ]);

  /*
   * --------------------------------------------------
   * Get Instrument
   * --------------------------------------------------
   */

  const getInstrument = (
    instrumentId: number
  ) => {
    return instruments.find(
      (item) =>
        item.id === instrumentId
    );
  };

  /*
   * --------------------------------------------------
   * Get Inspection Tests
   * --------------------------------------------------
   */

  const getInspectionTests = (
    inspectionId: number
  ) => {
    return testRecords.filter(
      (record) =>
        record.inspectionId ===
        inspectionId
    );
  };

  /*
   * --------------------------------------------------
   * Test Stages
   * --------------------------------------------------
   */

  const getInspectionTestStages = (
    inspectionId: number
  ) => {
    const tests =
      getInspectionTests(
        inspectionId
      );

    const hasWeighingPerformance =
      tests.some(
        (test) =>
          test.testType ===
          "WEIGHING_PERFORMANCE"
      );

    const hasRepeatability =
      repeatabilityRecords.some(
        (record) =>
          record.inspectionId ===
          inspectionId
      );

    const hasEccentricity =
      eccentricityRecords.some(
        (record) =>
          record.inspectionId ===
          inspectionId
      );

    const count =
      Number(
        hasWeighingPerformance
      ) +
      Number(
        hasRepeatability
      ) +
      Number(
        hasEccentricity
      );

    return {
      hasWeighingPerformance,
      hasRepeatability,
      hasEccentricity,
      count,
    };
  };

  /*
   * --------------------------------------------------
   * Stage Results
   * --------------------------------------------------
   */

  const getInspectionStageResults = (
    inspectionId: number
  ): string[] => {
    const tests =
      getInspectionTests(
        inspectionId
      );

    const weighingResults =
      tests
        .filter(
          (test) =>
            test.testType ===
            "WEIGHING_PERFORMANCE"
        )
        .map(
          (test) =>
            test.result
        )
        .filter(
          (
            result
          ): result is string =>
            Boolean(result)
        );

    const weighingResult =
      weighingResults.length >
      0
        ? weighingResults[
            weighingResults.length - 1
          ]
        : "PENDING";

    const repeatabilityResult =
      repeatabilityResults[
        inspectionId
      ] || "PENDING";

    const eccentricityResult =
      eccentricityResults[
        inspectionId
      ] || "PENDING";

    return [
      weighingResult,
      repeatabilityResult,
      eccentricityResult,
    ];
  };

  /*
   * ==================================================
   * ENVIRONMENT
   * ==================================================
   */

  const getWeather = async (
    lat: number,
    lon: number,
    selectedLocation: string
  ) => {
    try {
      setLocationLoading(true);
      setError("");

      const response =
        await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`
        );

      if (!response.ok) {
        throw new Error(
          "Weather API failed"
        );
      }

      const data: WeatherResponse =
        await response.json();

      const currentTemperature =
        data.current
          ?.temperature_2m ??
        null;

      const currentHumidity =
        data.current
          ?.relative_humidity_2m ??
        null;

      setLatitude(lat);
      setLongitude(lon);

      setTemperature(
        currentTemperature
      );

      setHumidity(
        currentHumidity
      );

      setLocation(
        selectedLocation
      );

      localStorage.setItem(
        "smartmetrix_environment_location",
        selectedLocation
      );

      if (
        currentTemperature !==
          null &&
        currentHumidity !==
          null
      ) {
        await assessEnvironment(
          currentTemperature,
          currentHumidity,
          vibration
        );
      }

      setMessage(
        "Environment data fetched successfully."
      );
    } catch (err) {
      console.error(
        "Weather fetch failed",
        err
      );

      setError(
        "Unable to fetch weather data. Please check the location or internet connection."
      );
    } finally {
      setLocationLoading(
        false
      );
    }
  };

  /*
   * --------------------------------------------------
   * Search Location
   * --------------------------------------------------
   */

  const searchLocation = async () => {
    const value =
      location.trim();

    if (!value) {
      setError(
        "Please enter a city or location."
      );
      return;
    }

    try {
      setLocationLoading(
        true
      );

      setError("");
      setMessage("");

      const response =
        await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            value
          )}&count=1&language=en&format=json`
        );

      if (!response.ok) {
        throw new Error(
          "Location search failed"
        );
      }

      const data =
        await response.json();

      if (
        !data.results ||
        data.results.length ===
          0
      ) {
        setError(
          "Location not found. Try another city name."
        );
        return;
      }

      const result =
        data.results[0];

      const displayLocation =
        [
          result.name,
          result.admin1,
          result.country,
        ]
          .filter(Boolean)
          .join(", ");

      await getWeather(
        Number(result.latitude),
        Number(result.longitude),
        displayLocation
      );
    } catch (err) {
      console.error(
        "Location search failed",
        err
      );

      setError(
        "Unable to search location."
      );
    } finally {
      setLocationLoading(
        false
      );
    }
  };

  /*
   * --------------------------------------------------
   * Current Location
   * --------------------------------------------------
   */

  const useCurrentLocation =
    () => {
      if (
        !navigator.geolocation
      ) {
        setError(
          "Geolocation is not supported by this browser."
        );
        return;
      }

      setLocationLoading(
        true
      );

      setError("");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const lat =
              position.coords
                .latitude;

            const lon =
              position.coords
                .longitude;

            await getWeather(
              lat,
              lon,
              "Current Location"
            );
          } catch (err) {
            console.error(err);

            setError(
              "Unable to fetch current location weather."
            );
          } finally {
            setLocationLoading(
              false
            );
          }
        },
        (err) => {
          console.error(err);

          setLocationLoading(
            false
          );

          setError(
            "Unable to access current location. Please enter a city manually."
          );
        }
      );
    };

  /*
   * --------------------------------------------------
   * Environment Assessment
   * --------------------------------------------------
   */

  const assessEnvironment =
    async (
      temp: number,
      humidityValue: number,
      vibrationValue: number
    ) => {
      try {
        const response =
          await api.post(
            "/environment/assess",
            {
              temperature:
                temp,
              humidity:
                humidityValue,
              vibration:
                vibrationValue,
            }
          );

        setEnvironmentStatus(
          response.data
            ?.overall ||
            "NOT_ASSESSED"
        );

        return response.data;
      } catch (err) {
        console.error(
          "Environment assessment failed",
          err
        );

        return null;
      }
    };

  /*
   * --------------------------------------------------
   * Vibration
   * --------------------------------------------------
   */

  const handleVibrationChange =
    async (
      value: number
    ) => {
      setVibration(value);

      if (
        temperature !==
          null &&
        humidity !==
          null
      ) {
        await assessEnvironment(
          temperature,
          humidity,
          value
        );
      }
    };

  /*
   * --------------------------------------------------
   * Reset Environment
   * --------------------------------------------------
   */

  const resetEnvironment =
    () => {
      setLocation("");
      setLatitude(null);
      setLongitude(null);
      setTemperature(null);
      setHumidity(null);
      setVibration(
        DEFAULT_VIBRATION
      );
      setEnvironmentStatus(
        "NOT_ASSESSED"
      );
    };

  /*
   * --------------------------------------------------
   * Save Environment
   * --------------------------------------------------
   */

  const saveEnvironmentRecord =
    async (
      inspectionId: number
    ) => {
      if (
        temperature === null ||
        humidity === null
      ) {
        return;
      }

      try {
        setEnvironmentSaving(
          true
        );

        const response =
          await api.post(
            "/environment",
            {
              inspectionId,
              temperature,
              humidity,
              vibration,
              source:
                "WEATHER_API",
              status:
                environmentStatus,
            }
          );

        console.log(
          "Environment record saved:",
          response.data
        );
      } catch (err) {
        console.error(
          "Environment record save failed",
          err
        );

        throw new Error(
          "Environment record could not be saved."
        );
      } finally {
        setEnvironmentSaving(
          false
        );
      }
    };

  /*
   * ==================================================
   * CREATE INSPECTION
   * ==================================================
   */

  const createInspection =
    async () => {
      if (
        !selectedInstrument
      ) {
        setError(
          "Please select an instrument first."
        );
        return;
      }

      if (
        !location.trim()
      ) {
        setError(
          "Please select or enter an inspection location."
        );
        return;
      }

      if (
        temperature ===
          null ||
        humidity === null
      ) {
        setError(
          "Please fetch environment data before creating the inspection."
        );
        return;
      }

      try {
        setError("");
        setMessage("");

        /*
         * Create inspection
         */

        const response =
          await api.post(
            "/inspections",
            {
              instrumentId:
                selectedInstrument.id,
            }
          );

        const inspectionId =
          response.data?.id;

        if (!inspectionId) {
          throw new Error(
            "Inspection ID was not returned by backend."
          );
        }

        /*
         * Save environment
         */

        await saveEnvironmentRecord(
          inspectionId
        );

        /*
         * IMPORTANT:
         * Navigate automatically to Tests page
         */

        navigate(
          "/tests",
          {
            state: {
              inspectionId:
                inspectionId,
            },
          }
        );

        /*
         * Do not clear selected instrument
         * before navigation.
         */

      } catch (err: any) {
        console.error(
          "Inspection creation failed",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            err?.message ||
            "Unable to create inspection."
        );
      }
    };

  /*
   * --------------------------------------------------
   * Complete Inspection
   * --------------------------------------------------
   */

  const completeInspection =
    async (
      inspectionId: number
    ) => {
      try {
        setActionLoading(
          inspectionId
        );

        setError("");
        setMessage("");

        await api.post(
          `/inspections/${inspectionId}/complete`
        );

        setMessage(
          `Inspection #${inspectionId} completed successfully.`
        );

        await loadData();
      } catch (err: any) {
        console.error(
          "Complete inspection failed",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            "Unable to complete inspection."
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  /*
   * --------------------------------------------------
   * Submit Inspection
   * --------------------------------------------------
   */

  const submitInspection =
    async (
      inspectionId: number
    ) => {
      try {
        setActionLoading(
          inspectionId
        );

        setError("");
        setMessage("");

        await api.post(
          `/inspections/${inspectionId}/submit`
        );

        setMessage(
          `Inspection #${inspectionId} submitted for Senior Officer approval.`
        );

        await loadData();
      } catch (err: any) {
        console.error(
          "Submit inspection failed",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            "Unable to submit inspection."
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  /*
   * --------------------------------------------------
   * Status Classes
   * --------------------------------------------------
   */

  const getStatusClass =
    (status: string) => {
      switch (status) {
        case "IN_PROGRESS":
          return "bg-amber-50 text-amber-700 border-amber-200";

        case "COMPLETED":
          return "bg-blue-50 text-blue-700 border-blue-200";

        case "SUBMITTED":
          return "bg-purple-50 text-purple-700 border-purple-200";

        case "APPROVED":
          return "bg-indigo-50 text-indigo-700 border-indigo-200";

        case "CONTROLLER_APPROVED":
          return "bg-emerald-50 text-emerald-700 border-emerald-200";

        default:
          return "bg-slate-50 text-slate-600 border-slate-200";
      }
    };

  /*
   * --------------------------------------------------
   * Result Classes
   * --------------------------------------------------
   */

  const getResultClass =
    (result: string) => {
      if (result === "PASS") {
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      }

      if (result === "FAIL") {
        return "bg-red-50 text-red-700 border-red-200";
      }

      return "bg-slate-50 text-slate-600 border-slate-200";
    };

  /*
   * --------------------------------------------------
   * Environment Class
   * --------------------------------------------------
   */

  const getEnvironmentClass =
    (status: string) => {
      if (
        status === "NORMAL"
      ) {
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      }

      if (
        status === "OUT_OF_RANGE"
      ) {
        return "bg-red-50 text-red-700 border-red-200";
      }

      return "bg-slate-50 text-slate-600 border-slate-200";
    };

  /*
   * --------------------------------------------------
   * Workflow Step
   * --------------------------------------------------
   */

  const getWorkflowStep =
    (
      inspection: Inspection
    ) => {
      const tests =
        getInspectionTests(
          inspection.id
        );

      if (
        inspection.status ===
        "CONTROLLER_APPROVED"
      ) {
        return 5;
      }

      if (
        inspection.status ===
        "APPROVED"
      ) {
        return 4;
      }

      if (
        inspection.status ===
        "SUBMITTED"
      ) {
        return 3;
      }

      if (
        inspection.status ===
        "COMPLETED"
      ) {
        return 2;
      }

      if (
        tests.length > 0
      ) {
        return 1;
      }

      return 0;
    };

  /*
   * --------------------------------------------------
   * Workflow UI
   * --------------------------------------------------
   */

  const renderWorkflow =
    (
      inspection: Inspection
    ) => {
      const currentStep =
        getWorkflowStep(
          inspection
        );

      const steps = [
        {
          label: "Created",
          icon: ClipboardCheck,
        },
        {
          label: "Tested",
          icon: CheckCircle2,
        },
        {
          label: "Completed",
          icon: CheckCircle2,
        },
        {
          label: "Submitted",
          icon: Send,
        },
        {
          label: "Approved",
          icon: ShieldCheck,
        },
      ];

      return (
        <div className="mt-5">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {steps.map(
              (
                step,
                index
              ) => {
                const Icon =
                  step.icon;

                const active =
                  index <=
                  currentStep;

                return (
                  <div
                    key={
                      step.label
                    }
                    className="flex min-w-[95px] items-center"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                          active
                            ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                            : "border-slate-200 bg-slate-50 text-slate-400"
                        }`}
                      >
                        <Icon
                          size={17}
                        />
                      </div>

                      <span
                        className={`mt-1 text-[11px] font-medium ${
                          active
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }`}
                      >
                        {
                          step.label
                        }
                      </span>
                    </div>

                    {index <
                      steps.length -
                        1 && (
                      <div
                        className={`mx-2 h-[2px] min-w-[24px] flex-1 ${
                          index <
                          currentStep
                            ? "bg-emerald-300"
                            : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      );
    };

  /*
   * ==================================================
   * UI
   * ==================================================
   */

  return (
    <div className="space-y-6">

      {/* Header */}

      <div>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

          <div>
            <div className="flex items-center gap-2">

              <ClipboardCheck
                size={25}
                className="text-slate-700"
              />

              <h1 className="text-2xl font-bold text-slate-900">
                Inspections
              </h1>

            </div>

            <p className="mt-1 text-sm text-slate-500">
              Create, test, complete and submit NAWI inspections.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

            <Clock3
              size={18}
              className="text-slate-500"
            />

            <div>
              <p className="text-xs text-slate-500">
                Total inspections
              </p>

              <p className="text-lg font-bold text-slate-900">
                {inspections.length}
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* Alerts */}

      {message && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">

          <CheckCircle2
            size={18}
          />

          <span>
            {message}
          </span>

        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

          <XCircle
            size={18}
          />

          <span>
            {error}
          </span>

        </div>
      )}

      {/* Create Inspection */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="mb-5">

          <h2 className="text-lg font-bold text-slate-900">
            Create New Inspection
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select the weighing instrument and inspection environment.
          </p>

        </div>

        {/* Instrument Search */}

        <div className="relative">

          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search by serial number, model or manufacturer..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
          />

        </div>

        {/* Instruments */}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">

          {filteredInstruments.map(
            (instrument) => {

              const selected =
                selectedInstrument?.id ===
                instrument.id;

              return (
                <button
                  key={
                    instrument.id
                  }
                  type="button"
                  onClick={() =>
                    setSelectedInstrument(
                      instrument
                    )
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-slate-500 bg-slate-50 ring-2 ring-slate-200"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >

                  <div className="flex items-start justify-between gap-3">

                    <div>

                      <p className="font-semibold text-slate-900">
                        {
                          instrument.serialNumber
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          instrument.manufacturer
                        }{" "}
                        •{" "}
                        {
                          instrument.model
                        }
                      </p>

                    </div>

                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">

                      Class{" "}
                      {
                        instrument.instrumentClass
                      }

                    </span>

                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">

                    <div>
                      <p className="text-[11px] text-slate-400">
                        Capacity
                      </p>

                      <p className="text-sm font-semibold text-slate-700">
                        {
                          instrument.capacity
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400">
                        Scale interval
                      </p>

                      <p className="text-sm font-semibold text-slate-700">
                        {
                          instrument.scaleInterval
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400">
                        Status
                      </p>

                      <p className="text-sm font-semibold text-emerald-600">
                        {
                          instrument.status
                        }
                      </p>
                    </div>

                  </div>

                </button>
              );
            }
          )}

        </div>

        {filteredInstruments.length ===
          0 && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

            <p className="text-sm font-medium text-slate-600">
              No instruments found.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Try another serial number or model.
            </p>

          </div>
        )}

        {/* Environment */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">

            <div>

              <div className="flex items-center gap-2">

                <MapPin
                  size={19}
                  className="text-slate-700"
                />

                <h3 className="font-bold text-slate-900">
                  Inspection Environment
                </h3>

              </div>

              <p className="mt-1 text-xs text-slate-500">
                Select the inspection location to automatically capture environmental conditions.
              </p>

            </div>

            {environmentStatus !==
              "NOT_ASSESSED" && (
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getEnvironmentClass(
                  environmentStatus
                )}`}
              >
                {
                  environmentStatus
                }
              </span>
            )}

          </div>

          {/* Location */}

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">

            <div className="relative">

              <MapPin
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={location}
                onChange={(e) =>
                  setLocation(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    "Enter"
                  ) {
                    searchLocation();
                  }
                }}
                placeholder="Enter city / location e.g. Delhi"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
              />

            </div>

            <button
              type="button"
              onClick={
                searchLocation
              }
              disabled={
                locationLoading
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >

              {locationLoading ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Search
                  size={17}
                />
              )}

              Get Weather

            </button>

            <button
              type="button"
              onClick={
                useCurrentLocation
              }
              disabled={
                locationLoading
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >

              <MapPin
                size={17}
              />

              Current Location

            </button>

          </div>

          {/* Environment Cards */}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {/* Temperature */}

            <div className="rounded-xl border border-slate-200 bg-white p-4">

              <div className="flex items-center gap-2 text-slate-500">

                <Thermometer
                  size={18}
                />

                <span className="text-xs font-medium">
                  Temperature
                </span>

              </div>

              <p className="mt-2 text-2xl font-bold text-slate-900">

                {temperature !==
                null
                  ? `${temperature} °C`
                  : "--"}

              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                Weather API
              </p>

            </div>

            {/* Humidity */}

            <div className="rounded-xl border border-slate-200 bg-white p-4">

              <div className="flex items-center gap-2 text-slate-500">

                <Droplets
                  size={18}
                />

                <span className="text-xs font-medium">
                  Humidity
                </span>

              </div>

              <p className="mt-2 text-2xl font-bold text-slate-900">

                {humidity !==
                null
                  ? `${humidity}%`
                  : "--"}

              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                Relative humidity
              </p>

            </div>

            {/* Vibration */}

            <div className="rounded-xl border border-slate-200 bg-white p-4">

              <div className="flex items-center gap-2 text-slate-500">

                <Activity
                  size={18}
                />

                <span className="text-xs font-medium">
                  Vibration
                </span>

              </div>

              <input
                type="number"
                step="0.01"
                min="0"
                value={
                  vibration
                }
                onChange={(e) =>
                  handleVibrationChange(
                    Number(
                      e.target
                        .value
                    )
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-bold outline-none focus:border-slate-400"
              />

              <p className="mt-1 text-[11px] text-slate-400">
                Manual / simulated
              </p>

            </div>

            {/* Location */}

            <div className="rounded-xl border border-slate-200 bg-white p-4">

              <div className="flex items-center gap-2 text-slate-500">

                <MapPin
                  size={18}
                />

                <span className="text-xs font-medium">
                  Location
                </span>

              </div>

              <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-900">
                {
                  location ||
                  "--"
                }
              </p>

              <p className="mt-1 text-[11px] text-slate-400">

                {latitude !==
                  null &&
                longitude !==
                  null
                  ? `${latitude.toFixed(
                      4
                    )}, ${longitude.toFixed(
                      4
                    )}`
                  : "Not selected"}

              </p>

            </div>

          </div>

          {/* Environment Actions */}

          <div className="mt-4 flex flex-wrap items-center gap-2">

            <button
              type="button"
              onClick={() => {

                if (
                  latitude !==
                    null &&
                  longitude !==
                    null &&
                  location
                ) {
                  getWeather(
                    latitude,
                    longitude,
                    location
                  );
                } else {
                  searchLocation();
                }

              }}
              disabled={
                locationLoading
              }
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >

              <RefreshCw
                size={15}
              />

              Refresh Environment

            </button>

            <button
              type="button"
              onClick={
                resetEnvironment
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Reset
            </button>

            <span className="text-xs text-slate-400">
              Environment data is recorded separately from measurement error.
            </span>

          </div>

        </div>

        {/* Selected Instrument */}

        {selectedInstrument && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

              <div>

                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Selected instrument
                </p>

                <p className="mt-1 text-base font-bold text-slate-900">
                  Instrument #
                  {
                    selectedInstrument.id
                  }
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Serial Number:{" "}
                  {
                    selectedInstrument.serialNumber
                  }
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    selectedInstrument.manufacturer
                  }{" "}
                  {
                    selectedInstrument.model
                  }{" "}
                  • Class{" "}
                  {
                    selectedInstrument.instrumentClass
                  }
                </p>

              </div>

              <button
                type="button"
                disabled={
                  environmentSaving ||
                  location.trim() ===
                    "" ||
                  temperature ===
                    null ||
                  humidity ===
                    null
                }
                onClick={
                  createInspection
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {environmentSaving ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <ClipboardCheck
                    size={18}
                  />
                )}

                Create Inspection

              </button>

            </div>

          </div>
        )}

      </section>

      {/* Inspection History */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="mb-5 flex flex-col justify-between gap-2 md:flex-row md:items-center">

          <div>

            <h2 className="text-lg font-bold text-slate-900">
              Inspection Workflow
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage inspection progress before Senior Officer review.
            </p>

          </div>

          <button
            type="button"
            onClick={
              loadData
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>

        </div>

        {loading ? (

          <div className="flex items-center justify-center py-16">

            <Loader2
              size={28}
              className="animate-spin text-slate-400"
            />

          </div>

        ) : inspections.length ===
          0 ? (

          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">

            <ClipboardCheck
              size={34}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              No inspections found.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Create your first inspection above.
            </p>

          </div>

        ) : (

          <div className="space-y-4">

            {inspections
              .slice()
              .sort(
                (a, b) =>
                  b.id - a.id
              )
              .map(
                (
                  inspection
                ) => {

                  const instrument =
                    getInstrument(
                      inspection.instrumentId
                    );

                  const tests =
                    getInspectionTests(
                      inspection.id
                    );

                  const testStages =
                    getInspectionTestStages(
                      inspection.id
                    );

                  const stageResults =
                    getInspectionStageResults(
                      inspection.id
                    );

                  const hasTests =
                    testStages.count >
                    0;

                  const hasFailedTest =
                    stageResults.some(
                      (result) =>
                        result ===
                        "FAIL"
                    );

                  const allTestsPass =
                    testStages.count ===
                      3 &&
                    stageResults.length ===
                      3 &&
                    stageResults.every(
                      (result) =>
                        result ===
                        "PASS"
                    );

                  const canComplete =
                    inspection.status ===
                      "IN_PROGRESS" &&
                    hasTests;

                  const canSubmit =
                    inspection.status ===
                      "COMPLETED" &&
                    inspection.overallResult ===
                      "PASS";

                  return (

                    <div
                      key={
                        inspection.id
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >

                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="text-base font-bold text-slate-900">
                              Inspection #
                              {
                                inspection.id
                              }
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                inspection.status
                              )}`}
                            >
                              {
                                inspection.status
                              }
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getResultClass(
                                inspection.overallResult
                              )}`}
                            >
                              {
                                inspection.overallResult
                              }
                            </span>

                          </div>

                          <p className="mt-2 text-sm text-slate-500">
                            Instrument ID:{" "}
                            <span className="font-semibold text-slate-700">
                              #
                              {
                                inspection.instrumentId
                              }
                            </span>
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Serial Number:{" "}
                            <span className="font-semibold text-slate-700">
                              {
                                instrument?.serialNumber ||
                                "Unknown"
                              }
                            </span>
                          </p>

                          {instrument && (
                            <p className="mt-1 text-xs text-slate-400">
                              {
                                instrument.manufacturer
                              }{" "}
                              {
                                instrument.model
                              }{" "}
                              • Class{" "}
                              {
                                instrument.instrumentClass
                              }{" "}
                              • Capacity{" "}
                              {
                                instrument.capacity
                              }
                            </p>
                          )}

                        </div>

                        <div className="flex gap-3">

                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

                            <p className="text-[11px] text-slate-400">
                              Tests
                            </p>

                            <p className="text-lg font-bold text-slate-800">
                              {
                                testStages.count
                              }
                            </p>

                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

                            <p className="text-[11px] text-slate-400">
                              Pass
                            </p>

                            <p className="text-lg font-bold text-emerald-600">
                              {
                                stageResults.filter(
                                  (
                                    result
                                  ) =>
                                    result ===
                                    "PASS"
                                ).length
                              }
                            </p>

                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

                            <p className="text-[11px] text-slate-400">
                              Fail
                            </p>

                            <p className="text-lg font-bold text-red-600">
                              {
                                stageResults.filter(
                                  (
                                    result
                                  ) =>
                                    result ===
                                    "FAIL"
                                ).length
                              }
                            </p>

                          </div>

                        </div>

                      </div>

                      {hasTests && (

                        <div className="mt-5 overflow-x-auto">

                          <table className="w-full min-w-[650px] text-left text-sm">

                            <thead>

                              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">

                                <th className="pb-3 font-semibold">
                                  Test
                                </th>

                                <th className="pb-3 font-semibold">
                                  Reference
                                </th>

                                <th className="pb-3 font-semibold">
                                  Observed
                                </th>

                                <th className="pb-3 font-semibold">
                                  Error
                                </th>

                                <th className="pb-3 font-semibold">
                                  MPE
                                </th>

                                <th className="pb-3 font-semibold">
                                  Result
                                </th>

                              </tr>

                            </thead>

                            <tbody>

                              {tests.map(
                                (
                                  test
                                ) => (

                                  <tr
                                    key={
                                      test.id
                                    }
                                    className="border-b border-slate-100 last:border-0"
                                  >

                                    <td className="py-3 font-medium text-slate-700">
                                      {
                                        test.testType
                                      }
                                    </td>

                                    <td className="py-3 text-slate-600">
                                      {
                                        test.referenceWeight
                                      }
                                    </td>

                                    <td className="py-3 text-slate-600">
                                      {
                                        test.observedWeight
                                      }
                                    </td>

                                    <td className="py-3 text-slate-600">
                                      {
                                        test.error
                                      }
                                    </td>

                                    <td className="py-3 text-slate-600">
                                      {
                                        test.mpe
                                      }
                                    </td>

                                    <td className="py-3">

                                      <span
                                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${getResultClass(
                                          test.result
                                        )}`}
                                      >
                                        {
                                          test.result
                                        }
                                      </span>

                                    </td>

                                  </tr>

                                )
                              )}

                            </tbody>

                          </table>

                        </div>

                      )}

                      {hasTests && (

                        <div className="mt-5 grid gap-3 md:grid-cols-3">

                          {testStages.hasWeighingPerformance && (

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                              <div className="flex items-center justify-between gap-2">

                                <p className="text-sm font-bold text-slate-800">
                                  Weighing Performance
                                </p>

                                <span
                                  className={`rounded-full border px-2 py-1 text-xs font-semibold ${getResultClass(
                                    getInspectionStageResults(
                                      inspection.id
                                    )[0] ||
                                      "PENDING"
                                  )}`}
                                >
                                  {
                                    getInspectionStageResults(
                                      inspection.id
                                    )[0] ||
                                    "PENDING"
                                  }
                                </span>

                              </div>

                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  tests.length
                                }{" "}
                                measurement record
                                {
                                  tests.length ===
                                  1
                                    ? ""
                                    : "s"
                                }
                              </p>

                            </div>

                          )}

                          {testStages.hasRepeatability && (

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                              <div className="flex items-center justify-between gap-2">

                                <p className="text-sm font-bold text-slate-800">
                                  Repeatability
                                </p>

                                <span
                                  className={`rounded-full border px-2 py-1 text-xs font-semibold ${getResultClass(
                                    repeatabilityResults[
                                      inspection.id
                                    ] ||
                                      "PENDING"
                                  )}`}
                                >
                                  {
                                    repeatabilityResults[
                                      inspection.id
                                    ] ||
                                    "PENDING"
                                  }
                                </span>

                              </div>

                              <p className="mt-1 text-xs text-slate-500">
                                Test stage completed
                              </p>

                            </div>

                          )}

                          {testStages.hasEccentricity && (

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                              <div className="flex items-center justify-between gap-2">

                                <p className="text-sm font-bold text-slate-800">
                                  Eccentricity
                                </p>

                                <span
                                  className={`rounded-full border px-2 py-1 text-xs font-semibold ${getResultClass(
                                    eccentricityResults[
                                      inspection.id
                                    ] ||
                                      "PENDING"
                                  )}`}
                                >
                                  {
                                    eccentricityResults[
                                      inspection.id
                                    ] ||
                                    "PENDING"
                                  }
                                </span>

                              </div>

                              <p className="mt-1 text-xs text-slate-500">
                                Test stage completed
                              </p>

                            </div>

                          )}

                        </div>

                      )}

                      {renderWorkflow(
                        inspection
                      )}

                      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          {!hasTests &&
                            inspection.status ===
                              "IN_PROGRESS" && (
                              <p className="text-xs text-amber-600">
                                Add at least one test from the Tests page before completing this inspection.
                              </p>
                            )}

                          {hasFailedTest &&
                            inspection.status ===
                              "IN_PROGRESS" && (
                              <p className="text-xs text-red-600">
                                One or more tests have failed. This inspection cannot be submitted as PASS.
                              </p>
                            )}

                          {allTestsPass &&
                            inspection.status ===
                              "IN_PROGRESS" && (
                              <p className="text-xs text-emerald-600">
                                All current tests are PASS. You can complete this inspection.
                              </p>
                            )}

                          {inspection.status ===
                            "COMPLETED" && (
                            <p className="text-xs text-blue-600">
                              Inspection completed. Submit it for Senior Officer approval.
                            </p>
                          )}

                          {inspection.status ===
                            "SUBMITTED" && (
                            <p className="text-xs text-purple-600">
                              Waiting for Senior Officer approval.
                            </p>
                          )}

                          {inspection.status ===
                            "APPROVED" && (
                            <p className="text-xs text-indigo-600">
                              Senior approved. Waiting for Controller approval.
                            </p>
                          )}

                          {inspection.status ===
                            "CONTROLLER_APPROVED" && (
                            <p className="text-xs text-emerald-600">
                              Inspection fully approved.
                            </p>
                          )}

                        </div>

                        <div className="flex flex-wrap gap-2">

                          {canComplete && (

                            <button
                              type="button"
                              disabled={
                                actionLoading ===
                                inspection.id
                              }
                              onClick={() =>
                                completeInspection(
                                  inspection.id
                                )
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >

                              {actionLoading ===
                              inspection.id ? (
                                <Loader2
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <CheckCircle2
                                  size={17}
                                />
                              )}

                              Complete Inspection

                            </button>

                          )}

                          {canSubmit && (

                            <button
                              type="button"
                              disabled={
                                actionLoading ===
                                inspection.id
                              }
                              onClick={() =>
                                submitInspection(
                                  inspection.id
                                )
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >

                              {actionLoading ===
                              inspection.id ? (
                                <Loader2
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <Send
                                  size={17}
                                />
                              )}

                              Submit for Senior Approval

                            </button>

                          )}

                        </div>

                      </div>

                    </div>

                  );
                }
              )}

          </div>

        )}

      </section>

    </div>
  );
};

export default Inspections;

