import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  FileCheck2,
  FileText,
  Gauge,
  LogOut,
  Menu,
  MapPin,
  QrCode,
  RefreshCw,
  Scale,
  Settings,
  ShieldCheck,
  TestTube2,
  TrendingUp,
  X,
  AlertCircle,
  Zap,
} from "lucide-react";

import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import api from "./services/api";

import Instruments from "./pages/Instruments";
import Inspections from "./pages/Inspections";
import Tests from "./pages/Tests";
import Approvals from "./pages/Approvals";
import Certificates from "./pages/Certificates";
import AuditLogs from "./pages/AuditLogs";

import VirtualWeighingMachine from "./pages/VirtualWeighingMachine";
import Environment from "./pages/Environment";
import AnalyticsPage from "./pages/Analytics";
import PredictiveAnalytics from "./pages/PredictiveAnalytics";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import QRScanner from "./pages/QrScanner";

/* =========================================================
   TYPES
========================================================= */

interface Inspection {
  id: number;
  instrumentId: number;
  inspectorId: number;
  status: string;
  overallResult: string;
  completedAt?: string;
  completionTime?: string;
  submittedAt?: string;
  approvedAt?: string;
  controllerApprovedAt?: string;
}

interface TestRecord {
  id: number;
  inspectionId: number;
  testType: string;
  result: string;
  referenceWeight?: number;
  observedWeight?: number;
  error?: number;
  mpe?: number;
  temperature?: number;
  humidity?: number;
  vibration?: number;
  createdAt?: string;
}

interface Instrument {
  id: number;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  instrumentClass?: string;
  capacity?: number;
  status?: string;
}

interface Certificate {
  id?: number;
  inspectionId?: number;
  certificateNumber?: string;
  status?: string;
}

interface DashboardStats {
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  pendingInspections: number;

  totalTests: number;
  passedTests: number;
  failedTests: number;
  pendingTests: number;

  totalInstruments: number;
  activeInstruments: number;
  totalCertificates: number;
  issuedCertificates: number;
}

interface UserData {
  id?: number;
  userId?: number;
  name?: string;
  email?: string;
  role?: string;
}

/* =========================================================
   MENU
========================================================= */

const menuItems = [
  {
    label: "Dashboard",
    path: "/",
    icon: Gauge,
  },
  {
    label: "Instruments",
    path: "/instruments",
    icon: Activity,
  },
  {
    label: "Inspections",
    path: "/inspections",
    icon: ClipboardCheck,
  },
  {
    label: "Tests",
    path: "/tests",
    icon: TestTube2,
  },
  {
    label: "Virtual Scale",
    path: "/virtual-scale",
    icon: Gauge,
  },
  {
    label: "Environment",
    path: "/environment",
    icon: Cloud,
  },
  {
    label: "Approvals",
    path: "/approvals",
    icon: Activity,
  },
  {
    label: "Certificates",
    path: "/certificates",
    icon: FileCheck2,
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Predictive",
    path: "/predictive",
    icon: BrainCircuit,
  },
  {
    label: "Advanced Analytics",
    path: "/advanced-analytics",
    icon: TrendingUp,
  },
  {
    label: "QR Verify",
    path: "/qr-scanner",
    icon: QrCode,
  },
  {
    label: "Audit Logs",
    path: "/audit-logs",
    icon: Activity,
  },
];

/* =========================================================
   ROLE HELPERS
========================================================= */

function normalizeRole(role?: string) {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");
}

function requiresLocation(role?: string) {
  const normalizedRole = normalizeRole(role);

  return (
    normalizedRole === "INSPECTOR" ||
    normalizedRole === "SENIOR_OFFICER" ||
    normalizedRole === "CONTROLLER"
  );
}

/* =========================================================
   SAFE USER READER
========================================================= */

function getStoredUser(): UserData {
  try {
    const storedUser =
      localStorage.getItem("user");

    if (
      !storedUser ||
      storedUser === "undefined" ||
      storedUser === "null"
    ) {
      return {};
    }

    const parsedUser =
      JSON.parse(storedUser);

    if (
      !parsedUser ||
      typeof parsedUser !== "object"
    ) {
      return {};
    }

    return parsedUser;
  } catch (error) {
    console.error(
      "Invalid stored user:",
      error
    );

    localStorage.removeItem("user");

    return {};
  }
}

/* =========================================================
   LOCATION CHECK
========================================================= */

function requestBrowserLocation(): Promise<GeolocationPosition> {
  return new Promise(
    (resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error(
            "Geolocation is not supported by this browser."
          )
        );

        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    }
  );
}

/* =========================================================
   LOCATION ERROR
========================================================= */

function getLocationErrorMessage(
  error: GeolocationPositionError | Error
) {
  if (
    "code" in error &&
    error.code === 1
  ) {
    return (
      "Location permission is required to continue. " +
      "Please allow location access in your browser and try again."
    );
  }

  if (
    "code" in error &&
    error.code === 2
  ) {
    return (
      "Your current location is unavailable. " +
      "Please check your device location settings and try again."
    );
  }

  if (
    "code" in error &&
    error.code === 3
  ) {
    return (
      "Location request timed out. Please try again."
    );
  }

  return (
    error?.message ||
    "Unable to determine your current location."
  );
}

/* =========================================================
   LOCATION REQUIRED
========================================================= */

function LocationRequired() {
  const navigate = useNavigate();

  const [checking, setChecking] =
    useState(false);

  const [error, setError] =
    useState("");

  const user = getStoredUser();

  const checkLocationPermission =
    async () => {
      setChecking(true);
      setError("");

      try {
        const position =
          await requestBrowserLocation();

        console.log(
          "Location permission granted:",
          position.coords.latitude,
          position.coords.longitude
        );

        localStorage.setItem(
          "locationPermission",
          "granted"
        );

        setChecking(false);

        navigate("/", {
          replace: true,
        });
      } catch (error) {
        console.error(
          "Location permission error:",
          error
        );

        localStorage.removeItem(
          "locationPermission"
        );

        setError(
          getLocationErrorMessage(
            error as GeolocationPositionError
          )
        );

        setChecking(false);
      }
    };

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(
      "locationPermission"
    );

    navigate("/login", {
      replace: true,
    });

    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-lg">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Smart
            <span className="text-blue-400">
              Metrix
            </span>
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            NAWI Inspection & Compliance Platform
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
            <MapPin size={30} />
          </div>

          <h2 className="mt-6 text-center text-2xl font-bold text-white">
            Location Access Required
          </h2>

          <p className="mt-3 text-center text-sm leading-6 text-slate-400">
            SmartMetrix uses your browser location
            to retrieve nearby environmental
            conditions such as temperature and
            humidity.
          </p>

          {user.role && (
            <div className="mt-4 text-center text-xs uppercase tracking-wide text-slate-500">
              Role: {user.role}
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-blue-900 bg-blue-950/30 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-blue-400"
              />

              <p className="text-sm leading-6 text-blue-200">
                Location is required before entering
                the SmartMetrix application.
                Environmental monitoring uses this
                location only as contextual weather
                information.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={
              checkLocationPermission
            }
            disabled={checking}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MapPin size={18} />

            {checking
              ? "Checking Location..."
              : "Allow Location & Continue"}
          </button>

          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            Logout
          </button>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            If permission was previously denied,
            use your browser's site settings to
            allow location access, then click
            Allow Location & Continue again.
          </p>

        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PROTECTED LAYOUT
========================================================= */

function ProtectedLayout() {
  const navigate = useNavigate();

  const location = useLocation();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const token =
    localStorage.getItem("token");

  const user = getStoredUser();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(
      "locationPermission"
    );

    navigate("/login", {
      replace: true,
    });

    window.location.reload();
  };

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const locationPermission =
    localStorage.getItem(
      "locationPermission"
    );

  if (
    requiresLocation(user.role) &&
    locationPermission !== "granted"
  ) {
    return <LocationRequired />;
  }

  const displayName =
    user.name ||
    user.email ||
    "User";

  const displayRole =
    user.role ||
    "USER";

  return (
    <div className="min-h-screen bg-slate-100">

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-slate-950 text-white transition-transform duration-300 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        } lg:translate-x-0`}
      >

        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">

          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Smart
              <span className="text-blue-400">
                Metrix
              </span>
            </h1>

            <p className="text-[10px] uppercase tracking-widest text-slate-500">
              NAWI Inspection System
            </p>
          </div>

          <button
            type="button"
            className="lg:hidden"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            <X size={21} />
          </button>

        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`
                }
              >
                <Icon size={19} />
                {item.label}
              </NavLink>
            );
          })}

        </nav>

        <div className="border-t border-slate-800 p-4">

          <div className="mb-3 rounded-xl bg-slate-900 p-3">

            <p className="truncate text-sm font-semibold text-white">
              {displayName}
            </p>

            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
              {displayRole}
            </p>

          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={18} />
            Logout
          </button>

        </div>

      </aside>

           {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="lg:ml-64">

        {/* ===================================================
            TOP HEADER
        =================================================== */}

        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">

          {/* LEFT — PLATFORM */}

          <div className="flex items-center gap-3">

            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              onClick={() =>
                setMobileOpen(true)
              }
            >
              <Menu size={22} />
            </button>

            <div className="hidden items-center gap-3 lg:flex">

              {/* Measurement icon */}

              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                <Scale size={19} />
              </div>

              {/* Platform title */}

              <div>

                <p className="text-sm font-semibold tracking-tight text-slate-800">
                  Measurement & Compliance Platform
                </p>

                <div className="mt-1 flex items-center gap-1.5">

                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>

                  <span className="text-[11px] font-medium text-emerald-600">
                    System Live
                  </span>

                </div>

              </div>

            </div>

          </div>


          {/* =================================================
              CENTER — MEASUREMENT → COMPLIANCE
          ================================================= */}

          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center md:flex">

            {/* Connector */}

            <div className="h-px w-10 bg-slate-200" />

            {/* Measurement */}

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
              <Scale size={16} />
            </div>

            {/* Connector */}

            <div className="h-px w-10 bg-slate-200" />

            {/* Compliance */}

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
              <ShieldCheck size={16} />
            </div>

            {/* Connector */}

            <div className="h-px w-10 bg-slate-200" />

          </div>


          {/* =================================================
              RIGHT — LOGGED IN USER
          ================================================= */}

          <div className="flex items-center gap-3">

            <div className="hidden text-right sm:block">

              {/* Live user status */}

              <div className="flex items-center justify-end gap-1.5">

                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <p className="text-sm font-semibold text-slate-800">
                  {displayName}
                </p>

              </div>

              {/* Role */}

              <div className="mt-1 flex items-center justify-end gap-1.5">

                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  {displayRole}
                </span>

              </div>

            </div>


            {/* Avatar */}

            <div className="relative">

              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-100 font-bold text-blue-700 shadow-sm ring-1 ring-blue-100">

                {displayName
                  .charAt(0)
                  .toUpperCase()}

              </div>

              {/* Active indicator */}

              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />

            </div>

          </div>

        </header>


        {/* ===================================================
            PAGE CONTENT
        =================================================== */}

        <main className="page-enter p-4 md:p-8">

          <Routes>

            {/* Dashboard */}

            <Route
              path="/"
              element={<Dashboard />}
            />


            {/* Instruments */}

            <Route
              path="/instruments"
              element={<Instruments />}
            />


            {/* Inspections */}

            <Route
              path="/inspections"
              element={<Inspections />}
            />


            {/* Tests */}

            <Route
              path="/tests"
              element={<Tests />}
            />


            {/* Virtual Scale */}

            <Route
              path="/virtual-scale"
              element={
                <VirtualWeighingMachine />
              }
            />


            {/* Environment */}

            <Route
              path="/environment"
              element={<Environment />}
            />


            {/* Approvals */}

            <Route
              path="/approvals"
              element={<Approvals />}
            />


            {/* Certificates */}

            <Route
              path="/certificates"
              element={<Certificates />}
            />


            {/* Analytics */}

            <Route
              path="/analytics"
              element={<AnalyticsPage />}
            />


            {/* Predictive Analytics */}

            <Route
              path="/predictive"
              element={
                <PredictiveAnalytics />
              }
            />


            {/* Advanced Analytics */}

            <Route
              path="/advanced-analytics"
              element={
                <AdvancedAnalytics />
              }
            />


            {/* QR Scanner */}

            <Route
              path="/qr-scanner"
              element={<QRScanner />}
            />


            {/* Audit Logs */}

            <Route
              path="/audit-logs"
              element={<AuditLogs />}
            />


            {/* Fallback */}

            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          </Routes>

        </main>

      </div>

    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] =
    useState<DashboardStats>({
      totalInspections: 0,
      passedInspections: 0,
      failedInspections: 0,
      pendingInspections: 0,

      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      pendingTests: 0,

      totalInstruments: 0,
      activeInstruments: 0,
      totalCertificates: 0,
      issuedCertificates: 0,
    });

  const [inspections, setInspections] =
    useState<Inspection[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadDashboard =
    async (
      isRefresh = false
    ) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [
          inspectionResponse,
          testResponse,
          instrumentResponse,
          certificateResponse,
        ] = await Promise.all([
          api.get("/inspections"),
          api.get("/test-records"),
          api.get("/instruments"),
          api.get("/certificates"),
        ]);

        const inspectionData: Inspection[] =
          Array.isArray(
            inspectionResponse.data
          )
            ? inspectionResponse.data
            : [];

        const testData: TestRecord[] =
          Array.isArray(
            testResponse.data
          )
            ? testResponse.data
            : [];

        const instrumentData: Instrument[] =
          Array.isArray(
            instrumentResponse.data
          )
            ? instrumentResponse.data
            : [];

        const certificateData: Certificate[] =
          Array.isArray(
            certificateResponse.data
          )
            ? certificateResponse.data
            : [];

        setInspections(
          [...inspectionData]
            .sort(
              (a, b) =>
                Number(b.id) -
                Number(a.id)
            )
        );

        const passedInspections =
          inspectionData.filter(
            (item) =>
              String(
                item.overallResult || ""
              ).toUpperCase() ===
              "PASS"
          ).length;

        const failedInspections =
          inspectionData.filter(
            (item) =>
              String(
                item.overallResult || ""
              ).toUpperCase() ===
              "FAIL"
          ).length;

        const pendingInspections =
          inspectionData.filter(
            (item) => {
              const result =
                String(
                  item.overallResult || ""
                ).toUpperCase();

              return (
                result !== "PASS" &&
                result !== "FAIL"
              );
            }
          ).length;

        const passedTests =
          testData.filter(
            (item) =>
              String(
                item.result || ""
              ).toUpperCase() ===
              "PASS"
          ).length;

        const failedTests =
          testData.filter(
            (item) =>
              String(
                item.result || ""
              ).toUpperCase() ===
              "FAIL"
          ).length;

        const pendingTests =
          testData.filter(
            (item) => {
              const result =
                String(
                  item.result || ""
                ).toUpperCase();

              return (
                result !== "PASS" &&
                result !== "FAIL"
              );
            }
          ).length;

        const activeInstruments =
          instrumentData.filter(
            (item) =>
              String(
                item.status || ""
              ).toUpperCase() ===
              "ACTIVE"
          ).length;

        const issuedCertificates =
          certificateData.filter(
            (item) =>
              String(
                item.status || ""
              ).toUpperCase() ===
              "ISSUED"
          ).length;

        setStats({
          totalInspections:
            inspectionData.length,

          passedInspections,

          failedInspections,

          pendingInspections,

          totalTests:
            testData.length,

          passedTests,

          failedTests,

          pendingTests,

          totalInstruments:
            instrumentData.length,

          activeInstruments,

          totalCertificates:
            certificateData.length,

          issuedCertificates,
        });

      } catch (error) {
        console.error(
          "Dashboard loading failed:",
          error
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  useEffect(() => {
    loadDashboard();
  }, []);

  const passRate =
    stats.totalInspections > 0
      ? Math.round(
          (stats.passedInspections /
            stats.totalInspections) *
            100
        )
      : 0;

  const testPassRate =
    stats.totalTests > 0
      ? Math.round(
          (stats.passedTests /
            stats.totalTests) *
            100
        )
      : 0;

  const inspectionFailRate =
    stats.totalInspections > 0
      ? Math.round(
          (stats.failedInspections /
            stats.totalInspections) *
            100
        )
      : 0;

  const workflowCounts = {
    inProgress:
      inspections.filter(
        (item) =>
          String(
            item.status || ""
          ).toUpperCase() ===
          "IN_PROGRESS"
      ).length,

    submitted:
      inspections.filter(
        (item) =>
          String(
            item.status || ""
          ).toUpperCase() ===
          "SUBMITTED"
      ).length,

    seniorApproved:
      inspections.filter(
        (item) =>
          String(
            item.status || ""
          ).toUpperCase() ===
          "APPROVED"
      ).length,

    controllerApproved:
      inspections.filter(
        (item) =>
          String(
            item.status || ""
          ).toUpperCase() ===
          "CONTROLLER_APPROVED"
      ).length,
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm text-slate-500">
            Loading SmartMetrix dashboard...
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">

        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">

          <div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300">

              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

              Compliance Control Center

            </div>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              SmartMetrix Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
              Monitor NAWI inspections,
              measurement testing,
              OIML-oriented compliance
              and digital certification
              from one centralized workspace.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">

              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-white/5 px-3 py-2 text-xs text-slate-300">
                <ShieldCheck
                  size={15}
                  className="text-emerald-400"
                />
                OIML-oriented workflow
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-white/5 px-3 py-2 text-xs text-slate-300">
                <Activity
                  size={15}
                  className="text-blue-400"
                />
                Live backend data
              </div>

            </div>

          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">

            <button
              type="button"
              onClick={() =>
                navigate("/inspections")
              }
              className="group flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500"
            >
              <ClipboardCheck size={18} />
              Start Inspection
              <ArrowRight
                size={17}
                className="transition group-hover:translate-x-1"
              />
            </button>

            <button
              type="button"
              onClick={() =>
                loadDashboard(true)
              }
              disabled={refreshing}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-white/5 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh Data"}
            </button>

          </div>

        </div>

      </section>

      {/* =====================================================
          KPI CARDS
      ===================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <DashboardCard
          title="Total Inspections"
          value={stats.totalInspections}
          subtitle="All recorded inspections"
          icon={ClipboardCheck}
          iconBg="bg-blue-50"
          iconText="text-blue-600"
          onClick={() =>
            navigate("/inspections")
          }
        />

        <DashboardCard
          title="Passed"
          value={stats.passedInspections}
          subtitle={`${passRate}% inspection pass rate`}
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconText="text-emerald-600"
          onClick={() =>
            navigate("/inspections")
          }
        />

        <DashboardCard
          title="Failed"
          value={stats.failedInspections}
          subtitle={`${inspectionFailRate}% of inspections`}
          icon={X}
          iconBg="bg-red-50"
          iconText="text-red-600"
          onClick={() =>
            navigate("/inspections")
          }
        />

        <DashboardCard
          title="Pending"
          value={stats.pendingInspections}
          subtitle="Awaiting completion"
          icon={FileText}
          iconBg="bg-amber-50"
          iconText="text-amber-600"
          onClick={() =>
            navigate("/inspections")
          }
        />

      </section>

      {/* =====================================================
          SECONDARY SNAPSHOT
      ===================================================== */}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <SnapshotCard
          icon={Activity}
          title="Registered Instruments"
          value={stats.totalInstruments}
          subtitle={`${stats.activeInstruments} active`}
          onClick={() =>
            navigate("/instruments")
          }
        />

        <SnapshotCard
          icon={TestTube2}
          title="WP Records"
          value={stats.totalTests}
          subtitle="Weighing Performance records"
          onClick={() =>
            navigate("/tests")
          }
        />

        <SnapshotCard
          icon={FileCheck2}
          title="Certificates"
          value={stats.totalCertificates}
          subtitle={`${stats.issuedCertificates} issued`}
          onClick={() =>
            navigate("/certificates")
          }
        />

      </section>

      {/* =====================================================
          MAIN ANALYTICS AREA
      ===================================================== */}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">

               {/* ===================================================
            INSPECTION HEALTH
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">

          {/* Header */}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <BarChart3 size={21} />
              </div>

              <div>

                <h2 className="font-semibold text-slate-900">
                  Inspection Health
                </h2>

                <p className="text-sm text-slate-500">
                  Current inspection result distribution
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/analytics")
              }
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Analytics
              <ArrowRight size={15} />
            </button>

          </div>


          {/* Result Distribution */}

          <div className="mt-7">

            <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">

              {stats.totalInspections > 0 && (
                <>

                  <div
                    className="bg-emerald-500 transition-all"
                    style={{
                      width: `${
                        (stats.passedInspections /
                          stats.totalInspections) *
                        100
                      }%`,
                    }}
                  />

                  <div
                    className="bg-red-500 transition-all"
                    style={{
                      width: `${
                        (stats.failedInspections /
                          stats.totalInspections) *
                        100
                      }%`,
                    }}
                  />

                  <div
                    className="bg-amber-400 transition-all"
                    style={{
                      width: `${
                        (stats.pendingInspections /
                          stats.totalInspections) *
                        100
                      }%`,
                    }}
                  />

                </>
              )}

            </div>

          </div>


          {/* Main Result Cards */}

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">

            <ResultBreakdown
              label="Passed"
              value={stats.passedInspections}
              percentage={
                stats.totalInspections > 0
                  ? Math.round(
                      (stats.passedInspections /
                        stats.totalInspections) *
                        100
                    )
                  : 0
              }
              dotClass="bg-emerald-500"
              bgClass="bg-emerald-50"
              textClass="text-emerald-700"
            />

            <ResultBreakdown
              label="Failed"
              value={stats.failedInspections}
              percentage={
                stats.totalInspections > 0
                  ? Math.round(
                      (stats.failedInspections /
                        stats.totalInspections) *
                        100
                    )
                  : 0
              }
              dotClass="bg-red-500"
              bgClass="bg-red-50"
              textClass="text-red-700"
            />

            <ResultBreakdown
              label="Pending"
              value={stats.pendingInspections}
              percentage={
                stats.totalInspections > 0
                  ? Math.round(
                      (stats.pendingInspections /
                        stats.totalInspections) *
                        100
                    )
                  : 0
              }
              dotClass="bg-amber-500"
              bgClass="bg-amber-50"
              textClass="text-amber-700"
            />

          </div>


          {/* Inspection Details */}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">

            {/* Total */}

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

              <div className="flex items-center gap-2">

                <div className="rounded-lg bg-white p-2 text-slate-600 shadow-sm">
                  <ClipboardCheck size={15} />
                </div>

                <p className="text-xs font-semibold text-slate-600">
                  Total
                </p>

              </div>

              <p className="mt-3 text-2xl font-bold text-slate-900">
                {stats.totalInspections}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                Inspections recorded
              </p>

            </div>


            {/* Pass Rate */}

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">

              <div className="flex items-center gap-2">

                <div className="rounded-lg bg-white p-2 text-emerald-600 shadow-sm">
                  <CheckCircle2 size={15} />
                </div>

                <p className="text-xs font-semibold text-emerald-700">
                  Pass Rate
                </p>

              </div>

              <p className="mt-3 text-2xl font-bold text-emerald-700">
                {stats.totalInspections > 0
                  ? Math.round(
                      (stats.passedInspections /
                        stats.totalInspections) *
                        100
                    )
                  : 0}
                %
              </p>

              <p className="mt-1 text-[11px] text-emerald-600/70">
                Successful inspections
              </p>

            </div>


            {/* Failed Rate */}

            <div className="rounded-xl border border-red-100 bg-red-50 p-4">

              <div className="flex items-center gap-2">

                <div className="rounded-lg bg-white p-2 text-red-600 shadow-sm">
                  <AlertCircle size={15} />
                </div>

                <p className="text-xs font-semibold text-red-700">
                  Attention
                </p>

              </div>

              <p className="mt-3 text-2xl font-bold text-red-700">
                {stats.failedInspections}
              </p>

              <p className="mt-1 text-[11px] text-red-600/70">
                Failed inspections
              </p>

            </div>


            {/* Pending */}

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">

              <div className="flex items-center gap-2">

                <div className="rounded-lg bg-white p-2 text-amber-600 shadow-sm">
                  <Activity size={15} />
                </div>

                <p className="text-xs font-semibold text-amber-700">
                  Pending
                </p>

              </div>

              <p className="mt-3 text-2xl font-bold text-amber-700">
                {stats.pendingInspections}
              </p>

              <p className="mt-1 text-[11px] text-amber-600/70">
                Awaiting action
              </p>

            </div>

          </div>


          {/* Bottom Insight */}

          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs font-semibold text-blue-800">
                Inspection Overview
              </p>

              <p className="mt-1 text-xs text-blue-700/70">
                Track completed, failed and pending inspections
                across the SmartMetrix workflow.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/inspections")
              }
              className="flex shrink-0 items-center justify-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
            >
              View Inspections
              <ArrowRight size={14} />
            </button>

          </div>

        </div>
        {/* ===================================================
            WP OVERVIEW
        =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
              <TestTube2 size={21} />
            </div>

            <div>

              <h2 className="font-semibold text-slate-900">
                Weighing Performance
              </h2>

              <p className="text-sm text-slate-500">
                Current WP record distribution
              </p>

            </div>

          </div>

        <div className="mt-7 flex items-center justify-center">

  <div
    className="relative flex h-40 w-40 items-center justify-center rounded-full"
    style={{
      background: `conic-gradient(
        #22c55e 0deg ${testPassRate * 3.6}deg,
        #ef4444 ${testPassRate * 3.6}deg 360deg
      )`,
    }}
  >

    <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white">

      <p className="text-3xl font-bold text-slate-900">
        {testPassRate}%
      </p>

      <p className="text-xs text-slate-500">
        PASS rate
      </p>

    </div>

  </div>

</div>

          <div className="mt-6 space-y-3">

            <MiniDistribution
              label="PASS"
              value={stats.passedTests}
              total={stats.totalTests}
              className="bg-emerald-50 text-emerald-700"
              barClass="bg-emerald-500"
            />

            <MiniDistribution
              label="FAIL"
              value={stats.failedTests}
              total={stats.totalTests}
              className="bg-red-50 text-red-700"
              barClass="bg-red-500"
            />

            <MiniDistribution
              label="PENDING"
              value={stats.pendingTests}
              total={stats.totalTests}
              className="bg-amber-50 text-amber-700"
              barClass="bg-amber-500"
            />

          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/tests")
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Open Tests
            <ArrowRight size={16} />
          </button>

        </div>

      </section>

      {/* =====================================================
          WORKFLOW
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Settings size={21} />
            </div>

            <div>

              <h2 className="font-semibold text-slate-900">
                Inspection Workflow
              </h2>

              <p className="text-sm text-slate-500">
                Digital inspection lifecycle
              </p>

            </div>

          </div>

          <div className="text-xs font-medium text-slate-400">
            Live status from inspection records
          </div>

        </div>

        <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">

          <WorkflowStep
            number="01"
            title="Instrument"
            subtitle="Registration"
            icon={Activity}
            onClick={() =>
              navigate("/instruments")
            }
          />

          <WorkflowStep
            number="02"
            title="NAWI"
            subtitle="Testing"
            icon={TestTube2}
            onClick={() =>
              navigate("/tests")
            }
          />

          <WorkflowStep
            number="03"
            title="OIML"
            subtitle="Compliance"
            icon={ShieldCheck}
            onClick={() =>
              navigate("/analytics")
            }
          />

          <WorkflowStep
            number="04"
            title="Senior"
            subtitle={`Approval · ${workflowCounts.seniorApproved}`}
            icon={CheckCircle2}
            onClick={() =>
              navigate("/approvals")
            }
          />

          <WorkflowStep
            number="05"
            title="Controller"
            subtitle={`Approval · ${workflowCounts.controllerApproved}`}
            icon={ShieldCheck}
            onClick={() =>
              navigate("/approvals")
            }
          />

          <WorkflowStep
            number="06"
            title="Digital"
            subtitle={`Certificate · ${stats.issuedCertificates}`}
            icon={FileCheck2}
            onClick={() =>
              navigate("/certificates")
            }
          />

        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">

          <WorkflowStatus
            label="In Progress"
            value={
              workflowCounts.inProgress
            }
            className="bg-blue-50 text-blue-700"
          />

          <WorkflowStatus
            label="Submitted"
            value={
              workflowCounts.submitted
            }
            className="bg-amber-50 text-amber-700"
          />

          <WorkflowStatus
            label="Senior Approved"
            value={
              workflowCounts.seniorApproved
            }
            className="bg-purple-50 text-purple-700"
          />

          <WorkflowStatus
            label="Controller Approved"
            value={
              workflowCounts.controllerApproved
            }
            className="bg-emerald-50 text-emerald-700"
          />

        </div>

      </section>

      {/* =====================================================
          RECENT INSPECTIONS
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="font-semibold text-slate-900">
              Recent Inspections
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest inspection records from the backend
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/inspections")
            }
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all
            <ArrowRight size={15} />
          </button>

        </div>

        <div className="divide-y divide-slate-100">

          {inspections
            .slice(0, 5)
            .map((inspection) => {

              const result =
                String(
                  inspection.overallResult ||
                    "PENDING"
                ).toUpperCase();

              return (
                <button
                  key={inspection.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      "/inspections"
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-slate-50"
                >

                  <div className="flex min-w-0 items-center gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                      #{inspection.id}
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-sm font-semibold text-slate-900">
                        Inspection #{inspection.id}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Instrument #
                        {inspection.instrumentId}
                        {" · "}
                        Inspector #
                        {inspection.inspectorId ??
                          "N/A"}
                      </p>

                    </div>

                  </div>

                  <div className="flex shrink-0 items-center gap-3">

                    <StatusBadge
                      value={result}
                    />

                    <ArrowRight
                      size={16}
                      className="hidden text-slate-300 sm:block"
                    />

                  </div>

                </button>
              );
            })}

          {inspections.length === 0 && (
            <div className="p-8 text-center">

              <ClipboardCheck
                size={28}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-medium text-slate-600">
                No inspections recorded yet.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/inspections")
                }
                className="mt-4 text-sm font-semibold text-blue-600"
              >
                Start first inspection
              </button>

            </div>
          )}

        </div>

      </section>

      {/* =====================================================
          QUICK ACTIONS
      ===================================================== */}

      <section>

        <div className="mb-4">

          <h2 className="text-lg font-bold text-slate-900">
            Quick Actions
          </h2>

          <p className="text-sm text-slate-500">
            Frequently used SmartMetrix operations
          </p>

        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <QuickAction
            icon={Activity}
            title="Instruments"
            description="Manage NAWI instruments"
            onClick={() =>
              navigate("/instruments")
            }
          />

          <QuickAction
            icon={TestTube2}
            title="Run Tests"
            description="Record measurement results"
            onClick={() =>
              navigate("/tests")
            }
          />

          <QuickAction
            icon={Gauge}
            title="Virtual Scale"
            description="Simulate weighing readings"
            onClick={() =>
              navigate("/virtual-scale")
            }
          />

          <QuickAction
            icon={QrCode}
            title="Verify Certificate"
            description="Check certificate authenticity"
            onClick={() =>
              navigate("/qr-scanner")
            }
          />

        </div>

      </section>

      {/* =====================================================
          SYSTEM STATUS
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <Zap size={21} />
            </div>

            <div>

              <h2 className="font-semibold text-slate-900">
                SmartMetrix System
              </h2>

              <p className="text-sm text-slate-500">
                Backend-connected dashboard with live inspection data.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">

            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />

            Operational

          </div>

        </div>

      </section>

    </div>
  );
}

/* =========================================================
   DASHBOARD CARD
========================================================= */

interface DashboardCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: any;
  iconBg: string;
  iconText: string;
  onClick?: () => void;
}

function DashboardCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconText,
  onClick,
}: DashboardCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
    >

      <div className="flex items-start justify-between">

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} ${iconText}`}
        >
          <Icon size={21} />
        </div>

        <ArrowRight
          size={16}
          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500"
        />

      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {subtitle}
      </p>

    </button>
  );
}

/* =========================================================
   SNAPSHOT CARD
========================================================= */

function SnapshotCard({
  icon: Icon,
  title,
  value,
  subtitle,
  onClick,
}: {
  icon: any;
  title: string;
  value: number;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >

      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
        <Icon size={22} />
      </div>

      <div className="min-w-0 flex-1">

        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <p className="mt-1 text-2xl font-bold text-slate-900">
          {value}
        </p>

        <p className="text-xs text-slate-400">
          {subtitle}
        </p>

      </div>

      <ArrowRight
        size={17}
        className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"
      />

    </button>
  );
}

/* =========================================================
   RESULT BREAKDOWN
========================================================= */

function ResultBreakdown({
  label,
  value,
  percentage,
  dotClass,
  bgClass,
  textClass,
}: {
  label: string;
  value: number;
  percentage: number;
  dotClass: string;
  bgClass: string;
  textClass: string;
}) {
  return (
    <div className={`rounded-xl p-4 ${bgClass}`}>

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-2">

          <span
            className={`h-2.5 w-2.5 rounded-full ${dotClass}`}
          />

          <span
            className={`text-xs font-semibold ${textClass}`}
          >
            {label}
          </span>

        </div>

        <span
          className={`text-xs font-bold ${textClass}`}
        >
          {percentage}%
        </span>

      </div>

      <p
        className={`mt-2 text-2xl font-bold ${textClass}`}
      >
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   MINI DISTRIBUTION
========================================================= */

function MiniDistribution({
  label,
  value,
  total,
  className,
  barClass,
}: {
  label: string;
  value: number;
  total: number;
  className: string;
  barClass: string;
}) {
  const percentage =
    total > 0
      ? Math.round(
          (value / total) * 100
        )
      : 0;

  return (
    <div
      className={`rounded-xl p-3 ${className}`}
    >

      <div className="flex items-center justify-between">

        <span className="text-xs font-bold">
          {label}
        </span>

        <span className="text-xs font-semibold">
          {value}
        </span>

      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">

        <div
          className={`h-full rounded-full ${barClass}`}
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}

/* =========================================================
   WORKFLOW STEP
========================================================= */

function WorkflowStep({
  number,
  title,
  subtitle,
  icon: Icon,
  onClick,
}: {
  number: string;
  title: string;
  subtitle: string;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40"
    >

      <div className="flex items-start justify-between">

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
          <Icon size={17} />
        </div>

        <span className="text-[10px] font-bold tracking-wider text-slate-300">
          {number}
        </span>

      </div>

      <p className="mt-4 text-sm font-semibold text-slate-800">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {subtitle}
      </p>

      <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100">
        Open
        <ArrowRight size={12} />
      </div>

    </button>
  );
}

/* =========================================================
   WORKFLOW STATUS
========================================================= */

function WorkflowStatus({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
    >

      <p className="text-[11px] font-semibold">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  value,
}: {
  value: string;
}) {
  const normalized =
    value.toUpperCase();

  let className =
    "bg-slate-100 text-slate-600";

  if (normalized === "PASS") {
    className =
      "bg-emerald-50 text-emerald-700";
  }

  if (normalized === "FAIL") {
    className =
      "bg-red-50 text-red-700";
  }

  if (
    normalized === "PENDING" ||
    normalized === "IN_PROGRESS"
  ) {
    className =
      "bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-bold ${className}`}
    >
      {normalized}
    </span>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

interface QuickActionProps {
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
}

function QuickAction({
  icon: Icon,
  title,
  description,
  onClick,
}: QuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >

      <div className="rounded-xl bg-slate-100 p-3 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
        <Icon size={21} />
      </div>

      <div className="min-w-0 flex-1">

        <p className="font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>

      </div>

      <ArrowRight
        size={17}
        className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"
      />

    </button>
  );
}
/* =========================================================
   LOGIN
========================================================= */

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleLogin = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response =
        await api.post(
          "/auth/login",
          {
            email,
            password,
          }
        );

      console.log(
        "LOGIN RESPONSE:",
        response.data
      );

      if (!response.data?.token) {
        throw new Error(
          "Login successful but JWT token was not received."
        );
      }

      localStorage.setItem(
        "token",
        response.data.token
      );

      const userData =
        response.data?.user || {
          id: response.data?.userId,

          userId:
            response.data?.userId,

          name:
            response.data?.name ||
            email,

          email:
            response.data?.email ||
            email,

          role:
            response.data?.role ||
            "USER",
        };

      localStorage.setItem(
        "user",
        JSON.stringify(userData)
      );

      localStorage.removeItem(
        "locationPermission"
      );

      const userRole =
        normalizeRole(
          userData.role
        );

      if (
        !requiresLocation(userRole)
      ) {
        navigate("/", {
          replace: true,
        });

        return;
      }

      try {
        const position =
          await requestBrowserLocation();

        console.log(
          "Login location granted:",
          position.coords.latitude,
          position.coords.longitude
        );

        localStorage.setItem(
          "locationPermission",
          "granted"
        );

        navigate("/", {
          replace: true,
        });

      } catch (locationError) {

        console.error(
          "Location permission failed:",
          locationError
        );

        localStorage.removeItem(
          "locationPermission"
        );

        navigate(
          "/location-required",
          {
            replace: true,
            state: {
              locationError:
                getLocationErrorMessage(
                  locationError as GeolocationPositionError
                ),
            },
          }
        );
      }

    } catch (err: any) {

      console.error(
        "Login failed:",
        err
      );

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      localStorage.removeItem(
        "locationPermission"
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Invalid email or password."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">

      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">

        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <div className="relative hidden overflow-hidden lg:flex">

          {/* Main background */}

          <div className="absolute inset-0 bg-gradient-to-br from-[#071a3d] via-[#08152f] to-[#062c45]" />

          {/* Soft glow */}

          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-3xl" />


          {/* Content */}

          <div className="relative z-10 flex min-h-screen w-full flex-col px-12 py-10 xl:px-16">

            {/* =================================================
                LOGO
            ================================================= */}

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-950/50">

                <span className="text-xl font-black text-white">
                  S
                </span>

              </div>

              <div>

                <h1 className="text-3xl font-bold tracking-tight text-white">

                  Smart
                  <span className="text-cyan-400">
                    Metrix
                  </span>

                </h1>

                <p className="mt-0.5 text-sm text-blue-200/80">
                  Precision · Compliance · Trust
                </p>

              </div>

            </div>


            {/* =================================================
                MAIN HERO
            ================================================= */}

            <div className="my-auto max-w-2xl py-10">

              {/* Platform badge */}

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100">

                <ShieldCheck className="h-4 w-4" />

                NAWI Inspection Platform

              </div>


              {/* Heading */}

              <h2 className="text-5xl font-bold leading-[1.05] tracking-tight text-white xl:text-6xl">

                Smarter
                <br />

                <span className="text-cyan-400">
                  Measurement.
                </span>

              </h2>


              {/* Description */}

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 xl:text-lg">

                Advanced inspection, testing and
                certification for NAWI instruments
                — all in one platform.

              </p>


              {/* =================================================
                  FEATURE CARDS
              ================================================= */}

              <div className="mt-9 grid max-w-xl grid-cols-2 gap-4">

                {/* Card 1 */}

                <div className="min-h-[142px] rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition hover:bg-white/[0.09]">

                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">

                    <ShieldCheck className="h-5 w-5 text-cyan-400" />

                  </div>

                  <p className="text-sm font-semibold text-white">
                    NAWI Inspections
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Structured inspection workflow
                  </p>

                </div>


                {/* Card 2 */}

                <div className="min-h-[142px] rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition hover:bg-white/[0.09]">

                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10">

                    <TestTube2 className="h-5 w-5 text-blue-400" />

                  </div>

                  <p className="text-sm font-semibold text-white">
                    Measurement Testing
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Accurate test records
                  </p>

                </div>


                {/* Card 3 */}

                <div className="min-h-[142px] rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition hover:bg-white/[0.09]">

                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/10">

                    <ShieldCheck className="h-5 w-5 text-indigo-400" />

                  </div>

                  <p className="text-sm font-semibold text-white">
                    OIML Compliance
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Rule-based assessment
                  </p>

                </div>


                {/* Card 4 */}

                <div className="min-h-[142px] rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition hover:bg-white/[0.09]">

                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-400/10">

                    <FileCheck2 className="h-5 w-5 text-purple-400" />

                  </div>

                  <p className="text-sm font-semibold leading-5 text-white">
                    Digital
                    <br />
                    Certification
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Complete traceability
                  </p>

                </div>

              </div>

            </div>


            {/* =================================================
                BOTTOM TAG
            ================================================= */}

            <div className="flex w-full items-center justify-center gap-4">

              <div className="h-px w-14 bg-blue-300/40" />

              <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.28em] text-blue-200/70">
                Accuracy builds trust
              </span>

              <div className="h-px w-14 bg-blue-300/40" />

            </div>

          </div>

        </div>


        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">

          <div className="w-full max-w-[430px]">

            {/* Mobile logo */}

            <div className="mb-8 text-center lg:hidden">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg">

                <span className="text-2xl font-black text-white">
                  S
                </span>

              </div>

              <h1 className="mt-4 text-3xl font-bold text-slate-900">

                Smart
                <span className="text-blue-600">
                  Metrix
                </span>

              </h1>

            </div>


            {/* =================================================
                LOGIN CARD
            ================================================= */}

            <div className="rounded-[30px] border border-slate-200 bg-white px-8 py-9 shadow-[0_25px_70px_-25px_rgba(15,23,42,0.25)] sm:px-10 sm:py-10">

              {/* Logo */}

              <div className="mb-8 flex justify-center">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-md">

                    <span className="text-lg font-black text-white">
                      S
                    </span>

                  </div>

                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">

                    Smart
                    <span className="text-blue-600">
                      Metrix
                    </span>

                  </h1>

                </div>

              </div>


              {/* Heading */}

              <div className="text-center">

                <h2 className="text-[30px] font-bold tracking-tight text-slate-900">
                  Welcome Back
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Sign in to your account
                </p>

              </div>


              {/* Error */}

              {error && (

                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-600">

                  {error}

                </div>

              )}


              {/* =================================================
                  FORM
              ================================================= */}

              <form
                onSubmit={handleLogin}
                className="mt-8"
              >

                {/* Email */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value
                      )
                    }
                    placeholder="Enter your email"
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />

                </div>


                {/* Password */}

                <div className="mt-5">

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    placeholder="Enter your password"
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />

                </div>


                {/* Sign In */}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {loading ? (

                    <div className="flex items-center gap-2">

                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      Signing in...

                    </div>

                  ) : (

                    "Sign In"

                  )}

                </button>

              </form>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
/* =========================================================
   APP ROUTES
========================================================= */

function AppRoutes() {
  const location = useLocation();

  const token =
    localStorage.getItem("token");

  const locationPermission =
    localStorage.getItem(
      "locationPermission"
    );

  const user = getStoredUser();

  console.log(
    "APP ROUTE:",
    location.pathname
  );

  console.log(
    "TOKEN EXISTS:",
    !!token
  );

  console.log(
    "USER ROLE:",
    user.role
  );

  console.log(
    "LOCATION PERMISSION:",
    locationPermission
  );

  return (
    <Routes>

      <Route
        path="/login"
        element={
          token ? (
            requiresLocation(
              user.role
            ) &&
            locationPermission !==
              "granted" ? (
              <Navigate
                to="/location-required"
                replace
              />
            ) : (
              <Navigate
                to="/"
                replace
              />
            )
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="/location-required"
        element={
          token ? (
            requiresLocation(
              user.role
            ) ? (
              <LocationRequired />
            ) : (
              <Navigate
                to="/"
                replace
              />
            )
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      />

      <Route
        path="/*"
        element={
          <ProtectedLayout />
        }
      />

    </Routes>
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;