import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Database,
  CheckCircle2,
  Send,
  ClipboardCheck,
  ShieldAlert,
} from "lucide-react";
import api from "../services/api";

interface AuditLog {
  id: number;
  userId?: number | null;
  action: string;
  entity: string;
  entityId: number;
  oldValue?: string | null;
  newValue?: string | null;
  timestamp?: string | null;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =======================================================
     LOAD AUDIT LOGS
  ======================================================= */

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/audit-logs");

      console.log("AUDIT LOGS:", response.data);

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      setLogs(data);
    } catch (err: any) {
      console.error("Audit logs failed", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load audit logs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  /* =======================================================
     FORMAT DATE
  ======================================================= */

  const formatDate = (
    value?: string | null
  ) => {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }

    return date.toLocaleString();
  };

  /* =======================================================
     USER DISPLAY
  ======================================================= */

  const getUserLabel = (
    userId?: number | null
  ) => {
    if (userId == null) {
      return "System / Unknown";
    }

    return `User #${userId}`;
  };

  /* =======================================================
     ACTION STYLE
  ======================================================= */

  const getActionStyle = (
    action: string
  ) => {
    const normalized = String(
      action ?? ""
    ).toUpperCase();

    if (
      normalized.includes("CREATED")
    ) {
      return {
        container:
          "bg-blue-50 text-blue-700 border-blue-100",
        icon: Activity,
      };
    }

    if (
      normalized.includes("COMPLETED")
    ) {
      return {
        container:
          "bg-purple-50 text-purple-700 border-purple-100",
        icon: CheckCircle2,
      };
    }

    if (
      normalized.includes("SUBMITTED")
    ) {
      return {
        container:
          "bg-amber-50 text-amber-700 border-amber-100",
        icon: Send,
      };
    }

    if (
      normalized.includes("APPROVED")
    ) {
      return {
        container:
          "bg-green-50 text-green-700 border-green-100",
        icon: ShieldCheck,
      };
    }

    if (
      normalized.includes("REJECT")
    ) {
      return {
        container:
          "bg-red-50 text-red-700 border-red-100",
        icon: ShieldAlert,
      };
    }

    return {
      container:
        "bg-slate-50 text-slate-700 border-slate-200",
      icon: Activity,
    };
  };

  /* =======================================================
     FILTERED LOGS
  ======================================================= */

  const filteredLogs = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    if (!searchValue) {
      return logs;
    }

    return logs.filter((log) => {
      const value = [
        log.action,
        log.entity,
        String(log.entityId ?? ""),
        String(log.userId ?? ""),
        log.oldValue ?? "",
        log.newValue ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return value.includes(searchValue);
    });
  }, [logs, search]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const actionTypeCount = useMemo(() => {
    return new Set(
      logs.map((log) =>
        String(log.action ?? "").toUpperCase()
      )
    ).size;
  }, [logs]);

  const latestLog = useMemo(() => {
    if (!logs.length) {
      return null;
    }

    return [...logs].sort((a, b) => {
      const timeA = a.timestamp
        ? new Date(a.timestamp).getTime()
        : 0;

      const timeB = b.timestamp
        ? new Date(b.timestamp).getTime()
        : 0;

      return timeB - timeA;
    })[0];
  }, [logs]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="text-sm font-medium text-slate-500">
            Loading audit logs...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="space-y-6">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Security & Traceability
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Audit Logs
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Track important actions performed
            throughout the inspection workflow.
            Every event provides a traceable record
            of who performed an action and when it
            occurred.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Logs
        </button>

      </div>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">

          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Unable to load audit logs
            </p>

            <p className="mt-1">
              {error}
            </p>
          </div>

        </div>
      )}

      {/* ===================================================
          SECURITY INFO
      =================================================== */}

      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">

        <div className="flex items-start gap-4">

          <div className="rounded-xl bg-white p-3 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Inspection Audit Trail
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Audit events provide traceability across
              inspection creation, completion, submission,
              senior approval and controller approval.
            </p>
          </div>

        </div>

      </div>

      {/* ===================================================
          STATS
      =================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        {/* TOTAL EVENTS */}

        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Events
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {logs.length}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Recorded audit events
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Activity className="h-5 w-5" />
            </div>

          </div>

        </div>

        {/* ACTION TYPES */}

        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm font-medium text-slate-500">
                Action Types
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {actionTypeCount}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Unique workflow actions
              </p>
            </div>

            <div className="rounded-xl bg-green-50 p-3 text-green-600">
              <ShieldCheck className="h-5 w-5" />
            </div>

          </div>

        </div>

        {/* LATEST EVENT */}

        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

          <div className="flex items-start justify-between">

            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">
                Latest Event
              </p>

              <p className="mt-2 truncate text-sm font-bold text-slate-900">
                {latestLog
                  ? latestLog.action
                  : "No events"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {latestLog
                  ? formatDate(
                      latestLog.timestamp
                    )
                  : "-"}
              </p>
            </div>

            <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
              <Clock3 className="h-5 w-5" />
            </div>

          </div>

        </div>

      </div>

      {/* ===================================================
          SEARCH
      =================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="font-semibold text-slate-900">
              Search Audit Trail
            </h2>

            <p className="text-xs text-slate-500">
              Search by action, user, entity, ID or
              recorded values.
            </p>
          </div>

          {search && (
            <span className="text-xs font-medium text-blue-600">
              {filteredLogs.length} matching event(s)
            </span>
          )}

        </div>

        <div className="relative">

          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search action, entity, user ID or entity ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />

        </div>

      </div>

      {/* ===================================================
          ACTIVITY HISTORY
      =================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* TABLE HEADER */}

        <div className="border-b border-slate-200 bg-white px-6 py-5">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Activity History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredLogs.length} event(s)
                displayed
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
              <Database className="h-3.5 w-3.5" />
              Audit Trail
            </div>

          </div>

        </div>

        {/* EMPTY */}

        {filteredLogs.length === 0 ? (
          <div className="px-6 py-20 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Activity
                size={30}
                className="text-slate-400"
              />
            </div>

            <p className="mt-5 font-semibold text-slate-700">
              No audit events found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search criteria.
            </p>

          </div>
        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px]">

              {/* TABLE HEAD */}

              <thead className="border-b border-slate-200 bg-slate-50">

                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                  <th className="px-6 py-4">
                    ID
                  </th>

                  <th className="px-6 py-4">
                    User
                  </th>

                  <th className="px-6 py-4">
                    Action
                  </th>

                  <th className="px-6 py-4">
                    Entity
                  </th>

                  <th className="px-6 py-4">
                    Entity ID
                  </th>

                  <th className="px-6 py-4">
                    Time
                  </th>

                </tr>

              </thead>

              {/* TABLE BODY */}

              <tbody className="divide-y divide-slate-100">

                {filteredLogs.map((log) => {

                  const actionStyle =
                    getActionStyle(
                      log.action
                    );

                  const ActionIcon =
                    actionStyle.icon;

                  const hasMissingUser =
                    log.userId == null;

                  return (
                    <tr
                      key={log.id}
                      className="transition hover:bg-slate-50"
                    >

                      {/* ID */}

                      <td className="px-6 py-5">

                        <span className="font-bold text-slate-700">
                          #{log.id}
                        </span>

                      </td>

                      {/* USER */}

                      <td className="px-6 py-5">

                        <div className="flex items-center gap-2">

                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              hasMissingUser
                                ? "bg-slate-100 text-slate-500"
                                : "bg-indigo-50 text-indigo-600"
                            }`}
                          >
                            <UserRound className="h-4 w-4" />
                          </div>

                          <div>

                            <p
                              className={`text-sm font-semibold ${
                                hasMissingUser
                                  ? "text-slate-500"
                                  : "text-slate-800"
                              }`}
                            >
                              {getUserLabel(
                                log.userId
                              )}
                            </p>

                            <p className="text-xs text-slate-400">
                              {hasMissingUser
                                ? "User ID unavailable"
                                : "Authenticated user"}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* ACTION */}

                      <td className="px-6 py-5">

                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${actionStyle.container}`}
                        >

                          <ActionIcon className="h-3.5 w-3.5" />

                          {log.action}

                        </span>

                      </td>

                      {/* ENTITY */}

                      <td className="px-6 py-5">

                        <span className="font-semibold text-slate-800">
                          {log.entity}
                        </span>

                      </td>

                      {/* ENTITY ID */}

                      <td className="px-6 py-5">

                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                          #{log.entityId}
                        </span>

                      </td>

                      {/* TIME */}

                      <td className="px-6 py-5">

                        <div className="flex items-center gap-2">

                          <Clock3 className="h-4 w-4 text-slate-400" />

                          <span className="text-sm text-slate-500">
                            {formatDate(
                              log.timestamp
                            )}
                          </span>

                        </div>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ===================================================
          TRACEABILITY FOOTER
      =================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">

        <div className="flex items-start gap-3">

          <div className="rounded-lg bg-white p-2 shadow-sm">
            <ClipboardCheck className="h-5 w-5 text-slate-600" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Traceability
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Each audit event is associated with an
              action, entity, entity ID, user and
              timestamp to support inspection workflow
              traceability.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}