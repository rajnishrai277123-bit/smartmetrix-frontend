import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getInstrumentHealth } from "../services/healthService";

type Instrument = {
  id: number;
  capacity: number;
  instrumentClass: string;
  manufacturer: string;
  minCapacity: number;
  model: string;
  scaleInterval: number;
  serialNumber: string;
  status: string;
};

type InstrumentHealth = {
  instrumentId: number;
  serialNumber: string;
  model: string;
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  passRate: number;
  wpQuality: number;
  repeatabilityQuality: number;
  eccentricityQuality: number;
  healthScore: number;
  healthStatus: string;
};

const initialForm = {
  capacity: "",
  instrumentClass: "III",
  manufacturer: "",
  minCapacity: "",
  model: "",
  scaleInterval: "",
  serialNumber: "",
  status: "ACTIVE",
};

export default function Instruments() {
  const navigate = useNavigate();

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [createdInstrumentId, setCreatedInstrumentId] =
    useState<number | null>(null);

  const [healthData, setHealthData] =
    useState<InstrumentHealth | null>(null);

  const [healthLoading, setHealthLoading] = useState(false);

  const [form, setForm] = useState(initialForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Fetch Instruments
  // --------------------------------------------------

  const fetchInstruments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/instruments");

      setInstruments(response.data);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Failed to load instruments."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstruments();
  }, []);

  // --------------------------------------------------
  // View Instrument Health
  // --------------------------------------------------

  const handleViewHealth = async (instrumentId: number) => {
    try {
      setHealthLoading(true);
      setError("");

      const data = await getInstrumentHealth(instrumentId);

      setHealthData(data);
      setShowHealthModal(true);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Failed to load instrument health."
      );
    } finally {
      setHealthLoading(false);
    }
  };

  // --------------------------------------------------
  // Handle Input
  // --------------------------------------------------

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // Open Add Modal
  // --------------------------------------------------

  const handleAdd = () => {
    setEditingId(null);
    setForm(initialForm);
    setMessage("");
    setError("");
    setShowModal(true);
  };

  // --------------------------------------------------
  // Open Edit Modal
  // --------------------------------------------------

  const handleEdit = (instrument: Instrument) => {
    setEditingId(instrument.id);

    setForm({
      capacity: String(instrument.capacity ?? ""),
      instrumentClass: instrument.instrumentClass ?? "III",
      manufacturer: instrument.manufacturer ?? "",
      minCapacity: String(instrument.minCapacity ?? ""),
      model: instrument.model ?? "",
      scaleInterval: String(instrument.scaleInterval ?? ""),
      serialNumber: instrument.serialNumber ?? "",
      status: instrument.status ?? "ACTIVE",
    });

    setMessage("");
    setError("");
    setShowModal(true);
  };

  // --------------------------------------------------
  // Create / Update Instrument
  // --------------------------------------------------

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      const payload = {
        capacity: Number(form.capacity),
        instrumentClass: form.instrumentClass,
        manufacturer: form.manufacturer.trim(),
        minCapacity: Number(form.minCapacity),
        model: form.model.trim(),
        scaleInterval: Number(form.scaleInterval),
        serialNumber: form.serialNumber.trim(),
        status: form.status,
      };

      // CREATE
      if (editingId === null) {
        const response = await api.post(
          "/instruments",
          payload
        );

        const createdInstrument = response.data;

        setCreatedInstrumentId(createdInstrument.id);

        setShowModal(false);

        setEditingId(null);
        setForm(initialForm);

        await fetchInstruments();

        setShowSuccessModal(true);
      }

      // UPDATE
      else {
        await api.put(
          `/instruments/${editingId}`,
          payload
        );

        setMessage(
          "Instrument updated successfully."
        );

        setShowModal(false);

        setEditingId(null);
        setForm(initialForm);

        await fetchInstruments();
      }
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Something went wrong."
      );
    }
  };

  // --------------------------------------------------
  // Delete Instrument
  // --------------------------------------------------

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this instrument?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      await api.delete(`/instruments/${id}`);

      setMessage(
        "Instrument deleted successfully."
      );

      await fetchInstruments();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Failed to delete instrument."
      );
    }
  };

  // --------------------------------------------------
  // Go To Inspection
  // --------------------------------------------------

  const handleGoToInspection = () => {
    if (createdInstrumentId === null) {
      return;
    }

    setShowSuccessModal(false);

    navigate("/inspections", {
      state: {
        instrumentId: createdInstrumentId,
      },
    });
  };

  // --------------------------------------------------
  // Close Success Popup
  // --------------------------------------------------

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setCreatedInstrumentId(null);
  };

  // --------------------------------------------------
  // Health Helpers
  // --------------------------------------------------

  const getHealthColor = (status: string) => {
    if (status === "HEALTHY") {
      return {
        text: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        ring: "border-emerald-500",
      };
    }

    if (status === "WARNING") {
      return {
        text: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
        ring: "border-amber-500",
      };
    }

    if (status === "CRITICAL") {
      return {
        text: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200",
        ring: "border-red-500",
      };
    }

    return {
      text: "text-slate-700",
      bg: "bg-slate-50",
      border: "border-slate-200",
      ring: "border-slate-400",
    };
  };

  const getMetricColor = (value: number) => {
    if (value >= 80) {
      return "bg-emerald-500";
    }

    if (value >= 50) {
      return "bg-amber-500";
    }

    return "bg-red-500";
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600 font-medium">
          Loading instruments...
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      <div className="max-w-7xl mx-auto">

        {/* Header */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Instruments
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Manage weighing instruments used for inspections.
            </p>
          </div>

          <button
            onClick={handleAdd}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
          >
            + Add Instrument
          </button>

        </div>

        {/* Existing Instrument Guidance */}

        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <h2 className="font-semibold text-blue-900">
              Already have an instrument?
            </h2>

            <p className="text-sm text-blue-700 mt-1">
              You can directly select an existing instrument
              and start an inspection.
            </p>
          </div>

          <button
            onClick={() => navigate("/inspections")}
            className="px-5 py-3 rounded-xl bg-white border border-blue-200 text-blue-700 font-semibold hover:bg-blue-100 transition"
          >
            Go to Inspection →
          </button>

        </div>

        {/* Messages */}

        {message && (
          <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {/* Instruments Table */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-100">

                <tr>

                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    ID
                  </th>

                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    Serial Number
                  </th>

                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    Model
                  </th>

                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    Manufacturer
                  </th>

                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    Class
                  </th>

                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    Capacity
                  </th>

                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    Scale Interval
                  </th>

                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    Status
                  </th>

                  <th className="text-right px-5 py-4 font-semibold text-slate-700">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {instruments.length === 0 ? (

                  <tr>

                    <td
                      colSpan={9}
                      className="text-center py-10 text-slate-500"
                    >
                      No instruments found.
                    </td>

                  </tr>

                ) : (

                  instruments.map((instrument) => (

                    <tr
                      key={instrument.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >

                      <td className="px-5 py-4 text-slate-700">
                        {instrument.id}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-900">
                        {instrument.serialNumber}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {instrument.model}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {instrument.manufacturer}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {instrument.instrumentClass}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {instrument.capacity}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {instrument.scaleInterval}
                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            instrument.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {instrument.status}
                        </span>

                      </td>

                      <td className="px-5 py-4">

                        <div className="flex justify-end gap-2">

                          {/* Health */}

                          <button
                            onClick={() =>
                              handleViewHealth(instrument.id)
                            }
                            disabled={healthLoading}
                            className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium disabled:opacity-50"
                          >
                            {healthLoading
                              ? "Loading..."
                              : "Health"}
                          </button>

                          {/* Edit */}

                          <button
                            onClick={() =>
                              handleEdit(instrument)
                            }
                            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                          >
                            Edit
                          </button>

                          {/* Delete */}

                          <button
                            onClick={() =>
                              handleDelete(instrument.id)
                            }
                            className="px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {/* ================================================= */}
      {/* ADD / EDIT INSTRUMENT MODAL */}
      {/* ================================================= */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-6">

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  {editingId === null
                    ? "Add Instrument"
                    : "Edit Instrument"}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Enter weighing instrument details.
                </p>

              </div>

              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Serial Number */}

                <div>

                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Serial Number
                  </label>

                  <input
                    type="text"
                    name="serialNumber"
                    value={form.serialNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. TEST-001"
                  />

                </div>

                {/* Model */}

                <div>

                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Model
                  </label>

                  <input
                    type="text"
                    name="model"
                    value={form.model}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. DI-200"
                  />

                </div>

                {/* Manufacturer */}

                <div>

                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Manufacturer
                  </label>

                  <input
                    type="text"
                    name="manufacturer"
                    value={form.manufacturer}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. SmartMetrix"
                  />

                </div>

                {/* Instrument Class */}

                <div>

                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Instrument Class
                  </label>

                  <select
                    name="instrumentClass"
                    value={form.instrumentClass}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    <option value="I">I</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IIII">IIII</option>

                  </select>

                </div>

                {/* Capacity */}

                <div>

                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Capacity
                  </label>

                  <input
                    type="number"
                    step="any"
                    name="capacity"
                    value={form.capacity}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 50"
                  />

                </div>

                {/* Minimum Capacity */}

                <div>

                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Minimum Capacity
                  </label>

                  <input
                    type="number"
                    step="any"
                    name="minCapacity"
                    value={form.minCapacity}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 0.2"
                  />

                </div>

                {/* Scale Interval */}

                <div>

                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Scale Interval (e)
                  </label>

                  <input
                    type="number"
                    step="any"
                    name="scaleInterval"
                    value={form.scaleInterval}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 0.01"
                  />

                </div>

                {/* Status */}

                <div>

                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    <option value="ACTIVE">
                      ACTIVE
                    </option>

                    <option value="INACTIVE">
                      INACTIVE
                    </option>

                  </select>

                </div>

              </div>

              {/* Form Error */}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Buttons */}

              <div className="flex justify-end gap-3 pt-4">

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                >
                  {editingId === null
                    ? "Create Instrument"
                    : "Update Instrument"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ================================================= */}
      {/* PROFESSIONAL INSTRUMENT HEALTH MODAL */}
      {/* ================================================= */}

      {showHealthModal && healthData && (() => {

        const healthColors = getHealthColor(
          healthData.healthStatus
        );

        return (

          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">

            {/* Background */}

            <div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setShowHealthModal(false)}
            />

            {/* Modal */}

            <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

              {/* Header */}

              <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 md:px-8 py-5 rounded-t-3xl">

                <div className="flex items-center justify-between">

                  <div>

                    <div className="flex items-center gap-3">

                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg">
                        ♥
                      </div>

                      <div>

                        <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                          Instrument Health
                        </h2>

                        <p className="text-sm text-slate-500 mt-0.5">
                          Health analysis based on inspection history
                        </p>

                      </div>

                    </div>

                  </div>

                  <button
                    onClick={() =>
                      setShowHealthModal(false)
                    }
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-2xl transition"
                  >
                    ×
                  </button>

                </div>

              </div>

              {/* Content */}

              <div className="p-6 md:p-8">

                {/* Instrument Identity */}

                <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Instrument
                    </p>

                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      {healthData.serialNumber}
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      Model: {healthData.model}
                    </p>

                  </div>

                  <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">

                    <p className="text-xs text-slate-400">
                      Instrument ID
                    </p>

                    <p className="text-lg font-bold text-slate-800">
                      #{healthData.instrumentId}
                    </p>

                  </div>

                </div>

                {/* Score + Status */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                  {/* Score Circle */}

                  <div className="md:col-span-1 rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center">

                    <p className="text-sm font-semibold text-slate-500 mb-5">
                      Overall Health
                    </p>

                    <div className="relative w-36 h-36">

                      <svg
                        className="w-36 h-36 -rotate-90"
                        viewBox="0 0 120 120"
                      >

                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="10"
                          className="text-slate-200"
                        />

                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="10"
                          strokeLinecap="round"
                          className={
                            healthColors.text
                          }
                          strokeDasharray={314}
                          strokeDashoffset={
                            314 -
                            (314 *
                              Math.min(
                                Math.max(
                                  healthData.healthScore,
                                  0
                                ),
                                100
                              )) /
                              100
                          }
                        />

                      </svg>

                      <div className="absolute inset-0 flex flex-col items-center justify-center">

                        <span className="text-3xl font-bold text-slate-900">
                          {healthData.healthScore}
                        </span>

                        <span className="text-xs text-slate-400">
                          / 100
                        </span>

                      </div>

                    </div>

                    <div
                      className={`mt-5 px-4 py-2 rounded-full text-sm font-bold ${healthColors.bg} ${healthColors.text} border ${healthColors.border}`}
                    >
                      {healthData.healthStatus}
                    </div>

                  </div>

                  {/* Health Explanation */}

                  <div className="md:col-span-2 rounded-2xl border border-slate-200 p-6">

                    <div className="flex items-center justify-between mb-5">

                      <div>

                        <h3 className="font-bold text-slate-900">
                          Health Indicators
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          Performance across inspection metrics
                        </p>

                      </div>

                      <span className="text-xs font-semibold text-slate-400">
                        4 metrics
                      </span>

                    </div>

                    <div className="space-y-5">

                      {/* Pass Rate */}

                      <div>

                        <div className="flex justify-between items-center mb-2">

                          <span className="text-sm font-semibold text-slate-700">
                            Pass Rate
                          </span>

                          <span className="text-sm font-bold text-slate-900">
                            {healthData.passRate}%
                          </span>

                        </div>

                        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">

                          <div
                            className={`h-full rounded-full transition-all ${getMetricColor(
                              healthData.passRate
                            )}`}
                            style={{
                              width: `${Math.min(
                                Math.max(
                                  healthData.passRate,
                                  0
                                ),
                                100
                              )}%`,
                            }}
                          />

                        </div>

                      </div>

                      {/* WP */}

                      <div>

                        <div className="flex justify-between items-center mb-2">

                          <span className="text-sm font-semibold text-slate-700">
                            Weighing Performance
                          </span>

                          <span className="text-sm font-bold text-slate-900">
                            {healthData.wpQuality}%
                          </span>

                        </div>

                        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">

                          <div
                            className={`h-full rounded-full transition-all ${getMetricColor(
                              healthData.wpQuality
                            )}`}
                            style={{
                              width: `${Math.min(
                                Math.max(
                                  healthData.wpQuality,
                                  0
                                ),
                                100
                              )}%`,
                            }}
                          />

                        </div>

                      </div>

                      {/* Repeatability */}

                      <div>

                        <div className="flex justify-between items-center mb-2">

                          <span className="text-sm font-semibold text-slate-700">
                            Repeatability
                          </span>

                          <span className="text-sm font-bold text-slate-900">
                            {healthData.repeatabilityQuality}%
                          </span>

                        </div>

                        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">

                          <div
                            className={`h-full rounded-full transition-all ${getMetricColor(
                              healthData.repeatabilityQuality
                            )}`}
                            style={{
                              width: `${Math.min(
                                Math.max(
                                  healthData.repeatabilityQuality,
                                  0
                                ),
                                100
                              )}%`,
                            }}
                          />

                        </div>

                      </div>

                      {/* Eccentricity */}

                      <div>

                        <div className="flex justify-between items-center mb-2">

                          <span className="text-sm font-semibold text-slate-700">
                            Eccentricity
                          </span>

                          <span className="text-sm font-bold text-slate-900">
                            {healthData.eccentricityQuality}%
                          </span>

                        </div>

                        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">

                          <div
                            className={`h-full rounded-full transition-all ${getMetricColor(
                              healthData.eccentricityQuality
                            )}`}
                            style={{
                              width: `${Math.min(
                                Math.max(
                                  healthData.eccentricityQuality,
                                  0
                                ),
                                100
                              )}%`,
                            }}
                          />

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

                {/* Inspection Summary */}

                <div className="mt-6">

                  <div className="flex items-center justify-between mb-4">

                    <div>

                      <h3 className="text-lg font-bold text-slate-900">
                        Inspection Summary
                      </h3>

                      <p className="text-sm text-slate-500 mt-1">
                        Historical inspection results for this instrument
                      </p>

                    </div>

                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    {/* Total */}

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Total Inspections
                      </p>

                      <p className="text-3xl font-bold text-slate-900 mt-2">
                        {healthData.totalInspections}
                      </p>

                    </div>

                    {/* Passed */}

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">

                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                        Passed
                      </p>

                      <p className="text-3xl font-bold text-emerald-700 mt-2">
                        {healthData.passedInspections}
                      </p>

                    </div>

                    {/* Failed */}

                    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

                      <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                        Failed
                      </p>

                      <p className="text-3xl font-bold text-red-700 mt-2">
                        {healthData.failedInspections}
                      </p>

                    </div>

                  </div>

                </div>

                {/* Score Legend */}

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">

                  <div className="flex flex-wrap items-center gap-5 text-xs font-medium">

                    <div className="flex items-center gap-2">

                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />

                      <span className="text-slate-600">
                        Healthy ≥ 80
                      </span>

                    </div>

                    <div className="flex items-center gap-2">

                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />

                      <span className="text-slate-600">
                        Warning 50–79.99
                      </span>

                    </div>

                    <div className="flex items-center gap-2">

                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />

                      <span className="text-slate-600">
                        Critical &lt; 50
                      </span>

                    </div>

                  </div>

                </div>

                {/* Footer */}

                <div className="flex justify-end mt-6">

                  <button
                    onClick={() =>
                      setShowHealthModal(false)
                    }
                    className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition"
                  >
                    Close
                  </button>

                </div>

              </div>

            </div>

          </div>

        );

      })()}

      {/* ================================================= */}
      {/* SUCCESS MODAL */}
      {/* ================================================= */}

      {showSuccessModal && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">

          {/* Background */}

          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />

          {/* Modal */}

          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">

            <div className="text-center">

              {/* Success Icon */}

              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 text-2xl font-bold">
                ✓
              </div>

              {/* Title */}

              <h2 className="text-xl font-bold text-slate-900">
                Instrument Created Successfully
              </h2>

              {/* Message */}

              <p className="text-sm text-slate-500 mt-2">
                Your new instrument has been registered successfully.
              </p>

              <p className="text-sm text-slate-600 mt-3">
                Would you like to go to Inspection and start an inspection?
              </p>

              {/* Buttons */}

              <div className="flex justify-center gap-3 mt-6">

                <button
                  onClick={handleCloseSuccessModal}
                  className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Close
                </button>

                <button
                  onClick={handleGoToInspection}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                >
                  Go to Inspection
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}