import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  XCircle,
  Search,
  Award,
} from "lucide-react";

import api from "../services/api";

interface Inspection {
  id: number;
  instrumentId: number;
  inspectorId: number;
  status: string;
  overallResult: string;
}

interface Certificate {
  id: number;
  inspectionId: number;
  certificateNumber: string;
  hash: string;
  signature?: string | null;
  status: string;
}

interface Instrument {
  id: number;
  serialNumber: string;
  manufacturer: string;
  model: string;
  instrumentClass: string;
  capacity: number;
  scaleInterval: number;
  minCapacity?: number;
  status?: string;
}

interface VerificationResponse {
  valid: boolean;
  message: string;

  certificateNumber?: string;
  certificateId?: number;
  inspectionId?: number;

  certificateStatus?: string;
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

  storedHash?: string;
  calculatedHash?: string;

  integrityVerified?: boolean;
}

interface VerificationState {
  certificateId: number;
  loading: boolean;
  data?: VerificationResponse;
  error?: string;
}

export default function Certificates() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  const [instruments, setInstruments] = useState<
    Record<number, Instrument>
  >({});

  const [loading, setLoading] = useState(true);

  const [generatingId, setGeneratingId] =
    useState<number | null>(null);

  const [downloadingId, setDownloadingId] =
    useState<number | null>(null);

  const [verifyingId, setVerifyingId] =
    useState<number | null>(null);

  const [verification, setVerification] =
    useState<VerificationState | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        inspectionResponse,
        certificateResponse,
        instrumentResponse,
      ] = await Promise.all([
        api.get<Inspection[]>("/inspections"),
        api.get<Certificate[]>("/certificates"),
        api.get<Instrument[]>("/instruments"),
      ]);

      setInspections(inspectionResponse.data);
      setCertificates(certificateResponse.data);

      const instrumentMap: Record<number, Instrument> = {};

      instrumentResponse.data.forEach((instrument) => {
        instrumentMap[instrument.id] = instrument;
      });

      setInstruments(instrumentMap);
    } catch (err: any) {
      console.error(
        "Failed to load certificate data:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to load certificate information."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * INSPECTIONS WHICH ALREADY HAVE CERTIFICATES
   */
  const certificateInspectionIds = useMemo(
    () =>
      new Set(
        certificates.map(
          (certificate) => certificate.inspectionId
        )
      ),
    [certificates]
  );

  /*
   * CONTROLLER APPROVED + PASS + NO CERTIFICATE
   */
  const approvedInspections = useMemo(() => {
    const filtered = inspections.filter(
      (inspection) =>
        inspection.status === "CONTROLLER_APPROVED" &&
        inspection.overallResult === "PASS" &&
        !certificateInspectionIds.has(inspection.id)
    );

    if (!search.trim()) {
      return filtered;
    }

    const query = search.trim().toLowerCase();

    return filtered.filter((inspection) => {
      const instrument =
        instruments[inspection.instrumentId];

      return (
        String(inspection.id)
          .toLowerCase()
          .includes(query) ||
        String(inspection.inspectorId)
          .toLowerCase()
          .includes(query) ||
        instrument?.serialNumber
          ?.toLowerCase()
          .includes(query) ||
        instrument?.model
          ?.toLowerCase()
          .includes(query) ||
        instrument?.manufacturer
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [
    inspections,
    instruments,
    search,
    certificateInspectionIds,
  ]);

  /*
   * GENERATED CERTIFICATES
   *
   * Each certificate is mapped to its own inspection.
   * This prevents Inspection #20 data from mixing
   * with Inspection #21 data.
   */
  const generatedCertificates = useMemo(() => {
    return certificates
      .map((certificate) => {
        const inspection = inspections.find(
          (item) =>
            item.id === certificate.inspectionId
        );

        const instrument = inspection
          ? instruments[inspection.instrumentId]
          : undefined;

        return {
          certificate,
          inspection,
          instrument,
        };
      })
      .sort(
        (a, b) =>
          b.certificate.id -
          a.certificate.id
      );
  }, [
    certificates,
    inspections,
    instruments,
  ]);

  /*
   * GENERATE CERTIFICATE
   */
  const generateCertificate = async (
    inspection: Inspection
  ) => {
    try {
      setGeneratingId(inspection.id);

      setMessage("");
      setError("");
      setVerification(null);

      if (
        inspection.status !==
        "CONTROLLER_APPROVED"
      ) {
        throw new Error(
          "Certificate can be generated only after Controller approval."
        );
      }

      if (
        inspection.overallResult !== "PASS"
      ) {
        throw new Error(
          "Certificate can be generated only for a PASS inspection."
        );
      }

      /*
       * Extra frontend protection against
       * duplicate certificate generation.
       */
      if (
        certificateInspectionIds.has(
          inspection.id
        )
      ) {
        throw new Error(
          `Certificate already exists for Inspection #${inspection.id}.`
        );
      }

      await api.post(
        `/certificates/inspection/${inspection.id}`
      );

      setMessage(
        `Certificate for Inspection #${inspection.id} generated successfully.`
      );

      await loadAll();
    } catch (err: any) {
      console.error(
        "Certificate generation failed:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to generate certificate."
      );
    } finally {
      setGeneratingId(null);
    }
  };

  /*
   * DOWNLOAD PDF
   */
  const downloadCertificatePdf = async (
    certificate: Certificate
  ) => {
    try {
      setDownloadingId(certificate.id);

      setMessage("");
      setError("");

      const response = await api.get(
        `/certificates/${certificate.id}/pdf`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type: "application/pdf",
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `${certificate.certificateNumber}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      setMessage(
        `${certificate.certificateNumber}.pdf downloaded successfully.`
      );
    } catch (err: any) {
      console.error(
        "Certificate PDF download failed:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to download certificate PDF."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  /*
   * VERIFY CERTIFICATE
   */
  const verifyCertificate = async (
    certificate: Certificate
  ) => {
    try {
      setVerifyingId(certificate.id);

      setMessage("");
      setError("");

      const response =
        await api.get<VerificationResponse>(
          `/verify/${certificate.certificateNumber}`
        );

      setVerification({
        certificateId: certificate.id,
        loading: false,
        data: response.data,
      });
    } catch (err: any) {
      console.error(
        "Certificate verification failed:",
        err
      );

      setVerification({
        certificateId: certificate.id,
        loading: false,
        error:
          err?.response?.data?.message ||
          "Unable to verify certificate.",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const closeVerification = () => {
    setVerification(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">
            Certificates
          </h1>

          <p className="mt-4 text-slate-400">
            Loading certificates...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">

          <div>
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-blue-400" />

              <h1 className="text-3xl font-bold">
                Certificates
              </h1>
            </div>

            <p className="text-slate-400 mt-2">
              Generate, download and verify SmartMetrix
              inspection certificates.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />

            Refresh
          </button>
        </div>

        {/* SUCCESS */}

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-700 bg-emerald-950/40 px-5 py-4 flex items-start gap-3">

            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />

            <div>
              <p className="font-semibold text-emerald-300">
                Success
              </p>

              <p className="text-sm text-emerald-200 mt-1">
                {message}
              </p>
            </div>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-700 bg-red-950/40 px-5 py-4 flex items-start gap-3">

            <XCircle className="w-5 h-5 text-red-400 mt-0.5" />

            <div>
              <p className="font-semibold text-red-300">
                Error
              </p>

              <p className="text-sm text-red-200 mt-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* CONTROLLER APPROVED INSPECTIONS */}
        {/* ===================================================== */}

        <section className="mb-10">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">

            <div>
              <h2 className="text-xl font-bold">
                Controller Approved Inspections
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                PASS inspections waiting for certificate
                generation.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search inspection / serial..."
                className="pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {approvedInspections.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-7 text-center">

              <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />

              <p className="mt-3 text-slate-300 font-medium">
                No controller-approved inspections waiting.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Fully approved PASS inspections without
                certificates will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">

              {approvedInspections.map(
                (inspection) => {
                  const instrument =
                    instruments[
                      inspection.instrumentId
                    ];

                  return (
                    <div
                      key={inspection.id}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
                    >

                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 flex-1">

                          <div>
                            <p className="text-xs text-slate-500 uppercase">
                              Inspection
                            </p>

                            <p className="font-semibold mt-1">
                              #{inspection.id}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500 uppercase">
                              Inspector
                            </p>

                            <p className="font-semibold mt-1">
                              #{inspection.inspectorId}
                            </p>
                          </div>

                       <div>
  <p className="text-xs text-slate-500 uppercase">
    Instrument
  </p>

  <p className="font-semibold mt-1">
    Instrument #{inspection.instrumentId}
  </p>

  <p className="text-xs text-slate-500 mt-1">
    {instrument?.serialNumber || "-"}
  </p>

  <p className="text-xs text-slate-500 mt-1">
    {instrument?.model || "-"}
  </p>
</div>

                          <div>
                            <p className="text-xs text-slate-500 uppercase">
                              Result
                            </p>

                            <span className="inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              PASS
                            </span>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500 uppercase">
                              Approval
                            </p>

                            <span className="inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                              CONTROLLER_APPROVED
                            </span>
                          </div>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            generateCertificate(
                              inspection
                            )
                          }
                          disabled={
                            generatingId ===
                            inspection.id
                          }
                          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                          <FileCheck2 className="w-5 h-5" />

                          {generatingId ===
                          inspection.id
                            ? "Generating..."
                            : "Generate Certificate"}
                        </button>

                      </div>
                    </div>
                  );
                }
              )}

            </div>
          )}
        </section>

        {/* ===================================================== */}
        {/* GENERATED CERTIFICATES */}
        {/* ===================================================== */}

        <section>

          <div className="mb-5">
            <h2 className="text-xl font-bold">
              Generated Certificates
            </h2>

            <p className="text-sm text-slate-400 mt-1">
              Issued certificates grouped with their
              corresponding inspections.
            </p>
          </div>

          {generatedCertificates.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">

              <FileCheck2 className="w-10 h-10 text-slate-600 mx-auto" />

              <p className="mt-3 font-medium text-slate-300">
                No certificates generated yet.
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Generate a certificate from a
                controller-approved inspection above.
              </p>
            </div>
          ) : (
            <div className="space-y-5">

              {generatedCertificates.map(
                ({
                  certificate,
                  inspection,
                  instrument,
                }) => {

                  return (
                    <div
                      key={certificate.id}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
                    >

                      {/* CERTIFICATE HEADER */}

                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

                        <div>
                          <div className="flex flex-wrap items-center gap-3">

                            <h3 className="text-lg font-bold">
                              {certificate.certificateNumber}
                            </h3>

                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              {certificate.status}
                            </span>

                          </div>

                          <p className="text-sm text-slate-500 mt-1">
                            Certificate #{certificate.id}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">

                          <button
                            type="button"
                            onClick={() =>
                              downloadCertificatePdf(
                                certificate
                              )
                            }
                            disabled={
                              downloadingId ===
                              certificate.id
                            }
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            <Download className="w-4 h-4" />

                            {downloadingId ===
                            certificate.id
                              ? "Downloading..."
                              : "Download PDF"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              verifyCertificate(
                                certificate
                              )
                            }
                            disabled={
                              verifyingId ===
                              certificate.id
                            }
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 font-medium"
                          >
                            <ShieldCheck className="w-4 h-4" />

                            {verifyingId ===
                            certificate.id
                              ? "Checking..."
                              : "Verify"}
                          </button>

                        </div>

                      </div>

                      {/* INSPECTION INFORMATION */}

                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                        <InfoCard
                          label="Inspection"
                          value={
                            inspection
                              ? `#${inspection.id}`
                              : `#${certificate.inspectionId}`
                          }
                        />

                        <InfoCard
                          label="Inspection Status"
                          value={
                            inspection?.status ||
                            "-"
                          }
                        />

                        <InfoCard
                          label="Overall Result"
                          value={
                            inspection?.overallResult ||
                            "-"
                          }
                        />

                        <InfoCard
                          label="Inspector"
                          value={
                            inspection
                              ? `#${inspection.inspectorId}`
                              : "-"
                          }
                        />

                      </div>

                      {/* INSTRUMENT INFORMATION */}
{/* INSTRUMENT INFORMATION */}

<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">

  <InfoCard
    label="Instrument ID"
    value={
      inspection
        ? `#${inspection.instrumentId}`
        : "-"
    }
  />

  <InfoCard
    label="Manufacturer"
    value={
      instrument?.manufacturer ||
      "-"
    }
  />

  <InfoCard
    label="Model"
    value={
      instrument?.model ||
      "-"
    }
  />

  <InfoCard
    label="Serial Number"
    value={
      instrument?.serialNumber ||
      "-"
    }
  />

  <InfoCard
    label="Class"
    value={
      instrument?.instrumentClass ||
      "-"
    }
  />

  <InfoCard
    label="Capacity"
    value={
      instrument?.capacity != null
        ? `${instrument.capacity} kg`
        : "-"
    }
  />

</div>

                      {/* HASH */}

                      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">

                        <p className="text-xs text-slate-500 uppercase">
                          SHA-256
                        </p>

                        <p
                          className="font-mono text-xs text-slate-300 mt-2 break-all"
                          title={certificate.hash}
                        >
                          {certificate.hash}
                        </p>

                      </div>

                      {/* VERIFICATION */}

                      {verification?.certificateId ===
                        certificate.id && (
                        <div className="mt-6 pt-6 border-t border-slate-800">

                          {verification.error ? (
                            <div className="rounded-lg border border-red-800 bg-red-950/30 p-5">

                              <div className="flex items-center gap-2 text-red-300 font-semibold">

                                <XCircle className="w-5 h-5" />

                                Verification Failed

                              </div>

                              <p className="text-sm text-red-200 mt-2">
                                {verification.error}
                              </p>

                            </div>
                          ) : verification.data ? (
                            <div className="rounded-lg border border-slate-700 bg-slate-950 p-5">

                              <div className="flex items-center justify-between gap-4 mb-5">

                                <div>
                                  <h4 className="font-bold text-lg">
                                    Certificate Verification
                                  </h4>

                                  <p className="text-sm text-slate-500 mt-1">
                                    Detailed certificate
                                    integrity and status check.
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={
                                    closeVerification
                                  }
                                  className="text-sm text-slate-400 hover:text-white"
                                >
                                  Close
                                </button>

                              </div>

                              {/* VALID / INVALID */}

                              {verification.data.valid ? (
                                <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-4 mb-5">

                                  <div className="flex items-center gap-3">

                                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />

                                    <div>

                                      <p className="font-semibold text-emerald-300">
                                        Certificate is valid
                                      </p>

                                      <p className="text-sm text-emerald-200 mt-1">
                                        {
                                          verification
                                            .data
                                            .message
                                        }
                                      </p>

                                    </div>

                                  </div>

                                </div>
                              ) : (
                                <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 mb-5">

                                  <div className="flex items-center gap-3">

                                    <XCircle className="w-6 h-6 text-red-400" />

                                    <div>

                                      <p className="font-semibold text-red-300">
                                        Certificate verification failed
                                      </p>

                                      <p className="text-sm text-red-200 mt-1">
                                        {
                                          verification
                                            .data
                                            .message
                                        }
                                      </p>

                                    </div>

                                  </div>

                                </div>
                              )}

                              {/* DETAILS */}

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                <VerificationItem
                                  label="Certificate Number"
                                  value={
                                    verification.data
                                      .certificateNumber
                                  }
                                />

                                <VerificationItem
                                  label="Certificate Status"
                                  value={
                                    verification.data
                                      .certificateStatus
                                  }
                                />

                                <VerificationItem
                                  label="Inspection ID"
                                  value={
                                    verification.data
                                      .inspectionId != null
                                      ? `#${verification.data.inspectionId}`
                                      : "-"
                                  }
                                />

                                <VerificationItem
                                  label="Inspection Status"
                                  value={
                                    verification.data
                                      .inspectionStatus
                                  }
                                />

                                <VerificationItem
                                  label="Overall Result"
                                  value={
                                    verification.data
                                      .overallResult
                                  }
                                />

                                <VerificationItem
                                  label="Inspector ID"
                                  value={
                                    verification.data
                                      .inspectorId != null
                                      ? `#${verification.data.inspectorId}`
                                      : "-"
                                  }
                                />

                                <VerificationItem
  label="Instrument ID"
  value={
    verification.data.instrumentId != null
      ? `#${verification.data.instrumentId}`
      : "-"
  }
/>

                                <VerificationItem
                                  label="Manufacturer"
                                  value={
                                    verification.data
                                      .manufacturer
                                  }
                                />

                                <VerificationItem
                                  label="Model"
                                  value={
                                    verification.data
                                      .model
                                  }
                                />

                                <VerificationItem
                                  label="Serial Number"
                                  value={
                                    verification.data
                                      .serialNumber
                                  }
                                />

                                <VerificationItem
                                  label="Instrument Class"
                                  value={
                                    verification.data
                                      .instrumentClass
                                  }
                                />

                                <VerificationItem
                                  label="Capacity"
                                  value={
                                    verification.data
                                      .capacity != null
                                      ? `${verification.data.capacity} kg`
                                      : "-"
                                  }
                                />

                                <VerificationItem
                                  label="Scale Interval"
                                  value={
                                    verification.data
                                      .scaleInterval != null
                                      ? `${verification.data.scaleInterval} kg`
                                      : "-"
                                  }
                                />

                              </div>

                              {/* HASH COMPARISON */}

                              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">

                                <HashBox
                                  title="Stored SHA-256"
                                  value={
                                    verification.data
                                      .storedHash
                                  }
                                />

                                <HashBox
                                  title="Calculated SHA-256"
                                  value={
                                    verification.data
                                      .calculatedHash
                                  }
                                />

                              </div>

                              {/* INTEGRITY */}

                              <div className="mt-5 rounded-lg border border-slate-700 bg-slate-900 p-4">

                                <div className="flex items-center gap-3">

                                  {verification.data
                                    .integrityVerified ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                  ) : (
                                    <XCircle className="w-6 h-6 text-red-400" />
                                  )}

                                  <div>

                                    <p className="font-semibold">
                                      Certificate Integrity
                                    </p>

                                    <p
                                      className={
                                        verification.data
                                          .integrityVerified
                                          ? "text-sm text-emerald-300 mt-1"
                                          : "text-sm text-red-300 mt-1"
                                      }
                                    >
                                      {verification.data
                                        .integrityVerified
                                        ? "VERIFIED — stored hash matches calculated hash."
                                        : "FAILED — certificate data integrity could not be verified."}
                                    </p>

                                  </div>

                                </div>

                              </div>

                            </div>
                          ) : null}

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

      </div>
    </div>
  );
}

/* ===================================================== */
/* SMALL UI COMPONENTS */
/* ===================================================== */

function InfoCard({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">

      <p className="text-xs text-slate-500 uppercase">
        {label}
      </p>

      <p className="text-sm font-medium text-slate-200 mt-1 break-words">
        {value ?? "-"}
      </p>

    </div>
  );
}

function VerificationItem({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="text-sm font-medium text-slate-200 mt-1 break-words">
        {value ?? "-"}
      </p>

    </div>
  );
}

function HashBox({
  title,
  value,
}: {
  title: string;
  value?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">

      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="font-mono text-xs text-slate-300 mt-2 break-all">
        {value || "-"}
      </p>

    </div>
  );
}