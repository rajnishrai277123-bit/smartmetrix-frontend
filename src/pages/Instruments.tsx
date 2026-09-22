
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

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

  const [editingId, setEditingId] = useState<number | null>(null);

  const [createdInstrumentId, setCreatedInstrumentId] = useState<number | null>(
    null
  );

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

      // ----------------------------------------------
      // CREATE
      // ----------------------------------------------

      if (editingId === null) {
        const response = await api.post(
          "/instruments",
          payload
        );

        const createdInstrument = response.data;

        // Save newly created instrument ID
        setCreatedInstrumentId(createdInstrument.id);

        // Close Add Instrument form
        setShowModal(false);

        // Reset form
        setEditingId(null);
        setForm(initialForm);

        // Refresh instruments
        await fetchInstruments();

        // Show success popup
        setShowSuccessModal(true);
      }

      // ----------------------------------------------
      // UPDATE
      // ----------------------------------------------

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

      {/* Header */}
      <div className="max-w-7xl mx-auto">

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

        {/* Already Existing Instrument Guidance */}

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

                          <button
                            onClick={() =>
                              handleEdit(instrument)
                            }
                            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                          >
                            Edit
                          </button>

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

