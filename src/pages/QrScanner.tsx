import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  CheckCircle2,
  Loader2,
  QrCode,
  Search,
  ShieldCheck,
  XCircle,
  Camera,
  CameraOff,
  ScanLine,
  Scale,
  ArrowRight,
  RefreshCw,
  Upload,
  X,
  Image as ImageIcon,
  ClipboardCheck,
  FileCheck2,
  Activity,
  Shield,
  Sparkles,
} from "lucide-react";

import { Html5Qrcode } from "html5-qrcode";
import api from "../services/api";

/* =========================================================
   TYPES
========================================================= */

interface Instrument {
  id: number;
  manufacturer: string;
  model: string;
  serialNumber: string;
  instrumentClass: string;
  capacity: number;
  minCapacity?: number;
  scaleInterval: number;
  status: string;
}

interface Inspection {
  id: number;
  instrumentId: number;
  inspectorId?: number;
  status?: string;
  overallResult?: string;
  completedAt?: string | null;
  completionTime?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  controllerApprovedAt?: string | null;
  [key: string]: any;
}

interface TestRecord {
  id: number;
  inspectionId: number;
  testType?: string;
  referenceWeight?: number;
  observedWeight?: number;
  error?: number;
  mpe?: number;
  temperature?: number;
  humidity?: number;
  vibration?: number;
  result?: string;
  createdAt?: string;
  testStage?: string;
  clientRecordId?: string;
  [key: string]: any;
}

interface RepeatabilityRecord {
  id: number;
  inspectionId: number;
  testRunId?: number;
  referenceWeight?: number;
  observedWeight?: number;
  readingNumber?: number;
  [key: string]: any;
}

interface EccentricityRecord {
  id: number;
  inspectionId: number;
  position?: string;
  referenceWeight?: number;
  observedWeight?: number;
  [key: string]: any;
}

interface Certificate {
  id?: number;
  inspectionId?: number;
  certificateNumber?: string;
  hash?: string;
  signature?: string;
  status?: string;
  [key: string]: any;
}

interface CertificateInstrument {
  manufacturer: string;
  model: string;
  serialNumber: string;
  instrumentClass: string;
  capacity: number;
  minCapacity?: number;
  scaleInterval: number;
}

interface CertificateVerification {
  valid: boolean;
  certificateNumber: string;
  certificateStatus: string;
  inspectionId: number;
  inspectionStatus: string;
  overallResult: string;
  inspectorId: number;
  instrument?: CertificateInstrument;
  storedHash: string;
  calculatedHash: string;
  integrityVerified: boolean;
}

/* =========================================================
   HELPERS
========================================================= */

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function getInspectionCompletionTime(
  inspection?: Inspection | null
) {
  if (!inspection) {
    return null;
  }

  return (
    inspection.completedAt ??
    inspection.completionTime ??
    null
  );
}

function getResultClass(result?: string) {
  const value = String(result ?? "").toUpperCase();

  if (value === "PASS") {
    return "text-emerald-600";
  }

  if (value === "FAIL") {
    return "text-red-600";
  }

  return "text-slate-900";
}

/* =========================================================
   COMPONENT
========================================================= */

export default function QRScanner() {
  /* =======================================================
     SEARCH STATES
  ======================================================= */

  const [certificateNumber, setCertificateNumber] =
    useState("");

  const [instrumentCode, setInstrumentCode] =
    useState("");

  /* =======================================================
     RESULT STATES
  ======================================================= */

  const [, setResult] = useState<
    "PASS" | "FAIL" | "VALID" | "INVALID" | null
  >(null);

  const [instrument, setInstrument] =
    useState<Instrument | null>(null);

  const [verification, setVerification] =
    useState<CertificateVerification | null>(null);

  /* =======================================================
     INSTRUMENT DETAILS
  ======================================================= */

  const [instrumentInspection, setInstrumentInspection] =
    useState<Inspection | null>(null);

  const [instrumentTests, setInstrumentTests] =
    useState<TestRecord[]>([]);

  const [instrumentRepeatability, setInstrumentRepeatability] =
    useState<RepeatabilityRecord[]>([]);

  const [instrumentEccentricity, setInstrumentEccentricity] =
    useState<EccentricityRecord[]>([]);

  const [instrumentCertificate, setInstrumentCertificate] =
    useState<Certificate | null>(null);

  /* =======================================================
     LOADING
  ======================================================= */

  const [loading, setLoading] = useState(false);

  const [instrumentLoading, setInstrumentLoading] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [scanning, setScanning] =
    useState(false);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [showScanOptions, setShowScanOptions] =
    useState(false);

  /* =======================================================
     MESSAGE / ERROR
  ======================================================= */

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  /* =======================================================
     DETECTION MODE
  ======================================================= */

  const [scanMode, setScanMode] = useState<
    "INSTRUMENT" | "CERTIFICATE" | null
  >(null);

  /* =======================================================
     REFS
  ======================================================= */

  const scannerRef =
    useRef<Html5Qrcode | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  /* =======================================================
     RESET
  ======================================================= */

  const resetResults = () => {
    setCertificateNumber("");
    setInstrumentCode("");

    setResult(null);
    setInstrument(null);
    setVerification(null);

    setInstrumentInspection(null);
    setInstrumentTests([]);
    setInstrumentRepeatability([]);
    setInstrumentEccentricity([]);
    setInstrumentCertificate(null);

    setError("");
    setMessage("");
    setScanMode(null);
  };

  /* =======================================================
     STOP CAMERA
  ======================================================= */

  const stopScanner = async () => {
    const scanner = scannerRef.current;

    if (!scanner) {
      setScanning(false);
      return;
    }

    scannerRef.current = null;

    try {
      const state = scanner.getState();

      if (state === 2 || state === 3) {
        await scanner.stop();
      }
    } catch (err) {
      console.warn(
        "Camera stop warning:",
        err
      );
    }

    try {
      scanner.clear();
    } catch (err) {
      console.warn(
        "Camera clear warning:",
        err
      );
    }

    setScanning(false);
  };

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      if (!scanner) {
        return;
      }

      scannerRef.current = null;

      try {
        const state = scanner.getState();

        if (state === 2 || state === 3) {
          scanner.stop().catch(() => {});
        }
      } catch {}

      try {
        scanner.clear();
      } catch {}
    };
  }, []);

  /* =======================================================
     START CAMERA
  ======================================================= */

  useEffect(() => {
    if (!scanning) {
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      try {
        setError("");

        setMessage(
          "Starting camera..."
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 250)
        );

        if (cancelled) {
          return;
        }

        const scannerElement =
          document.getElementById(
            "smartmetrix-qr-reader"
          );

        if (!scannerElement) {
          throw new Error(
            "QR scanner container was not found."
          );
        }

        if (scannerRef.current) {
          return;
        }

        let cameras;

        try {
          cameras =
            await Html5Qrcode.getCameras();
        } catch (cameraError) {
          console.error(
            "getCameras error:",
            cameraError
          );

          throw new Error(
            "Camera permission was denied or the browser could not access the camera."
          );
        }

        if (cancelled) {
          return;
        }

        if (
          !cameras ||
          cameras.length === 0
        ) {
          throw new Error(
            "No camera was found on this device."
          );
        }

        let selectedCamera =
          cameras.find((camera) => {
            const label =
              camera.label.toLowerCase();

            return (
              label.includes("back") ||
              label.includes("rear") ||
              label.includes("environment")
            );
          });

        if (!selectedCamera) {
          selectedCamera = cameras[0];
        }

        const scanner =
          new Html5Qrcode(
            "smartmetrix-qr-reader"
          );

        scannerRef.current = scanner;

        await scanner.start(
          selectedCamera.id,
          {
            fps: 10,

            qrbox: {
              width: 250,
              height: 250,
            },

            aspectRatio: 1.0,

            disableFlip: false,
          },

          async (decodedText) => {
            try {
              console.log(
                "QR decoded:",
                decodedText
              );

              setMessage(
                "QR detected. Processing..."
              );

              await stopScanner();

              await handleQrScan(
                decodedText
              );
            } catch (scanError) {
              console.error(
                "QR processing error:",
                scanError
              );

              setError(
                "QR was detected, but it could not be processed."
              );

              setMessage("");
            }
          },

          () => {}
        );

        if (!cancelled) {
          setMessage(
            "Camera is active. Point the camera at a QR code."
          );
        }
      } catch (err: any) {
        console.error(
          "CAMERA START ERROR:",
          err
        );

        if (!cancelled) {
          const scanner =
            scannerRef.current;

          scannerRef.current = null;

          if (scanner) {
            try {
              const state =
                scanner.getState();

              if (
                state === 2 ||
                state === 3
              ) {
                await scanner.stop();
              }
            } catch {}

            try {
              scanner.clear();
            } catch {}
          }

          setScanning(false);

          setError(
            err?.message ||
              "Unable to start camera."
          );

          setMessage("");
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
    };
  }, [scanning]);

  /* =======================================================
     OPEN SCAN OPTIONS
  ======================================================= */

  const openScanOptions = () => {
    setError("");
    setMessage("");
    setShowScanOptions(true);
  };

  /* =======================================================
     USE CAMERA
  ======================================================= */

  const handleUseCamera = () => {
    setShowScanOptions(false);

    resetResults();

    setScanning(true);
  };

  /* =======================================================
     OPEN GALLERY / FILE
  ======================================================= */

  const openFilePicker = () => {
    setShowScanOptions(false);

    setTimeout(() => {
      fileInputRef.current?.click();
    }, 150);
  };

  /* =======================================================
     LOAD INSTRUMENT DETAILS
  ======================================================= */

  const loadInstrumentDetails = async (
    foundInstrument: Instrument
  ) => {
    setDetailsLoading(true);

    setInstrumentInspection(null);
    setInstrumentTests([]);
    setInstrumentRepeatability([]);
    setInstrumentEccentricity([]);
    setInstrumentCertificate(null);

    try {
      /* =====================================================
         1. INSPECTIONS
      ===================================================== */

      const inspectionResponse =
        await api.get(
          "/inspections"
        );

      const inspections: Inspection[] =
        Array.isArray(
          inspectionResponse.data
        )
          ? inspectionResponse.data
          : [];

      const relatedInspections =
        inspections.filter(
          (item) =>
            Number(item.instrumentId) ===
            Number(foundInstrument.id)
        );

      relatedInspections.sort(
        (a, b) =>
          Number(b.id) -
          Number(a.id)
      );

      const latestInspection =
        relatedInspections.length > 0
          ? relatedInspections[0]
          : null;

      setInstrumentInspection(
        latestInspection
      );

      if (!latestInspection?.id) {
        setMessage(
          "Instrument found. No inspection has been linked to this instrument yet."
        );

        return;
      }

      /* =====================================================
         2. TEST RECORDS
      ===================================================== */

      try {
        const testResponse =
          await api.get(
            "/test-records"
          );

        const allTests: TestRecord[] =
          Array.isArray(
            testResponse.data
          )
            ? testResponse.data
            : [];

        const relatedTests =
          allTests.filter(
            (item) =>
              Number(item.inspectionId) ===
              Number(latestInspection.id)
          );

        setInstrumentTests(
          relatedTests
        );
      } catch (testError) {
        console.warn(
          "Unable to load test records:",
          testError
        );
      }

      /* =====================================================
         3. REPEATABILITY
      ===================================================== */

      try {
        const response =
          await api.get(
            `/repeatability/inspection/${latestInspection.id}`
          );

        const records =
          Array.isArray(
            response.data
          )
            ? response.data
            : [];

        setInstrumentRepeatability(
          records
        );
      } catch (repeatabilityError) {
        console.warn(
          "Unable to load repeatability records:",
          repeatabilityError
        );
      }

      /* =====================================================
         4. ECCENTRICITY
      ===================================================== */

      try {
        const response =
          await api.get(
            `/eccentricity/inspection/${latestInspection.id}`
          );

        const records =
          Array.isArray(
            response.data
          )
            ? response.data
            : [];

        setInstrumentEccentricity(
          records
        );
      } catch (eccentricityError) {
        console.warn(
          "Unable to load eccentricity records:",
          eccentricityError
        );
      }

      /* =====================================================
         5. CERTIFICATE
      ===================================================== */

      try {
        const response =
          await api.get(
            "/certificates"
          );

        const certificates: Certificate[] =
          Array.isArray(
            response.data
          )
            ? response.data
            : [];

        const relatedCertificate =
          certificates.find(
            (item) =>
              Number(item.inspectionId) ===
              Number(latestInspection.id)
          ) ?? null;

        setInstrumentCertificate(
          relatedCertificate
        );
      } catch (certificateError) {
        console.warn(
          "Unable to load certificate:",
          certificateError
        );
      }
    } catch (inspectionError) {
      console.warn(
        "Unable to load instrument inspection details:",
        inspectionError
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  /* =======================================================
     GALLERY / IMAGE QR SCAN
  ======================================================= */

  const handleQrImageUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setUploading(true);

      setError("");
      setMessage("");

      setInstrument(null);
      setVerification(null);

      setInstrumentInspection(null);
      setInstrumentTests([]);
      setInstrumentRepeatability([]);
      setInstrumentEccentricity([]);
      setInstrumentCertificate(null);

      setResult(null);
      setScanMode(null);

      if (
        !file.type.startsWith("image/")
      ) {
        throw new Error(
          "Please select an image containing a QR code."
        );
      }

      setMessage(
        "Reading QR image..."
      );

      const fileScanner =
        new Html5Qrcode(
          "smartmetrix-qr-file-reader"
        );

      let decodedText = "";

      try {
        decodedText =
          await fileScanner.scanFile(
            file,
            true
          );
      } finally {
        try {
          fileScanner.clear();
        } catch {}
      }

      if (!decodedText) {
        throw new Error(
          "No QR code was detected in the selected image."
        );
      }

      console.log(
        "QR image decoded:",
        decodedText
      );

      setMessage(
        "QR image detected. Processing..."
      );

      await handleQrScan(
        decodedText
      );
    } catch (err: any) {
      console.error(
        "QR image scan error:",
        err
      );

      setError(
        err?.message ||
          "Unable to read the QR image. Please select a clear QR code image."
      );

      setMessage("");
    } finally {
      setUploading(false);
    }
  };

  /* =======================================================
     EXTRACT QR VALUE
  ======================================================= */

  const extractQrValue = (
    rawValue: string
  ) => {
    const value =
      rawValue.trim();

    if (!value) {
      return {
        type: "INSTRUMENT" as const,
        value: "",
      };
    }

    /* JSON */

    try {
      const parsed =
        JSON.parse(value);

      if (
        parsed.certificateNumber
      ) {
        return {
          type: "CERTIFICATE" as const,
          value: String(
            parsed.certificateNumber
          ).trim(),
        };
      }

      if (
        parsed.serialNumber
      ) {
        return {
          type: "INSTRUMENT" as const,
          value: String(
            parsed.serialNumber
          ).trim(),
        };
      }

      if (
        parsed.instrumentCode
      ) {
        return {
          type: "INSTRUMENT" as const,
          value: String(
            parsed.instrumentCode
          ).trim(),
        };
      }

      if (parsed.id) {
        return {
          type: "INSTRUMENT" as const,
          value: String(
            parsed.id
          ).trim(),
        };
      }
    } catch {}

    /* CERTIFICATE NUMBER */

    const certificateMatch =
      value.match(
        /SMX-\d{4}-\d{5}/i
      );

    if (certificateMatch) {
      return {
        type: "CERTIFICATE" as const,
        value:
          certificateMatch[0],
      };
    }

    /* URL */

    try {
      const url =
        new URL(value);

      const certificateFromUrl =
        url.searchParams.get(
          "certificateNumber"
        ) ||
        url.searchParams.get(
          "certificate"
        ) ||
        url.searchParams.get(
          "cert"
        );

      if (certificateFromUrl) {
        return {
          type: "CERTIFICATE" as const,
          value:
            certificateFromUrl.trim(),
        };
      }

      const serialFromUrl =
        url.searchParams.get(
          "serialNumber"
        ) ||
        url.searchParams.get(
          "serial"
        ) ||
        url.searchParams.get(
          "instrumentCode"
        );

      if (serialFromUrl) {
        return {
          type: "INSTRUMENT" as const,
          value:
            serialFromUrl.trim(),
        };
      }

      const idFromUrl =
        url.searchParams.get(
          "instrumentId"
        ) ||
        url.searchParams.get(
          "id"
        );

      if (idFromUrl) {
        return {
          type: "INSTRUMENT" as const,
          value:
            idFromUrl.trim(),
        };
      }

      const pathCertificateMatch =
        url.pathname.match(
          /SMX-\d{4}-\d{5}/i
        );

      if (pathCertificateMatch) {
        return {
          type: "CERTIFICATE" as const,
          value:
            pathCertificateMatch[0],
        };
      }
    } catch {}

    return {
      type: "INSTRUMENT" as const,
      value,
    };
  };

  /* =======================================================
     HANDLE QR SCAN
  ======================================================= */

  const handleQrScan = async (
    rawValue: string
  ) => {
    const decoded =
      extractQrValue(rawValue);

    setError("");
    setMessage("");

    if (!decoded.value) {
      setError(
        "QR code does not contain a valid value."
      );

      return;
    }

    if (
      decoded.type ===
      "CERTIFICATE"
    ) {
      setScanMode(
        "CERTIFICATE"
      );

      setCertificateNumber(
        decoded.value
      );

      await verifyCertificate(
        decoded.value
      );

      return;
    }

    setScanMode(
      "INSTRUMENT"
    );

    setInstrumentCode(
      decoded.value
    );

    await lookupInstrument(
      decoded.value
    );
  };

  /* =======================================================
     VERIFY CERTIFICATE
  ======================================================= */

  const verifyCertificate = async (
    certNumber?: string
  ) => {
    const value = (
      certNumber ??
      certificateNumber
    ).trim();

    if (!value) {
      setError(
        "Please enter a certificate number."
      );

      return;
    }

    try {
      setLoading(true);

      setError("");
      setMessage("");

      setInstrument(null);
      setVerification(null);

      setInstrumentInspection(null);
      setInstrumentTests([]);
      setInstrumentRepeatability([]);
      setInstrumentEccentricity([]);
      setInstrumentCertificate(null);

      setResult(null);

      const response =
        await api.get(
          `/verify/${encodeURIComponent(
            value
          )}`
        );

      console.log(
        "CERTIFICATE VERIFY RESPONSE:",
        response.data
      );

      const data =
        response.data;

      const normalizedData:
        CertificateVerification =
        {
          valid: Boolean(
            data?.valid
          ),

          certificateNumber:
            String(
              data?.certificateNumber ??
                value
            ),

          certificateStatus:
            String(
              data?.certificateStatus ??
                "UNKNOWN"
            ),

          inspectionId:
            Number(
              data?.inspectionId ??
                0
            ),

          inspectionStatus:
            String(
              data?.inspectionStatus ??
                "UNKNOWN"
            ),

          overallResult:
            String(
              data?.overallResult ??
                "UNKNOWN"
            ),

          inspectorId:
            Number(
              data?.inspectorId ??
                0
            ),

          instrument:
            data?.instrument
              ? {
                  manufacturer:
                    String(
                      data.instrument
                        ?.manufacturer ??
                        "N/A"
                    ),

                  model:
                    String(
                      data.instrument
                        ?.model ??
                        "N/A"
                    ),

                  serialNumber:
                    String(
                      data.instrument
                        ?.serialNumber ??
                        "N/A"
                    ),

                  instrumentClass:
                    String(
                      data.instrument
                        ?.instrumentClass ??
                        "N/A"
                    ),

                  capacity:
                    Number(
                      data.instrument
                        ?.capacity ??
                        0
                    ),

                  minCapacity:
                    data.instrument
                      ?.minCapacity !=
                    null
                      ? Number(
                          data.instrument
                            ?.minCapacity
                        )
                      : undefined,

                  scaleInterval:
                    Number(
                      data.instrument
                        ?.scaleInterval ??
                        0
                    ),
                }
              : undefined,

          storedHash:
            String(
              data?.storedHash ??
                ""
            ),

          calculatedHash:
            String(
              data?.calculatedHash ??
                ""
            ),

          integrityVerified:
            Boolean(
              data?.integrityVerified
            ),
        };

      /* FETCH INSTRUMENT IF MISSING */

      if (
        !normalizedData.instrument &&
        normalizedData.inspectionId
      ) {
        try {
          const inspectionResponse =
            await api.get(
              `/inspections/${normalizedData.inspectionId}`
            );

          const inspection =
            inspectionResponse.data;

          const instrumentId =
            inspection?.instrumentId;

          if (instrumentId) {
            const instrumentResponse =
              await api.get(
                `/instruments/${instrumentId}`
              );

            const instrumentData =
              instrumentResponse.data;

            if (instrumentData) {
              normalizedData.instrument =
                {
                  manufacturer:
                    String(
                      instrumentData
                        ?.manufacturer ??
                        "N/A"
                    ),

                  model:
                    String(
                      instrumentData
                        ?.model ??
                        "N/A"
                    ),

                  serialNumber:
                    String(
                      instrumentData
                        ?.serialNumber ??
                        "N/A"
                    ),

                  instrumentClass:
                    String(
                      instrumentData
                        ?.instrumentClass ??
                        "N/A"
                    ),

                  capacity:
                    Number(
                      instrumentData
                        ?.capacity ??
                        0
                    ),

                  minCapacity:
                    instrumentData
                      ?.minCapacity !=
                    null
                      ? Number(
                          instrumentData
                            ?.minCapacity
                        )
                      : undefined,

                  scaleInterval:
                    Number(
                      instrumentData
                        ?.scaleInterval ??
                        0
                    ),
                };
            }
          }
        } catch (instrumentError) {
          console.warn(
            "Unable to fetch instrument details:",
            instrumentError
          );
        }
      }

      setVerification(
        normalizedData
      );

      if (
        normalizedData.valid &&
        normalizedData.integrityVerified
      ) {
        setResult("VALID");

        setMessage(
          "Certificate verified successfully."
        );
      } else {
        setResult("INVALID");

        setMessage(
          "Certificate verification failed."
        );
      }
    } catch (err: any) {
      console.error(
        "Certificate verification error:",
        err
      );

      setVerification(null);

      setResult("INVALID");

      setError(
        err?.response?.data
          ?.message ||
          "Certificate verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     MANUAL CERTIFICATE SEARCH
  ======================================================= */

  const handleCertificateSearch =
    async () => {
      setScanMode(
        "CERTIFICATE"
      );

      await verifyCertificate();
    };

  /* =======================================================
     INSTRUMENT LOOKUP
  ======================================================= */

  const lookupInstrument = async (
    query: string
  ) => {
    const value =
      query.trim();

    if (!value) {
      setError(
        "Please enter serial number, model or instrument ID."
      );

      return;
    }

    try {
      setInstrumentLoading(true);

      setDetailsLoading(false);

      setError("");
      setMessage("");

      setInstrument(null);
      setVerification(null);

      setInstrumentInspection(null);
      setInstrumentTests([]);
      setInstrumentRepeatability([]);
      setInstrumentEccentricity([]);
      setInstrumentCertificate(null);

      setResult(null);

      const response =
        await api.get(
          "/instruments"
        );

      console.log(
        "INSTRUMENT SEARCH RESPONSE:",
        response.data
      );

      const instruments =
        Array.isArray(response.data)
          ? response.data
          : [];

      const searchValue =
        value.toLowerCase();

      const foundInstrument =
        instruments.find(
          (item: Instrument) => {
            const idMatch =
              String(
                item.id
              ) === value;

            const serialMatch =
              String(
                item.serialNumber ?? ""
              ).toLowerCase() ===
              searchValue;

            const modelMatch =
              String(
                item.model ?? ""
              ).toLowerCase() ===
              searchValue;

            return (
              idMatch ||
              serialMatch ||
              modelMatch
            );
          }
        );

      if (!foundInstrument) {
        setInstrument(null);

        setError(
          `No instrument found for "${value}".`
        );

        return;
      }

      setInstrument(
        foundInstrument
      );

      setScanMode(
        "INSTRUMENT"
      );

      setInstrumentCode(
        foundInstrument.serialNumber
      );

      localStorage.setItem(
        "smartmetrix_selected_instrument",
        JSON.stringify(
          foundInstrument
        )
      );

      localStorage.setItem(
        "selectedInstrumentId",
        String(
          foundInstrument.id
        )
      );

      setDetailsLoading(true);

      await loadInstrumentDetails(
        foundInstrument
      );

      setMessage(
        "Instrument found successfully. Inspection and compliance details loaded."
      );
    } catch (error: any) {
      console.error(
        "Instrument lookup failed:",
        error
      );

      setInstrument(null);

      setError(
        error?.response?.data
          ?.message ||
          "Unable to search instrument. Please check the backend."
      );
    } finally {
      setInstrumentLoading(false);
    }
  };

  /* =======================================================
     MANUAL INSTRUMENT SEARCH
  ======================================================= */

  const handleInstrumentSearch =
    async () => {
      setScanMode(
        "INSTRUMENT"
      );

      await lookupInstrument(
        instrumentCode
      );
    };

  /* =======================================================
     CLEAR
  ======================================================= */

  const clearResults = () => {
    resetResults();
  };

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const weighingTests =
    instrumentTests.filter(
      (item) =>
        String(
          item.testType ?? ""
        ).toUpperCase() ===
        "WEIGHING_PERFORMANCE"
    );

  const repeatabilityTests =
    instrumentTests.filter(
      (item) =>
        String(
          item.testType ?? ""
        ).toUpperCase() ===
        "REPEATABILITY"
    );

  const eccentricityTests =
    instrumentTests.filter(
      (item) =>
        String(
          item.testType ?? ""
        ).toUpperCase() ===
        "ECCENTRICITY"
    );

  const finalWeighing =
    weighingTests.length > 0
      ? [...weighingTests].sort(
          (a, b) =>
            Number(b.id) -
            Number(a.id)
        )[0]
      : null;

  const finalWeighingResult =
    finalWeighing?.result ??
    null;

  const repeatabilityReadings =
    instrumentRepeatability
      .filter(
        (item) =>
          item.observedWeight != null
      )
      .sort(
        (a, b) =>
          Number(
            a.readingNumber ?? 0
          ) -
          Number(
            b.readingNumber ?? 0
          )
      );

  const repeatabilityValues =
    repeatabilityReadings.map(
      (item) =>
        Number(
          item.observedWeight
        )
    );

  const repeatabilityAverage =
    repeatabilityValues.length > 0
      ? repeatabilityValues.reduce(
          (sum, value) =>
            sum + value,
          0
        ) /
        repeatabilityValues.length
      : null;

const repeatabilityRange =
  repeatabilityValues.length > 0
    ? Math.max(...repeatabilityValues) -
      Math.min(...repeatabilityValues)
    : null;

const repeatabilityResult =
  repeatabilityTests.length > 0
    ? repeatabilityTests
        .map((item) =>
          String(item.result ?? "").toUpperCase()
        )
        .find(
          (value) =>
            value === "PASS" ||
            value === "FAIL"
        ) ?? null
    : repeatabilityReadings.length > 0
      ? "PASS"
      : null;

const eccentricityValues =
  instrumentEccentricity
    .filter(
      (item) =>
        item.observedWeight != null
    )
    .map(
      (item) =>
        Number(item.observedWeight)
    );

const eccentricityHighest =
  eccentricityValues.length > 0
    ? Math.max(...eccentricityValues)
    : null;

const eccentricityLowest =
  eccentricityValues.length > 0
    ? Math.min(...eccentricityValues)
    : null;

const eccentricitySpread =
  eccentricityHighest != null &&
  eccentricityLowest != null
    ? eccentricityHighest -
      eccentricityLowest
    : null;

const eccentricityResult =
  eccentricityTests.length > 0
    ? eccentricityTests
        .map((item) =>
          String(item.result ?? "").toUpperCase()
        )
        .find(
          (value) =>
            value === "PASS" ||
            value === "FAIL"
        ) ?? null
    : eccentricityValues.length > 0
      ? "PASS"
      : null;

  const latestInspectionResult =
    instrumentInspection
      ?.overallResult ??
    null;

  const isCertificateValid =
    verification?.valid &&
    verification?.integrityVerified;

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="space-y-6 pb-8">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 shadow-xl sm:p-8">

        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
              <QrCode className="h-7 w-7 text-blue-300" />
            </div>

            <div>

              <div className="mb-2 flex flex-wrap items-center gap-2">

                <h1 className="text-2xl font-bold text-white sm:text-3xl">
                  QR Scanner
                </h1>

                <span className="inline-flex items-center gap-1 rounded-full border border-blue-300/20 bg-blue-400/10 px-2.5 py-1 text-[11px] font-semibold text-blue-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  SmartMetrix
                </span>

              </div>

              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                Scan, identify and verify SmartMetrix
                weighing instruments and certificates
                using camera, gallery or manual search.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 backdrop-blur">
            <Shield className="h-5 w-5 text-emerald-400" />
            Secure verification
          </div>

        </div>

      </div>

      {/* =====================================================
          MAIN SCANNER
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">

        {/* SCANNER */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 p-6">

            <div className="flex items-start justify-between gap-4">

              <div className="flex items-start gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <ScanLine className="h-5 w-5 text-blue-600" />
                </div>

                <div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Scan QR Code
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Use your camera or attach a QR image
                    from your gallery.
                  </p>

                </div>

              </div>

              {scanning && (
                <button
                  type="button"
                  onClick={stopScanner}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                >
                  <CameraOff className="h-4 w-4" />
                  Stop
                </button>
              )}

            </div>

          </div>

          {/* =================================================
              MAIN ACTION AREA
          ================================================== */}

          {!scanning && (
            <div className="p-6">

              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 sm:p-8">

                <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-100/60 blur-3xl" />

                <div className="relative mx-auto max-w-xl text-center">

                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-950 shadow-xl">
                    <QrCode className="h-10 w-10 text-blue-300" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900">
                    Ready to scan
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Scan a SmartMetrix instrument QR or
                    certificate QR. You can also select an
                    existing QR image from your computer.
                  </p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">

                    <button
                      type="button"
                      onClick={openScanOptions}
                      disabled={uploading}
                      className="group inline-flex items-center justify-center gap-3 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Camera className="h-5 w-5" />
                      Open Scanner
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </button>

                    <button
                      type="button"
                      onClick={openFilePicker}
                      disabled={uploading}
                      className="group inline-flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-blue-600" />
                      )}

                      Attach QR Image

                    </button>

                  </div>

                  <div className="mt-5 flex flex-wrap justify-center gap-2">

                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
                      PNG
                    </span>

                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
                      JPG
                    </span>

                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
                      WEBP
                    </span>

                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
                      Camera
                    </span>

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* =================================================
              CAMERA UI
          ================================================== */}

          {scanning && (
            <div className="p-5">

              <div className="overflow-hidden rounded-2xl bg-slate-950 shadow-xl">

                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                      <Camera className="h-5 w-5 text-blue-300" />
                    </div>

                    <div>
                      <p className="font-semibold text-white">
                        Live QR Scanner
                      </p>

                      <p className="text-xs text-slate-400">
                        Position the QR inside the frame
                      </p>
                    </div>

                  </div>

                  <div className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">

                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                    Camera Active

                  </div>

                </div>

                <div className="relative min-h-[430px] bg-black">

                  <div
                    id="smartmetrix-qr-reader"
                    className="min-h-[430px] w-full overflow-hidden"
                  />

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

                    <div className="relative h-[270px] w-[270px]">

                      <div className="absolute left-0 top-0 h-12 w-12 rounded-tl-2xl border-l-4 border-t-4 border-blue-400" />

                      <div className="absolute right-0 top-0 h-12 w-12 rounded-tr-2xl border-r-4 border-t-4 border-blue-400" />

                      <div className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-2xl border-b-4 border-l-4 border-blue-400" />

                      <div className="absolute bottom-0 right-0 h-12 w-12 rounded-br-2xl border-b-4 border-r-4 border-blue-400" />

                      <div className="absolute left-4 right-4 top-1/2 h-0.5 animate-pulse bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.9)]" />

                    </div>

                  </div>

                  <div className="pointer-events-none absolute bottom-5 left-1/2 w-[90%] -translate-x-1/2 rounded-xl border border-white/10 bg-black/70 px-4 py-3 text-center text-sm text-white backdrop-blur">
                    Point the camera at the QR code
                  </div>

                </div>

                <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-2 text-sm text-slate-400">

                    <ScanLine className="h-4 w-4 text-blue-400" />

                    Automatically detecting QR code...

                  </div>

                  <button
                    type="button"
                    onClick={stopScanner}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    <CameraOff className="h-4 w-4" />
                    Stop Scanner
                  </button>

                </div>

              </div>

            </div>
          )}

          {/* HIDDEN FILE SCANNER */}

          <div
            id="smartmetrix-qr-file-reader"
            className="hidden"
          />

          {/* HIDDEN FILE INPUT */}

          <input
            ref={fileInputRef}
            id="smartmetrix-qr-image-input"
            type="file"
            accept="image/*,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={
              handleQrImageUpload
            }
          />

          {/* UPLOAD STATUS */}

          {uploading && (
            <div className="mx-6 mb-6 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">

              <Loader2 className="h-5 w-5 animate-spin" />

              Reading QR image from gallery...

            </div>
          )}

        </div>

        {/* =================================================
            SECURITY PANEL
        ================================================== */}

        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>

            <div>

              <h2 className="font-bold">
                Secure Verification
              </h2>

              <p className="text-xs text-slate-400">
                SmartMetrix verification workflow
              </p>

            </div>

          </div>

          <div className="mt-6 space-y-3">

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

              <div className="flex gap-3">

                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                <div>
                  <p className="text-sm font-semibold">
                    Instant identification
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Identify instruments using serial
                    number, model or instrument ID.
                  </p>
                </div>

              </div>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

              <div className="flex gap-3">

                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

                <div>
                  <p className="text-sm font-semibold">
                    Certificate integrity
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Validate certificate status and
                    stored/calculated hash integrity.
                  </p>
                </div>

              </div>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

              <div className="flex gap-3">

                <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />

                <div>
                  <p className="text-sm font-semibold">
                    Complete traceability
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    View inspection, test and certificate
                    information linked to the instrument.
                  </p>
                </div>

              </div>

            </div>

          </div>

          <div className="mt-6 rounded-2xl border border-blue-400/10 bg-blue-400/5 p-4">

            <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
              OIML-oriented workflow
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              SmartMetrix connects QR identification with
              inspection and compliance records.
            </p>

          </div>

        </div>

      </div>

      {/* =====================================================
          SCAN OPTIONS MODAL
      ====================================================== */}

      {showScanOptions && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
          onClick={() =>
            setShowScanOptions(false)
          }
        >

          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="relative overflow-hidden bg-slate-950 px-6 py-7 text-white">

              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/20 blur-2xl" />

              <div className="relative flex items-start justify-between">

                <div className="flex items-start gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <QrCode className="h-6 w-6 text-blue-300" />
                  </div>

                  <div>

                    <h3 className="text-xl font-bold">
                      Scan QR Code
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      Choose your preferred scanning method.
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowScanOptions(false)
                  }
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>

            </div>

            <div className="space-y-3 p-6">

              {/* CAMERA */}

              <button
                type="button"
                onClick={
                  handleUseCamera
                }
                className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
              >

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 transition group-hover:bg-blue-100">
                  <Camera className="h-6 w-6 text-blue-600" />
                </div>

                <div className="flex-1">

                  <p className="font-bold text-slate-900">
                    Use Camera
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Open the live QR scanner.
                  </p>

                </div>

                <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500" />

              </button>

              {/* GALLERY */}

              <button
                type="button"
                onClick={
                  openFilePicker
                }
                disabled={uploading}
                className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 transition group-hover:bg-emerald-100">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-emerald-600" />
                  )}
                </div>

                <div className="flex-1">

                  <p className="font-bold text-slate-900">
                    Attach from Gallery / File
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Select a QR image from your computer.
                  </p>

                </div>

                <Upload className="h-5 w-5 text-emerald-500" />

              </button>

              <button
                type="button"
                onClick={() =>
                  setShowScanOptions(false)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          MANUAL SEARCH
      ====================================================== */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* INSTRUMENT */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-start gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
              <Scale className="h-5 w-5 text-indigo-600" />
            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                Instrument Search
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Search by serial number, model or ID.
              </p>

            </div>

          </div>

          <div className="flex gap-2">

            <input
              type="text"
              value={instrumentCode}
              onChange={(e) =>
                setInstrumentCode(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  handleInstrumentSearch();
                }
              }}
              placeholder="Serial number, model or ID"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />

            <button
              type="button"
              onClick={
                handleInstrumentSearch
              }
              disabled={
                instrumentLoading
              }
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >

              {instrumentLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}

              Search

            </button>

          </div>

        </div>

        {/* CERTIFICATE */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-start gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                Certificate Verification
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Verify authenticity and integrity.
              </p>

            </div>

          </div>

          <div className="flex gap-2">

            <input
              type="text"
              value={certificateNumber}
              onChange={(e) =>
                setCertificateNumber(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  handleCertificateSearch();
                }
              }}
              placeholder="SMX-2026-00020"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            />

            <button
              type="button"
              onClick={
                handleCertificateSearch
              }
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >

              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}

              Verify

            </button>

          </div>

        </div>

      </div>

      {/* =====================================================
          MESSAGE
      ====================================================== */}

      {message && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-800">

          <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />

          <span>{message}</span>

        </div>
      )}

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">

          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>

            <p className="font-bold">
              Scan / Search Error
            </p>

            <p className="mt-1">
              {error}
            </p>

          </div>

        </div>
      )}

      {/* =====================================================
          INSTRUMENT RESULT
      ====================================================== */}

      {instrument && (
        <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">

          {/* HEADER */}

          <div className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-blue-50 px-6 py-6">

            <div className="relative flex flex-wrap items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Instrument Detected
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  QR / search result successfully matched.
                </p>

              </div>

              <span className="ml-auto rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-700">
                {instrument.status}
              </span>

            </div>

          </div>

          {/* INSTRUMENT DETAILS */}

          <div className="p-6">

            <div className="mb-5 flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Scale className="h-5 w-5 text-blue-600" />
              </div>

              <div>

                <h3 className="font-bold text-slate-900">
                  Instrument Details
                </h3>

                <p className="text-sm text-slate-500">
                  Complete instrument identification.
                </p>

              </div>

            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              {[
                [
                  "Instrument ID",
                  `#${instrument.id}`,
                ],
                [
                  "Manufacturer",
                  instrument.manufacturer,
                ],
                [
                  "Model",
                  instrument.model,
                ],
                [
                  "Serial Number",
                  instrument.serialNumber,
                ],
                [
                  "Instrument Class",
                  instrument.instrumentClass,
                ],
                [
                  "Capacity",
                  `${instrument.capacity} kg`,
                ],
                [
                  "Min Capacity",
                  instrument.minCapacity != null
                    ? `${instrument.minCapacity} kg`
                    : "Not specified",
                ],
                [
                  "Scale Interval (e)",
                  `${instrument.scaleInterval} kg`,
                ],
              ].map(
                ([title, value]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {title}
                    </p>

                    <p className="mt-2 break-words font-bold text-slate-900">
                      {value}
                    </p>
                  </div>
                )
              )}

            </div>

          </div>

          {/* LOADING */}

          {detailsLoading && (
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">

              <div className="flex items-center gap-3 text-sm font-medium text-slate-600">

                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />

                Loading inspection, test and certificate details...

              </div>

            </div>
          )}

          {/* LATEST INSPECTION */}

          {instrumentInspection && (
            <div className="border-t border-slate-100 px-6 py-6">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                  <ClipboardCheck className="h-5 w-5 text-indigo-600" />
                </div>

                <div>

                  <h3 className="font-bold text-slate-900">
                    Latest Inspection
                  </h3>

                  <p className="text-sm text-slate-500">
                    Most recent inspection linked to this instrument.
                  </p>

                </div>

              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                {[
                  [
                    "Inspection ID",
                    `#${instrumentInspection.id}`,
                  ],
                  [
                    "Inspection Status",
                    instrumentInspection.status ??
                      "UNKNOWN",
                  ],
                  [
                    "Overall Result",
                    latestInspectionResult ??
                      "PENDING",
                  ],
                  [
                    "Inspector ID",
                    instrumentInspection.inspectorId
                      ? `#${instrumentInspection.inspectorId}`
                      : "Not available",
                  ],
                  [
                    "Completed",
                    formatDateTime(
                      getInspectionCompletionTime(
                        instrumentInspection
                      )
                    ),
                  ],
                  [
                    "Submitted",
                    formatDateTime(
                      instrumentInspection.submittedAt
                    ),
                  ],
                  [
                    "Senior Approval",
                    formatDateTime(
                      instrumentInspection.approvedAt
                    ),
                  ],
                  [
                    "Controller Approval",
                    formatDateTime(
                      instrumentInspection.controllerApprovedAt
                    ),
                  ],
                ].map(
                  ([title, value]) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {title}
                      </p>

                      <p
                        className={`mt-2 font-bold ${
                          title === "Overall Result"
                            ? getResultClass(
                                value
                              )
                            : "text-slate-900"
                        }`}
                      >
                        {value}
                      </p>

                    </div>
                  )
                )}

              </div>

            </div>
          )}

          {/* TEST SUMMARY */}

          {instrumentInspection && (
            <div className="border-t border-slate-100 px-6 py-6">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>

                <div>

                  <h3 className="font-bold text-slate-900">
                    Compliance Test Summary
                  </h3>

                  <p className="text-sm text-slate-500">
                    Results from the latest inspection.
                  </p>

                </div>

              </div>

              <div className="grid gap-4 md:grid-cols-3">

                {/* WP */}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                  <div className="flex items-start justify-between">

                    <div>

                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Weighing Performance
                      </p>

                      <p
                        className={`mt-2 text-xl font-black ${getResultClass(
                          finalWeighingResult ??
                            undefined
                        )}`}
                      >
                        {finalWeighingResult ??
                          "NOT RECORDED"}
                      </p>

                    </div>

                    <Scale className="h-7 w-7 text-slate-300" />

                  </div>

                  {finalWeighing && (
                    <div className="mt-5 space-y-2 text-sm text-slate-600">

                      <p>
                        Reference:{" "}
                        <span className="font-bold text-slate-900">
                          {finalWeighing.referenceWeight ??
                            "—"}{" "}
                          kg
                        </span>
                      </p>

                      <p>
                        Observed:{" "}
                        <span className="font-bold text-slate-900">
                          {finalWeighing.observedWeight ??
                            "—"}{" "}
                          kg
                        </span>
                      </p>

                      <p>
                        Error:{" "}
                        <span className="font-bold text-slate-900">
                          {finalWeighing.error != null
                            ? `${
                                finalWeighing.error >=
                                0
                                  ? "+"
                                  : ""
                              }${Number(
                                finalWeighing.error
                              ).toFixed(5)} kg`
                            : "—"}
                        </span>
                      </p>

                      <p>
                        MPE:{" "}
                        <span className="font-bold text-slate-900">
                          {finalWeighing.mpe != null
                            ? `±${Number(
                                finalWeighing.mpe
                              ).toFixed(5)} kg`
                            : "—"}
                        </span>
                      </p>

                    </div>
                  )}

                </div>

                {/* REPEATABILITY */}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                  <div className="flex items-start justify-between">

                    <div>

                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Repeatability
                      </p>

                      <p
                        className={`mt-2 text-xl font-black ${getResultClass(
                          repeatabilityResult ??
                            undefined
                        )}`}
                      >
                        {repeatabilityResult ??
                          "NOT RECORDED"}
                      </p>

                    </div>

                    <Activity className="h-7 w-7 text-slate-300" />

                  </div>

                  <div className="mt-5 space-y-2 text-sm text-slate-600">

                    <p>
                      Readings:{" "}
                      <span className="font-bold text-slate-900">
                        {repeatabilityReadings.length}
                      </span>
                    </p>

                    <p>
                      Average:{" "}
                      <span className="font-bold text-slate-900">
                        {repeatabilityAverage !=
                        null
                          ? `${repeatabilityAverage.toFixed(
                              4
                            )} kg`
                          : "—"}
                      </span>
                    </p>

                    <p>
                      Range:{" "}
                      <span className="font-bold text-slate-900">
                        {repeatabilityRange !=
                        null
                          ? `${repeatabilityRange.toFixed(
                              4
                            )} kg`
                          : "—"}
                      </span>
                    </p>

                  </div>

                </div>

                {/* ECCENTRICITY */}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                  <div className="flex items-start justify-between">

                    <div>

                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Eccentricity
                      </p>

                      <p
                        className={`mt-2 text-xl font-black ${getResultClass(
                          eccentricityResult ??
                            undefined
                        )}`}
                      >
                        {eccentricityResult ??
                          "NOT RECORDED"}
                      </p>

                    </div>

                    <ScanLine className="h-7 w-7 text-slate-300" />

                  </div>

                  <div className="mt-5 space-y-2 text-sm text-slate-600">

                    <p>
                      Readings:{" "}
                      <span className="font-bold text-slate-900">
                        {
                          instrumentEccentricity.length
                        }
                      </span>
                    </p>

                    <p>
                      Highest:{" "}
                      <span className="font-bold text-slate-900">
                        {eccentricityHighest !=
                        null
                          ? `${eccentricityHighest.toFixed(
                              4
                            )} kg`
                          : "—"}
                      </span>
                    </p>

                    <p>
                      Lowest:{" "}
                      <span className="font-bold text-slate-900">
                        {eccentricityLowest !=
                        null
                          ? `${eccentricityLowest.toFixed(
                              4
                            )} kg`
                          : "—"}
                      </span>
                    </p>

                    <p>
                      Spread:{" "}
                      <span className="font-bold text-slate-900">
                        {eccentricitySpread !=
                        null
                          ? `${eccentricitySpread.toFixed(
                              4
                            )} kg`
                          : "—"}
                      </span>
                    </p>

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* CERTIFICATE */}

          {instrumentCertificate && (
            <div className="border-t border-slate-100 px-6 py-6">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <FileCheck2 className="h-5 w-5 text-emerald-600" />
                </div>

                <div>

                  <h3 className="font-bold text-slate-900">
                    Certificate
                  </h3>

                  <p className="text-sm text-slate-500">
                    Certificate associated with the latest inspection.
                  </p>

                </div>

              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                {[
                  [
                    "Certificate Number",
                    instrumentCertificate.certificateNumber ??
                      "Not available",
                  ],
                  [
                    "Status",
                    instrumentCertificate.status ??
                      "UNKNOWN",
                  ],
                  [
                    "Certificate ID",
                    instrumentCertificate.id
                      ? `#${instrumentCertificate.id}`
                      : "Not available",
                  ],
                  [
                    "Inspection",
                    instrumentCertificate.inspectionId
                      ? `#${instrumentCertificate.inspectionId}`
                      : "Not available",
                  ],
                ].map(
                  ([title, value]) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {title}
                      </p>

                      <p className="mt-2 break-words font-bold text-slate-900">
                        {value}
                      </p>

                    </div>
                  )
                )}

              </div>

            </div>
          )}

          {/* NO INSPECTION */}

          {!instrumentInspection &&
            !detailsLoading && (
              <div className="border-t border-slate-100 px-6 py-5">

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">

                  <div className="flex items-start gap-3">

                    <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                    <div>

                      <p className="font-bold text-amber-800">
                        No inspection found
                      </p>

                      <p className="mt-1 text-sm text-amber-700">
                        This instrument exists, but no inspection
                        has been linked to it yet.
                      </p>

                    </div>

                  </div>

                </div>

              </div>
            )}

          {/* CLEAR */}

          <div className="flex justify-end border-t border-slate-100 px-6 py-4">

            <button
              type="button"
              onClick={
                clearResults
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >

              <RefreshCw className="h-4 w-4" />

              Clear

            </button>

          </div>

        </div>
      )}

      {/* =====================================================
          CERTIFICATE RESULT
      ====================================================== */}

      {verification && (
        <div
          className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
            isCertificateValid
              ? "border-emerald-200"
              : "border-red-200"
          }`}
        >

          {/* HEADER */}

          <div
            className={`border-b px-6 py-6 ${
              isCertificateValid
                ? "border-emerald-100 bg-gradient-to-r from-emerald-50 to-blue-50"
                : "border-red-100 bg-red-50"
            }`}
          >

            <div className="flex flex-wrap items-center gap-4">

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  isCertificateValid
                    ? "bg-emerald-100"
                    : "bg-red-100"
                }`}
              >

                {isCertificateValid ? (
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}

              </div>

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Certificate Verification
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {verification.certificateNumber}
                </p>

              </div>

              <span
                className={`ml-auto rounded-full px-4 py-1.5 text-xs font-bold ${
                  isCertificateValid
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isCertificateValid
                  ? "VALID"
                  : "INVALID"}
              </span>

            </div>

          </div>

          {/* BASIC DETAILS */}

          <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">

            {[
              [
                "Certificate Status",
                verification.certificateStatus,
              ],
              [
                "Inspection ID",
                `#${verification.inspectionId}`,
              ],
              [
                "Inspection Status",
                verification.inspectionStatus,
              ],
              [
                "Overall Result",
                verification.overallResult,
              ],
              [
                "Inspector ID",
                `#${verification.inspectorId}`,
              ],
              [
                "Integrity",
                verification.integrityVerified
                  ? "Verified"
                  : "Failed",
              ],
            ].map(
              ([title, value]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >

                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {title}
                  </p>

                  <p
                    className={`mt-2 font-bold ${
                      title === "Overall Result"
                        ? getResultClass(
                            value
                          )
                        : title === "Integrity"
                        ? verification.integrityVerified
                          ? "text-emerald-600"
                          : "text-red-600"
                        : "text-slate-900"
                    }`}
                  >
                    {value}
                  </p>

                </div>
              )
            )}

          </div>

          {/* CERTIFICATE INSTRUMENT */}

          {verification.instrument ? (
            <div className="border-t border-slate-100 px-6 py-6">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Scale className="h-5 w-5 text-blue-600" />
                </div>

                <div>

                  <h3 className="font-bold text-slate-900">
                    Certificate Instrument
                  </h3>

                  <p className="text-sm text-slate-500">
                    Instrument associated with this certificate.
                  </p>

                </div>

              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                {[
                  [
                    "Manufacturer",
                    verification.instrument.manufacturer,
                  ],
                  [
                    "Model",
                    verification.instrument.model,
                  ],
                  [
                    "Serial Number",
                    verification.instrument.serialNumber,
                  ],
                  [
                    "Class",
                    verification.instrument.instrumentClass,
                  ],
                  [
                    "Capacity",
                    `${verification.instrument.capacity} kg`,
                  ],
                  [
                    "Min Capacity",
                    verification.instrument.minCapacity !=
                    null
                      ? `${verification.instrument.minCapacity} kg`
                      : "Not specified",
                  ],
                  [
                    "Scale Interval",
                    `${verification.instrument.scaleInterval} kg`,
                  ],
                ].map(
                  ([title, value]) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >

                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {title}
                      </p>

                      <p className="mt-2 font-bold text-slate-900">
                        {value}
                      </p>

                    </div>
                  )
                )}

              </div>

            </div>
          ) : (
            <div className="border-t border-slate-100 px-6 py-5">

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">

                <div className="flex items-start gap-3">

                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                  <div>

                    <p className="font-bold text-amber-800">
                      Instrument details not returned
                    </p>

                    <p className="mt-1 text-sm text-amber-700">
                      Certificate processing succeeded, but
                      instrument details could not be loaded.
                    </p>

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* HASH */}

          <div className="border-t border-slate-100 px-6 py-6">

            <div className="mb-5 flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <Shield className="h-5 w-5 text-slate-600" />
              </div>

              <div>

                <h3 className="font-bold text-slate-900">
                  Certificate Integrity
                </h3>

                <p className="text-sm text-slate-500">
                  Stored and calculated certificate hashes.
                </p>

              </div>

            </div>

            <div className="space-y-4">

              <div>

                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Stored Hash
                </p>

                <div className="break-all rounded-2xl border border-slate-100 bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-600">
                  {verification.storedHash ||
                    "Not available"}
                </div>

              </div>

              <div>

                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Calculated Hash
                </p>

                <div className="break-all rounded-2xl border border-slate-100 bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-600">
                  {verification.calculatedHash ||
                    "Not available"}
                </div>

              </div>

              <div
                className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold ${
                  verification.integrityVerified
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >

                {verification.integrityVerified ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}

                {verification.integrityVerified
                  ? "Certificate hash integrity verified."
                  : "Certificate hash integrity could not be verified."}

              </div>

            </div>

          </div>

          {/* CLEAR */}

          <div className="flex justify-end border-t border-slate-100 px-6 py-4">

            <button
              type="button"
              onClick={
                clearResults
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >

              <RefreshCw className="h-4 w-4" />

              Clear

            </button>

          </div>

        </div>
      )}

      {/* =====================================================
          DETECTION MODE
      ====================================================== */}

      {scanMode && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">

          <span className="text-sm text-slate-500">
            Detection mode
          </span>

          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
            {scanMode ===
            "INSTRUMENT"
              ? "Instrument"
              : "Certificate"}
          </span>

        </div>
      )}

    </div>
  );
}