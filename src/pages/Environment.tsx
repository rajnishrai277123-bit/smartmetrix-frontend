import { useEffect, useState } from "react";
import {
  CloudSun,
  Droplets,
  MapPin,
  RefreshCw,
  Thermometer,
  Wind,
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  History,
  Activity,
} from "lucide-react";

import api from "../services/api";

interface Inspection {
  id: number;
  instrumentId: number;
  inspectorId: number;
  status: string;
  overallResult: string;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  latitude: number;
  longitude: number;
  source: string;
}

interface EnvironmentRecord {
  id: number;
  inspectionId: number;
  temperature: number | null;
  humidity: number | null;
  vibration: number | null;
  source: string;
  status: string;
}

function Environment() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [selectedInspectionId, setSelectedInspectionId] =
    useState("");

  const [weather, setWeather] =
    useState<WeatherData | null>(null);

  const [historicalEnvironment, setHistoricalEnvironment] =
    useState<EnvironmentRecord | null>(null);

  const [loadingInspections, setLoadingInspections] =
    useState(true);

  const [loadingWeather, setLoadingWeather] =
    useState(false);

  const [loadingHistoricalEnvironment, setLoadingHistoricalEnvironment] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ---------------------------------------------------------
  // Load inspections
  // ---------------------------------------------------------
  const loadInspections = async () => {
    try {
      setLoadingInspections(true);
      setError("");

      const response = await api.get("/inspections");

      const data: Inspection[] = response.data || [];

      setInspections(data);

      const activeInspection = data.find(
        (inspection) =>
          inspection.status?.toUpperCase() === "IN_PROGRESS"
      );

      if (activeInspection) {
        setSelectedInspectionId(
          String(activeInspection.id)
        );
      } else if (data.length > 0) {
        setSelectedInspectionId(String(data[0].id));
      }
    } catch (err: any) {
      console.error(
        "Failed to load inspections",
        err
      );

      if (err?.response?.status === 401) {
        setError(
          "Your session has expired. Please login again."
        );
      } else if (err?.response?.status === 403) {
        setError(
          "You do not have permission to access inspections."
        );
      } else {
        setError(
          err?.response?.data?.message ||
            "Unable to load inspection data."
        );
      }
    } finally {
      setLoadingInspections(false);
    }
  };

  // ---------------------------------------------------------
  // Fetch current live weather
  // ---------------------------------------------------------
  const fetchWeather = () => {
    setError("");
    setMessage("");
    setWeather(null);

    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setLoadingWeather(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${latitude}` +
            `&longitude=${longitude}` +
            `&current=temperature_2m,relative_humidity_2m,wind_speed_10m` +
            `&temperature_unit=celsius` +
            `&wind_speed_unit=kmh` +
            `&timezone=auto`;

          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(
              "Weather service returned an error."
            );
          }

          const data = await response.json();

          setWeather({
            temperature:
              data?.current?.temperature_2m ?? 0,

            humidity:
              data?.current?.relative_humidity_2m ?? 0,

            windSpeed:
              data?.current?.wind_speed_10m ?? 0,

            latitude,
            longitude,

            source: "OPEN-METEO",
          });

          setMessage(
            "Current environmental conditions fetched successfully."
          );
        } catch (err) {
          console.error(
            "Weather fetch failed",
            err
          );

          setError(
            "Unable to fetch current weather conditions."
          );
        } finally {
          setLoadingWeather(false);
        }
      },

      (geoError) => {
        console.error(
          "Location error",
          geoError
        );

        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            setError(
              "Location permission was denied. Please allow location access and try again."
            );
            break;

          case geoError.POSITION_UNAVAILABLE:
            setError(
              "Current location is unavailable. Please try again."
            );
            break;

          case geoError.TIMEOUT:
            setError(
              "Location request timed out. Please try again."
            );
            break;

          default:
            setError(
              "Unable to determine your current location."
            );
        }

        setLoadingWeather(false);
      },

      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  // ---------------------------------------------------------
  // Load historical environment for selected inspection
  // ---------------------------------------------------------
  const loadHistoricalEnvironment = async (
    inspectionId: string
  ) => {
    if (!inspectionId) {
      setHistoricalEnvironment(null);
      return;
    }

    try {
      setLoadingHistoricalEnvironment(true);

      const response = await api.get(
        `/environment/inspection/${inspectionId}`
      );

      const records: EnvironmentRecord[] =
        response.data || [];

      /*
       * An inspection can theoretically have more than
       * one environment record.
       *
       * For the research-prototype display we show
       * the latest saved record.
       */
      if (records.length > 0) {
        const latestRecord =
          records[records.length - 1];

        setHistoricalEnvironment(latestRecord);
      } else {
        setHistoricalEnvironment(null);
      }
    } catch (err: any) {
      console.error(
        "Failed to load historical environment",
        err
      );

      setHistoricalEnvironment(null);

      if (err?.response?.status === 404) {
        return;
      }

      if (err?.response?.status === 401) {
        setError(
          "Your session has expired. Please login again."
        );
      } else if (err?.response?.status === 403) {
        setError(
          "You do not have permission to access environment records."
        );
      }
    } finally {
      setLoadingHistoricalEnvironment(false);
    }
  };

  // ---------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------
  useEffect(() => {
    loadInspections();
    fetchWeather();
  }, []);

  // ---------------------------------------------------------
  // Load historical environment whenever inspection changes
  // ---------------------------------------------------------
  useEffect(() => {
    if (selectedInspectionId) {
      loadHistoricalEnvironment(
        selectedInspectionId
      );
    }
  }, [selectedInspectionId]);

  // ---------------------------------------------------------
  // Refresh everything
  // ---------------------------------------------------------
  const handleRefresh = async () => {
    setMessage("");
    setError("");

    await loadInspections();

    fetchWeather();

    if (selectedInspectionId) {
      await loadHistoricalEnvironment(
        selectedInspectionId
      );
    }
  };

  // ---------------------------------------------------------
  // Selected inspection
  // ---------------------------------------------------------
  const selectedInspection =
    inspections.find(
      (inspection) =>
        String(inspection.id) ===
        selectedInspectionId
    );

  // ---------------------------------------------------------
  // Current live environment status
  //
  // IMPORTANT:
  // This is only a prototype indicator.
  // It is NOT an OIML R-76 universal limit.
  // ---------------------------------------------------------
  const getCurrentEnvironmentStatus = () => {
    if (!weather) {
      return "UNKNOWN";
    }

    const temperatureNormal =
      weather.temperature >= 10 &&
      weather.temperature <= 40;

    const humidityNormal =
      weather.humidity >= 20 &&
      weather.humidity <= 80;

    if (
      temperatureNormal &&
      humidityNormal
    ) {
      return "NORMAL";
    }

    return "OUT_OF_RANGE";
  };

  const currentEnvironmentStatus =
    getCurrentEnvironmentStatus();

  return (
    <div className="space-y-6 p-6 lg:p-8">

      {/* ---------------------------------------------------
          Header
      --------------------------------------------------- */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Environmental Monitoring
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Environment Assessment
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Capture and review environmental conditions
            for inspection context.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={
            loadingInspections ||
            loadingWeather ||
            loadingHistoricalEnvironment
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={18}
            className={
              loadingInspections ||
              loadingWeather ||
              loadingHistoricalEnvironment
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* ---------------------------------------------------
          Information banner
      --------------------------------------------------- */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <CloudSun size={22} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Automatic environmental capture
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              SmartMetrix uses your browser location to
              obtain nearby ambient temperature, humidity
              and wind conditions from the weather service.
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Current weather is shown separately from
              historical inspection-time environmental
              records. Neither is used to modify measurement
              error or OIML MPE.
            </p>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------
          Error
      --------------------------------------------------- */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>
        </div>
      )}

      {/* ---------------------------------------------------
          Success
      --------------------------------------------------- */}
      {message && !error && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0"
          />

          <span>{message}</span>
        </div>
      )}

      {/* ---------------------------------------------------
          Inspection Selection
      --------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <ClipboardCheck size={21} />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Inspection Context
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select the inspection for which the
              environmental conditions are being reviewed.
            </p>
          </div>
        </div>

        {loadingInspections ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Loading inspections...
          </div>
        ) : inspections.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            No inspections are available.
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Inspection
            </label>

            <select
              value={selectedInspectionId}
              onChange={(e) =>
                setSelectedInspectionId(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              {inspections.map((inspection) => (
                <option
                  key={inspection.id}
                  value={inspection.id}
                >
                  Inspection #{inspection.id} —{" "}
                  {inspection.status} —{" "}
                  {inspection.overallResult}
                </option>
              ))}
            </select>

            {selectedInspection && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Inspection
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    #{selectedInspection.id}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Instrument
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    #{selectedInspection.instrumentId}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Status
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedInspection.status}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------
          CURRENT LIVE WEATHER
      --------------------------------------------------- */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <CloudSun
            size={20}
            className="text-blue-600"
          />

          <h2 className="text-lg font-bold text-slate-900">
            Current Live Weather
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

          {/* Temperature */}
          <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Ambient Temperature
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loadingWeather
                    ? "--"
                    : weather
                    ? `${weather.temperature} °C`
                    : "--"}
                </p>
              </div>

              <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                <Thermometer size={24} />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Current nearby ambient weather
            </p>
          </div>

          {/* Humidity */}
          <div className="rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Relative Humidity
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loadingWeather
                    ? "--"
                    : weather
                    ? `${weather.humidity} %`
                    : "--"}
                </p>
              </div>

              <div className="rounded-xl bg-cyan-50 p-3 text-cyan-600">
                <Droplets size={24} />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Current nearby ambient weather
            </p>
          </div>

          {/* Wind */}
          <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Wind Speed
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loadingWeather
                    ? "--"
                    : weather
                    ? `${weather.windSpeed} km/h`
                    : "--"}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Wind size={24} />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Current weather service measurement
            </p>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------
          HISTORICAL INSPECTION ENVIRONMENT
      --------------------------------------------------- */}
      <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <History size={21} />
            </div>

            <div>
              <p className="text-sm font-medium text-indigo-600">
                Historical Inspection Data
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Recorded Environment
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Environmental conditions saved during the
                selected inspection.
              </p>
            </div>
          </div>

          {historicalEnvironment && (
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
              <Activity size={17} />

              {historicalEnvironment.status ||
                "UNKNOWN"}
            </span>
          )}
        </div>

        {loadingHistoricalEnvironment ? (
          <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            Loading recorded inspection environment...
          </div>
        ) : !historicalEnvironment ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <p className="font-semibold text-amber-900">
                  No recorded environment found
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  No historical environmental record is
                  currently stored for Inspection #
                  {selectedInspectionId}.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">

              {/* Historical Temperature */}
              <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Recorded Temperature
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {historicalEnvironment.temperature !==
                      null
                        ? `${historicalEnvironment.temperature} °C`
                        : "--"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
                    <Thermometer size={24} />
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Saved during Inspection #
                  {selectedInspectionId}
                </p>
              </div>

              {/* Historical Humidity */}
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Recorded Humidity
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {historicalEnvironment.humidity !==
                      null
                        ? `${historicalEnvironment.humidity} %`
                        : "--"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-cyan-100 p-3 text-cyan-600">
                    <Droplets size={24} />
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Saved during Inspection #
                  {selectedInspectionId}
                </p>
              </div>

              {/* Historical Vibration */}
              <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Recorded Vibration
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {historicalEnvironment.vibration !==
                      null
                        ? historicalEnvironment.vibration
                        : "--"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                    <Activity size={24} />
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Saved during Inspection #
                  {selectedInspectionId}
                </p>
              </div>
            </div>

            {/* Historical metadata */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Record ID
                </p>

                <p className="mt-1 font-semibold text-slate-800">
                  #{historicalEnvironment.id}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Data Source
                </p>

                <p className="mt-1 font-semibold text-slate-800">
                  {historicalEnvironment.source ||
                    "UNKNOWN"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Environmental Status
                </p>

                <p className="mt-1 font-semibold text-slate-800">
                  {historicalEnvironment.status ||
                    "UNKNOWN"}
                </p>
              </div>
            </div>

            {/* Important distinction */}
            <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
              <div className="flex items-start gap-3">
                <History
                  size={20}
                  className="mt-0.5 shrink-0 text-indigo-600"
                />

                <div>
                  <h3 className="font-semibold text-indigo-900">
                    Historical record
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-indigo-800">
                    These values belong to the selected
                    inspection and represent the
                    environmental data stored for that
                    inspection. They are separate from the
                    current live weather shown above.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---------------------------------------------------
          Current Environment Assessment
      --------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Current Environmental Assessment
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Live Weather Status
            </h2>
          </div>

          <div>
            {currentEnvironmentStatus ===
            "NORMAL" ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                <CheckCircle2 size={17} />
                NORMAL
              </span>
            ) : currentEnvironmentStatus ===
              "OUT_OF_RANGE" ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
                <AlertCircle size={17} />
                OUT OF RANGE
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                <AlertCircle size={17} />
                UNKNOWN
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-5">
          <p className="text-sm leading-6 text-slate-600">
            The live environmental status shown here is a
            <strong>
              {" "}
              SmartMetrix research-prototype indicator
            </strong>
            . It is not a universal OIML R-76 temperature
            or humidity limit.
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Historical inspection environment is stored
            separately and should be used when analysing
            the conditions associated with a completed
            inspection.
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------
          Location
      --------------------------------------------------- */}
      {weather && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <MapPin size={21} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Current Location Context
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Approximate coordinates used to retrieve
                current nearby weather conditions.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Latitude
              </p>

              <p className="mt-1 font-semibold text-slate-800">
                {weather.latitude.toFixed(5)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Longitude
              </p>

              <p className="mt-1 font-semibold text-slate-800">
                {weather.longitude.toFixed(5)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Data Source
              </p>

              <p className="mt-1 font-semibold text-slate-800">
                {weather.source}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------
          Vibration note
      --------------------------------------------------- */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0 text-amber-600"
          />

          <div>
            <h3 className="font-semibold text-amber-900">
              Vibration monitoring
            </h3>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Vibration cannot be measured by the laptop or
              Open-Meteo weather service. SmartMetrix therefore
              does not invent a vibration value. Future hardware
              integration can provide actual vibration sensor
              readings.
            </p>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------
          Research Note
      --------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Research Note
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          In the current ₹0 laptop-only prototype, weather
          conditions are used as contextual environmental data.
          Historical inspection records are kept separate from
          current weather so future analytics can study whether
          environmental variation is associated with measurement
          drift or inspection risk.
        </p>
      </div>
    </div>
  );
}

export default Environment;