import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Gauge,
  Pencil,
  Trash2,
  RefreshCw,
  X,
} from "lucide-react";
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

interface InstrumentForm {
  serialNumber: string;
  manufacturer: string;
  model: string;
  instrumentClass: string;
  capacity: string;
  scaleInterval: string;
  minCapacity: string;
  status: string;
}

const initialForm: InstrumentForm = {
  serialNumber: "",
  manufacturer: "",
  model: "",
  instrumentClass: "III",
  capacity: "",
  scaleInterval: "",
  minCapacity: "",
  status: "ACTIVE",
};

function Instruments() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState<InstrumentForm>(initialForm);

  const [editingId, setEditingId] = useState<number | null>(null);

  // Fetch instruments
  const fetchInstruments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/instruments");

      setInstruments(response.data);
    } catch (error) {
      console.error(error);
      setError("Unable to load instruments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstruments();
  }, []);

  // Search
  const filteredInstruments = instruments.filter((instrument) =>
    `${instrument.serialNumber} ${instrument.manufacturer} ${instrument.model}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Form input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Open Add modal
  const openAddModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setMessage("");
    setError("");
    setShowModal(true);
  };

  // Open Edit modal
  const openEditModal = (instrument: Instrument) => {
    setEditingId(instrument.id);

    setForm({
      serialNumber: instrument.serialNumber,
      manufacturer: instrument.manufacturer,
      model: instrument.model,
      instrumentClass: instrument.instrumentClass,
      capacity: String(instrument.capacity),
      scaleInterval: String(instrument.scaleInterval),
      minCapacity: String(instrument.minCapacity),
      status: instrument.status,
    });

    setMessage("");
    setError("");
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingId(null);
    setForm(initialForm);
  };

  // Create / Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        serialNumber: form.serialNumber.trim(),
        manufacturer: form.manufacturer.trim(),
        model: form.model.trim(),
        instrumentClass: form.instrumentClass,
        capacity: Number(form.capacity),
        scaleInterval: Number(form.scaleInterval),
        minCapacity: Number(form.minCapacity),
        status: form.status,
      };

      if (
        !payload.serialNumber ||
        !payload.manufacturer ||
        !payload.model
      ) {
        setError("Please fill all required fields.");
        return;
      }

      if (
        payload.capacity <= 0 ||
        payload.scaleInterval <= 0 ||
        payload.minCapacity < 0
      ) {
        setError("Please enter valid capacity values.");
        return;
      }

      if (editingId === null) {
        await api.post("/instruments", payload);

        setMessage("Instrument created successfully.");
      } else {
        await api.put(`/instruments/${editingId}`, payload);

        setMessage("Instrument updated successfully.");
      }

      setShowModal(false);
      setEditingId(null);
      setForm(initialForm);

      await fetchInstruments();
    } catch (error: any) {
      console.error(error);

      const backendMessage =
        error?.response?.data?.message ||
        "Unable to save instrument.";

      setError(backendMessage);
    } finally {
      setSaving(false);
    }
  };

  // Delete
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

      setMessage("Instrument deleted successfully.");

      await fetchInstruments();
    } catch (error: any) {
      console.error(error);

      const backendMessage =
        error?.response?.data?.message ||
        "Unable to delete instrument.";

      setError(backendMessage);
    }
  };

  return (
    <div className="p-6 lg:p-8">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

        <div>
          <p className="text-sm text-slate-500">
            Equipment Management
          </p>

          <h1 className="text-2xl font-bold text-slate-900">
            Weighing Instruments
          </h1>

          <p className="text-slate-500 mt-1">
            Manage registered non-automatic weighing instruments.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition shadow-sm"
        >
          <Plus size={19} />
          Add Instrument
        </button>

      </div>

      {/* Messages */}
      {message && (
        <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
          {message}
        </div>
      )}

      {error && !showModal && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Instruments
          </p>

          <p className="text-3xl font-bold text-slate-900 mt-2">
            {instruments.length}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Active
          </p>

          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {
              instruments.filter(
                (instrument) => instrument.status === "ACTIVE"
              ).length
            }
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Inactive
          </p>

          <p className="text-3xl font-bold text-red-600 mt-2">
            {
              instruments.filter(
                (instrument) => instrument.status !== "ACTIVE"
              ).length
            }
          </p>
        </div>

      </div>

      {/* Instruments Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Search */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row gap-3">

          <div className="relative flex-1">

            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search by serial number, manufacturer or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          <button
            onClick={fetchInstruments}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            <RefreshCw size={18} />
            Refresh
          </button>

        </div>

        {/* Loading */}
        {loading ? (
          <div className="p-10 text-center text-slate-500">
            Loading instruments...
          </div>
        ) : filteredInstruments.length === 0 ? (

          <div className="p-12 text-center">

            <Gauge
              size={40}
              className="mx-auto text-slate-300 mb-3"
            />

            <p className="font-medium text-slate-700">
              No instruments found
            </p>

            <p className="text-sm text-slate-400 mt-1">
              Try changing your search or add a new instrument.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="bg-slate-50 border-b border-slate-200">

                <tr>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">
                    Instrument
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">
                    Manufacturer
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">
                    Class
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">
                    Capacity
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">
                    Scale Interval
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">
                    Status
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredInstruments.map((instrument) => (

                  <tr
                    key={instrument.id}
                    className="hover:bg-slate-50 transition"
                  >

                    <td className="px-5 py-5">

                      <div className="flex items-center gap-3">

                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Gauge size={19} />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {instrument.model}
                          </p>

                          <p className="text-xs text-slate-500">
                            S/N: {instrument.serialNumber}
                          </p>
                        </div>

                      </div>

                    </td>

                    <td className="px-5 py-5 text-sm text-slate-600">
                      {instrument.manufacturer}
                    </td>

                    <td className="px-5 py-5">

                      <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">
                        Class {instrument.instrumentClass}
                      </span>

                    </td>

                    <td className="px-5 py-5 text-sm text-slate-600">
                      {instrument.capacity} kg
                    </td>

                    <td className="px-5 py-5 text-sm text-slate-600">
                      {instrument.scaleInterval} kg
                    </td>

                    <td className="px-5 py-5">

                      {instrument.status === "ACTIVE" ? (

                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">

                          <span className="w-2 h-2 rounded-full bg-emerald-500" />

                          ACTIVE

                        </span>

                      ) : (

                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">

                          <span className="w-2 h-2 rounded-full bg-red-500" />

                          {instrument.status}

                        </span>

                      )}

                    </td>

                    <td className="px-5 py-5">

                      <div className="flex items-center gap-2">

                        <button
                          onClick={() => openEditModal(instrument)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition"
                          title="Edit"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => handleDelete(instrument.id)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* Add / Edit Modal */}
      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* Background */}
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">

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
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={20} />
              </button>

            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit}>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Serial Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Serial Number *
                  </label>

                  <input
                    name="serialNumber"
                    value={form.serialNumber}
                    onChange={handleChange}
                    placeholder="SM-NAWI-002"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Manufacturer */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Manufacturer *
                  </label>

                  <input
                    name="manufacturer"
                    value={form.manufacturer}
                    onChange={handleChange}
                    placeholder="SmartMetrix"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Model *
                  </label>

                  <input
                    name="model"
                    value={form.model}
                    onChange={handleChange}
                    placeholder="SM-200"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Class */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Instrument Class *
                  </label>

                  <select
                    name="instrumentClass"
                    value={form.instrumentClass}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="I">Class I</option>
                    <option value="II">Class II</option>
                    <option value="III">Class III</option>
                    <option value="IIII">Class IIII</option>
                  </select>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Capacity (kg) *
                  </label>

                  <input
                    type="number"
                    step="any"
                    name="capacity"
                    value={form.capacity}
                    onChange={handleChange}
                    placeholder="100"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Scale Interval */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Scale Interval (e) *
                  </label>

                  <input
                    type="number"
                    step="any"
                    name="scaleInterval"
                    value={form.scaleInterval}
                    onChange={handleChange}
                    placeholder="0.01"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Min Capacity */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Minimum Capacity (kg) *
                  </label>

                  <input
                    type="number"
                    step="any"
                    name="minCapacity"
                    value={form.minCapacity}
                    onChange={handleChange}
                    placeholder="0.2"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

              </div>

              {/* Modal Error */}
              {error && (
                <div className="mx-6 mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Footer */}
              <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId === null
                    ? "Create Instrument"
                    : "Update Instrument"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Instruments;