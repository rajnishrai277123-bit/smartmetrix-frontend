import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Hash,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import api from "../services/api";

interface VerificationResponse {
  valid?: boolean;
  message?: string;

  integrityVerified?: boolean;
  certificateStatusValid?: boolean;
  inspectionStatusValid?: boolean;
  resultValid?: boolean;

  certificateId?: number;
  certificateNumber?: string;
  certificateStatus?: string;
  storedHash?: string;
  calculatedHash?: string;
  signature?: string | null;

  inspectionId?: number;
  inspectionStatus?: string;
  overallResult?: string;
  inspectorId?: number;

  instrumentId?: number;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  instrumentClass?: string;
  capacity?: number;
  scaleInterval?: number;
  minCapacity?: number;
  instrumentStatus?: string;
}

function StatusBadge({
  valid,
  label,
}: {
  valid: boolean | undefined;
  label: string;
}) {
  if (valid === undefined) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
        <Clock3 size={14} />
        {label}
      </span>
    );
  }

  return valid ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 size={14} />
      {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
      <XCircle size={14} />
      {label}
    </span>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="break-all text-sm font-semibold text-slate-800 sm:text-right">
        {value ?? "—"}
      </span>
    </div>
  );
}

function VerifyCertificate() {
  const { certificateNumber } = useParams<{
    certificateNumber: string;
  }>();

  const [data, setData] =
    useState<VerificationResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const verifyCertificate = async () => {
      if (!certificateNumber) {
        setError("Certificate number is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setData(null);

      try {
        const response =
          await api.get<VerificationResponse>(
            `/verify/${encodeURIComponent(
              certificateNumber
            )}`
          );

        setData(response.data);
      } catch (requestError: any) {
        console.error(
          "Certificate verification failed:",
          requestError
        );

        const backendMessage =
          requestError?.response?.data?.message;

        setError(
          backendMessage ||
            "Unable to verify this certificate. Please check the certificate number and try again."
        );
      } finally {
        setLoading(false);
      }
    };

    verifyCertificate();
  }, [certificateNumber]);

  const isValid = data?.valid === true;
  const verificationChecks = [
    data?.integrityVerified,
    data?.certificateStatusValid,
    data?.inspectionStatusValid,
    data?.resultValid,
  ];
  const verifiedCount = verificationChecks.filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-slate-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Smart
              <span className="text-blue-400">
                Metrix
              </span>
            </h1>

            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
              Certificate Verification
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 sm:flex">
            <ShieldCheck
              size={16}
              className="text-emerald-400"
            />
            Public Verification
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        {/* Loading */}
        {loading && (
          <div className="flex min-h-[55vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Loader2
                  size={30}
                  className="animate-spin"
                />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-800">
                Verifying Certificate
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Checking certificate authenticity and
                integrity...
              </p>
            </div>
          </div>
        )}

        {/* Request error */}
        {!loading && error && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertCircle size={32} />
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                Verification Failed
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {error}
              </p>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Certificate Number
                </p>

                <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-800">
                  {certificateNumber || "Not provided"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Verification result */}
        {!loading && !error && data && (
          <>
            {/* Premium verification hero */}
            <section
              className={`relative overflow-hidden rounded-[2rem] border bg-white shadow-xl ${
                isValid ? "border-emerald-200" : "border-red-200"
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 ${isValid ? "bg-emerald-500" : "bg-red-500"}`} />
              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-100/50 blur-3xl" />
              <div className="relative p-6 md:p-10">
                <div className="flex flex-col items-center text-center">
                  <div className={`relative flex h-24 w-24 items-center justify-center rounded-full border-8 ${isValid ? "border-emerald-100 bg-emerald-500 text-white" : "border-red-100 bg-red-500 text-white"}`}>
                    {isValid ? <ShieldCheck size={46} /> : <XCircle size={46} />}
                    {isValid && <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-white text-emerald-600 shadow"><Check size={16} /></span>}
                  </div>

                  <p className={`mt-5 text-xs font-bold uppercase tracking-[0.3em] ${isValid ? "text-emerald-600" : "text-red-600"}`}>
                    Digital Certificate Verification
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                    {isValid ? "CERTIFICATE VERIFIED" : "CERTIFICATE INVALID"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {data.message || (isValid ? "This certificate has passed the available authenticity and integrity checks." : "This certificate did not pass all verification checks.")}
                  </p>

                  <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Certificate Number</p>
                      <p className="mt-1 font-mono text-base font-bold text-slate-900">{data.certificateNumber || certificateNumber}</p>
                    </div>
                    <div className={`rounded-2xl px-5 py-3 ${isValid ? "bg-emerald-50" : "bg-red-50"}`}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verification</p>
                      <p className={`mt-1 text-base font-bold ${isValid ? "text-emerald-700" : "text-red-700"}`}>{verifiedCount}/4 Checks Passed</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-4">
                  {[
                    ["Integrity", data.integrityVerified],
                    ["Certificate", data.certificateStatusValid],
                    ["Inspection", data.inspectionStatusValid],
                    ["Result", data.resultValid],
                  ].map(([label, ok]) => (
                    <div key={String(label)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Main status */}
            <section
              className={`mt-6 rounded-3xl border bg-white p-6 shadow-sm md:p-8 ${
                isValid
                  ? "border-emerald-200"
                  : "border-red-200"
              }`}
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${
                      isValid
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {isValid ? (
                      <CheckCircle2 size={34} />
                    ) : (
                      <XCircle size={34} />
                    )}
                  </div>

                  <div>
                    <p
                      className={`text-xs font-bold uppercase tracking-[0.18em] ${
                        isValid
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      SmartMetrix Certificate
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
                      {isValid
                        ? "Certificate Verified"
                        : "Certificate Invalid"}
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      {data.message ||
                        (isValid
                          ? "The certificate passed the available verification checks."
                          : "The certificate did not pass all verification checks.")}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <div
                    className={`rounded-2xl px-5 py-3 text-center ${
                      isValid
                        ? "bg-emerald-50"
                        : "bg-red-50"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Certificate Status
                    </p>

                    <p
                      className={`mt-1 text-lg font-bold ${
                        isValid
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {data.certificateStatus ||
                        "UNKNOWN"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Verification checks */}
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    Verification Checks
                  </h3>

                  <p className="text-xs text-slate-500">
                    Certificate authenticity and linked
                    inspection validation
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Hash Integrity
                  </p>

                  <StatusBadge
                    valid={data.integrityVerified}
                    label={
                      data.integrityVerified
                        ? "Verified"
                        : "Failed"
                    }
                  />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Certificate Status
                  </p>

                  <StatusBadge
                    valid={
                      data.certificateStatusValid
                    }
                    label={
                      data.certificateStatusValid
                        ? "ISSUED"
                        : "Invalid"
                    }
                  />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Inspection Status
                  </p>

                  <StatusBadge
                    valid={
                      data.inspectionStatusValid
                    }
                    label={
                      data.inspectionStatusValid
                        ? "Approved"
                        : "Invalid"
                    }
                  />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Inspection Result
                  </p>

                  <StatusBadge
                    valid={data.resultValid}
                    label={
                      data.resultValid
                        ? "PASS"
                        : "Invalid"
                    }
                  />
                </div>
              </div>
            </section>

            {/* Certificate + inspection */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FileCheck2 size={20} />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Certificate Details
                    </h3>
                    <p className="text-xs text-slate-500">
                      Official certificate information
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <DetailRow
                    label="Certificate Number"
                    value={
                      <span className="font-mono">
                        {data.certificateNumber ||
                          certificateNumber ||
                          "—"}
                      </span>
                    }
                  />

                  <DetailRow
                    label="Certificate ID"
                    value={data.certificateId}
                  />

                  <DetailRow
                    label="Status"
                    value={data.certificateStatus}
                  />

                  <DetailRow
                    label="Inspection ID"
                    value={data.inspectionId}
                  />

                  <DetailRow
                    label="Inspector ID"
                    value={data.inspectorId}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Inspection Details
                    </h3>
                    <p className="text-xs text-slate-500">
                      Certificate-linked inspection
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <DetailRow
                    label="Inspection ID"
                    value={data.inspectionId}
                  />

                  <DetailRow
                    label="Inspection Status"
                    value={data.inspectionStatus}
                  />

                  <DetailRow
                    label="Overall Result"
                    value={
                      <span
                        className={
                          data.overallResult ===
                          "PASS"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }
                      >
                        {data.overallResult ||
                          "—"}
                      </span>
                    }
                  />

                  <DetailRow
                    label="Inspector ID"
                    value={data.inspectorId}
                  />
                </div>
              </section>
            </div>

            {/* Instrument */}
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <FileCheck2 size={20} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    Instrument Details
                  </h3>

                  <p className="text-xs text-slate-500">
                    Instrument linked to the verified
                    inspection
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-x-8 md:grid-cols-2">
                <DetailRow
                  label="Instrument ID"
                  value={data.instrumentId}
                />

                <DetailRow
                  label="Serial Number"
                  value={data.serialNumber}
                />

                <DetailRow
                  label="Manufacturer"
                  value={data.manufacturer}
                />

                <DetailRow
                  label="Model"
                  value={data.model}
                />

                <DetailRow
                  label="Instrument Class"
                  value={data.instrumentClass}
                />

                <DetailRow
                  label="Capacity"
                  value={
                    data.capacity !== undefined
                      ? data.capacity
                      : undefined
                  }
                />

                <DetailRow
                  label="Scale Interval"
                  value={data.scaleInterval}
                />

                <DetailRow
                  label="Minimum Capacity"
                  value={data.minCapacity}
                />

                <DetailRow
                  label="Instrument Status"
                  value={data.instrumentStatus}
                />
              </div>
            </section>

            {/* Hash */}
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Hash size={20} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    Integrity Verification
                  </h3>

                  <p className="text-xs text-slate-500">
                    Stored SHA-256 hash compared with
                    the calculated hash
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Stored Hash
                  </p>

                  <div className="overflow-x-auto rounded-2xl bg-slate-950 p-4">
                    <code className="break-all text-xs leading-6 text-emerald-300">
                      {data.storedHash || "Not available"}
                    </code>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Calculated Hash
                  </p>

                  <div className="overflow-x-auto rounded-2xl bg-slate-950 p-4">
                    <code className="break-all text-xs leading-6 text-blue-300">
                      {data.calculatedHash ||
                        "Not available"}
                    </code>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-3 rounded-2xl p-4 ${
                    data.integrityVerified
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {data.integrityVerified ? (
                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0"
                    />
                  ) : (
                    <XCircle
                      size={20}
                      className="mt-0.5 shrink-0"
                    />
                  )}

                  <div>
                    <p className="font-semibold">
                      {data.integrityVerified
                        ? "Certificate integrity verified"
                        : "Certificate integrity could not be verified"}
                    </p>

                    <p className="mt-1 text-sm opacity-80">
                      {data.integrityVerified
                        ? "The stored certificate hash matches the hash calculated from the linked certificate data."
                        : "The stored certificate hash does not match the calculated hash."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Disclaimer */}
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs leading-5 text-amber-800">
                <strong>SmartMetrix Research Prototype:</strong>{" "}
                This public verification page confirms the
                certificate data available in the SmartMetrix
                system and its stored SHA-256 integrity check.
                It is intended for the project's digital
                verification workflow and research demonstration.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default VerifyCertificate;
