
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";

import api from "../services/api";

interface Inspection {
  id: number;
  instrumentId: number;
  inspectorId: number;
  status: string;
  overallResult: string;
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


function Approvals() {
  const navigate = useNavigate();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedInspection, setSelectedInspection] =
    useState<Inspection | null>(null);

  const [remarks, setRemarks] = useState("");

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const role = user?.role?.toUpperCase();

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [inspectionResponse, instrumentResponse] =
        await Promise.all([
          api.get("/inspections"),
          api.get("/instruments"),
        ]);

      setInspections(inspectionResponse.data || []);
      setInstruments(instrumentResponse.data || []);
    } catch (err: any) {
      console.error("Approval data loading failed", err);

      if (err?.response?.status === 401) {
        setError("Your session has expired. Please login again.");
      } else if (err?.response?.status === 403) {
        setError("You do not have permission to access approvals.");
      } else {
        setError(
          err?.response?.data?.message ||
            "Unable to load approval data."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getInstrument = (instrumentId: number) => {
    return instruments.find(
      (instrument) => instrument.id === instrumentId
    );
  };

  const getStatusClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SUBMITTED":
        return "bg-amber-50 text-amber-700 border-amber-200";

      case "APPROVED":
        return "bg-blue-50 text-blue-700 border-blue-200";

      case "CONTROLLER_APPROVED":
        return "bg-green-50 text-green-700 border-green-200";

      case "COMPLETED":
        return "bg-purple-50 text-purple-700 border-purple-200";

      case "IN_PROGRESS":
        return "bg-slate-100 text-slate-600 border-slate-200";

      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getResultClass = (result: string) => {
    switch (result?.toUpperCase()) {
      case "PASS":
        return "bg-green-50 text-green-700";

      case "FAIL":
        return "bg-red-50 text-red-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  /*
   * Approval rules:
   *
   * Senior Officer:
   * SUBMITTED + PASS -> Senior Approval
   *
   * Controller:
   * APPROVED + PASS -> Final Controller Approval
   *
   * FAIL / PENDING / IN_PROGRESS:
   * Not eligible for approval
   */

  const seniorPending = inspections.filter(
    (inspection) =>
      inspection.status?.toUpperCase() === "SUBMITTED" &&
      inspection.overallResult?.toUpperCase() === "PASS"
  );

  const controllerPending = inspections.filter(
    (inspection) =>
      inspection.status?.toUpperCase() === "APPROVED" &&
      inspection.overallResult?.toUpperCase() === "PASS"
  );

  const completed = inspections.filter(
    (inspection) =>
      inspection.status?.toUpperCase() ===
      "CONTROLLER_APPROVED"
  );

  /*
   * Controller Approval Queue
   *
   * Controller should see only inspections that are actually
   * eligible for final approval:
   *
   * APPROVED + PASS
   *
   * This prevents historical records such as:
   * CONTROLLER_APPROVED + FAIL
   * from appearing in the Controller Approval Queue.
   */
  const displayedInspections =
    role === "SENIOR_OFFICER"
      ? seniorPending
      : role === "CONTROLLER"
      ? controllerPending
      : [];

  const approveAsSenior = async (inspection: Inspection) => {
    try {
      setProcessingId(inspection.id);
      setError("");
      setMessage("");

      await api.post(
        `/inspections/${inspection.id}/approve`
      );

      setMessage(
        `Inspection #${inspection.id} approved by Senior Officer. It is now pending Controller approval.`
      );

      setSelectedInspection(null);
      setRemarks("");

      await loadData();
    } catch (err: any) {
      console.error("Senior approval failed", err);

      setError(
        err?.response?.data?.message ||
          "Unable to approve inspection."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const approveAsController = async (
    inspection: Inspection
  ) => {
    try {
      setProcessingId(inspection.id);
      setError("");
      setMessage("");

      await api.post(
        `/inspections/${inspection.id}/controller-approve`
      );

      setMessage(
        `Inspection #${inspection.id} received final Controller approval. Opening Certificate Verification...`
      );

      setSelectedInspection(null);
      setRemarks("");

      await loadData();

      navigate("/certificates", {
        state: {
          inspectionId: inspection.id,
        },
      });
    } catch (err: any) {
      console.error("Controller approval failed", err);

      setError(
        err?.response?.data?.message ||
          "Unable to complete final approval."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproval = async () => {
    if (!selectedInspection) {
      return;
    }

    if (role === "SENIOR_OFFICER") {
      await approveAsSenior(selectedInspection);
      return;
    }

    if (role === "CONTROLLER") {
      await approveAsController(selectedInspection);
      return;
    }

    setError(
      "Your current role does not have approval permission."
    );
  };

  const pendingCount =
    role === "SENIOR_OFFICER"
      ? seniorPending.length
      : role === "CONTROLLER"
      ? controllerPending.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Workflow Governance
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Approvals
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Review and approve completed NAWI inspections.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={18}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Role Banner */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ShieldCheck size={22} />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Current Role
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {role || "UNKNOWN"}
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {role === "SENIOR_OFFICER"
                ? "Review submitted PASS inspections and provide senior approval."
                : role === "CONTROLLER"
                ? "Provide final controller approval for senior-approved PASS inspections."
                : "Your current role does not perform inspection approvals."}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 size={19} />
          {message}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle size={19} />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Awaiting My Approval
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-600">
                {pendingCount}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <Clock3 size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Senior Pending
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-600">
                {seniorPending.length}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <UserCheck size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Controller Pending
              </p>

              <p className="mt-2 text-3xl font-bold text-purple-600">
                {controllerPending.length}
              </p>
            </div>

            <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
              <ShieldCheck size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Fully Approved
              </p>

              <p className="mt-2 text-3xl font-bold text-green-600">
                {completed.length}
              </p>
            </div>

            <div className="rounded-xl bg-green-50 p-3 text-green-600">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Approval Queue */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ClipboardCheck size={21} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Approval Queue
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {role === "SENIOR_OFFICER"
                  ? "PASS inspections submitted and awaiting Senior Officer approval."
                  : role === "CONTROLLER"
                  ? "Senior-approved PASS inspections awaiting final Controller approval."
                  : "Only approval-eligible inspections are shown for the current role."}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              size={30}
              className="animate-spin text-blue-600"
            />
          </div>
        ) : displayedInspections.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ClipboardCheck
              size={42}
              className="mx-auto text-slate-300"
            />

            <p className="mt-4 font-semibold text-slate-700">
              No inspections found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              There are currently no inspection records available in this queue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Inspection
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Instrument
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Inspector
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Result
                  </th>

                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {displayedInspections.map((inspection) => {
                  const instrument = getInstrument(
                    inspection.instrumentId
                  );

                  const status =
                    inspection.status?.toUpperCase();

                  const result =
                    inspection.overallResult?.toUpperCase();

                  const canApproveSenior =
                    role === "SENIOR_OFFICER" &&
                    status === "SUBMITTED" &&
                    result === "PASS";

                  const canApproveController =
                    role === "CONTROLLER" &&
                    status === "APPROVED" &&
                    result === "PASS";

                  const canApprove =
                    canApproveSenior ||
                    canApproveController;

                  const isFullyApproved =
                    status === "CONTROLLER_APPROVED";

                  return (
                    <tr
                      key={inspection.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <ClipboardCheck size={17} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              #{inspection.id}
                            </p>

                            <p className="text-xs text-slate-500">
                              Inspection
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        {instrument ? (
                          <>
                            <p className="font-medium text-slate-800">
                              {instrument.model}
                            </p>

                            <p className="text-xs text-slate-500">
                              S/N: {instrument.serialNumber}
                            </p>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Instrument #{inspection.instrumentId}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {inspection.inspectorId
                          ? `Inspector #${inspection.inspectorId}`
                          : "Inspector not assigned"}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusClass(
                            inspection.status
                          )}`}
                        >
                          {status === "CONTROLLER_APPROVED" ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <Clock3 size={13} />
                          )}

                          {inspection.status}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${getResultClass(
                            inspection.overallResult
                          )}`}
                        >
                          {result === "PASS" ? (
                            <CheckCircle2 size={13} />
                          ) : result === "FAIL" ? (
                            <XCircle size={13} />
                          ) : (
                            <Clock3 size={13} />
                          )}

                          {inspection.overallResult}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        {canApprove ? (
                          <button
                            onClick={() =>
                              setSelectedInspection(
                                inspection
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
                          >
                            <ShieldCheck size={16} />

                            {role === "SENIOR_OFFICER"
                              ? "Senior Approve"
                              : "Final Approve"}
                          </button>
                        ) : isFullyApproved ? (
                          <span className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-xs font-bold text-green-700">
                            <CheckCircle2 size={16} />
                            Fully Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-400">
                            <Clock3 size={14} />
                            Not eligible for approval
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {selectedInspection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Approval Confirmation
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Inspection #{selectedInspection.id}
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setSelectedInspection(null)
                  }
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 text-green-600"
                  />

                  <div>
                    <p className="font-semibold text-green-800">
                      Inspection result: PASS
                    </p>

                    <p className="mt-1 text-sm text-green-700">
                      This inspection satisfies the current
                      OIML-oriented workflow conditions for
                      approval.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Current Status
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedInspection.status}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Inspector
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    #{selectedInspection.inspectorId}
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Remarks
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    optional
                  </span>
                </label>

                <textarea
                  value={remarks}
                  onChange={(e) =>
                    setRemarks(e.target.value)
                  }
                  rows={4}
                  placeholder="Add approval remarks..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() =>
                    setSelectedInspection(null)
                  }
                  disabled={processingId !== null}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleApproval}
                  disabled={processingId !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processingId === selectedInspection.id ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={17} />

                      {role === "SENIOR_OFFICER"
                        ? "Confirm Senior Approval"
                        : "Confirm Final Approval"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Approvals;

