import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  Gauge,
  Loader2,
  RefreshCw,
  Scale,
  Wifi,
} from "lucide-react";
import api from "../services/api";

type Reading = {
  weight: number;
  stable: boolean;
  source: string;
};

export default function VirtualWeighingMachine() {
  const [referenceWeight, setReferenceWeight] = useState("10");
  const [scaleInterval, setScaleInterval] = useState("0.01");
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const readWeight = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        `/hardware/read?referenceWeight=${Number(
          referenceWeight
        )}&scaleInterval=${Number(scaleInterval)}`
      );

      setReading(response.data);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Unable to communicate with virtual weighing machine."
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setReading(null);
    setError("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Hardware Simulation
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
            Virtual Weighing Machine
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Simulate NAWI readings without physical weighing-machine hardware.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
          <Wifi size={16} />
          Virtual Device Online
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Machine */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Scale size={24} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  SmartMetrix Virtual Scale
                </h2>
                <p className="text-xs text-slate-500">
                  Digital NAWI simulator
                </p>
              </div>
            </div>

            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
              ACTIVE
            </span>
          </div>

          {/* Display */}
          <div className="mt-8 rounded-3xl border-4 border-slate-800 bg-slate-950 p-8 text-center shadow-inner">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
              Current Weight
            </p>

            <div className="mt-5 font-mono text-5xl font-black tracking-wider text-white md:text-7xl">
              {reading ? reading.weight.toFixed(2) : "0.00"}
              <span className="ml-3 text-2xl text-slate-400">kg</span>
            </div>

            <div className="mt-6 flex justify-center">
              {reading?.stable ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm font-bold text-green-400">
                  <CheckCircle2 size={17} />
                  STABLE
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-400">
                  WAITING FOR STABLE READING
                </span>
              )}
            </div>
          </div>

          {/* Device info */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Device</p>
              <p className="mt-1 font-bold text-slate-800">VIRTUAL_SCALE</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Interval</p>
              <p className="mt-1 font-bold text-slate-800">
                {scaleInterval} kg
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Reference</p>
              <p className="mt-1 font-bold text-slate-800">
                {referenceWeight} kg
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Status</p>
              <p className="mt-1 font-bold text-green-600">CONNECTED</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
              <Gauge size={21} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">Machine Controls</h2>
              <p className="text-xs text-slate-500">
                Configure virtual reading
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Reference Weight
              </label>

              <input
                type="number"
                step="any"
                value={referenceWeight}
                onChange={(e) => setReferenceWeight(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Scale Interval (e)
              </label>

              <input
                type="number"
                step="any"
                value={scaleInterval}
                onChange={(e) => setScaleInterval(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <button
              onClick={readWeight}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Reading...
                </>
              ) : (
                <>
                  <Activity size={18} />
                  Read Weight
                </>
              )}
            </button>

            <button
              onClick={reset}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={17} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Research note */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-sm font-bold text-blue-900">
          Research Prototype
        </p>

        <p className="mt-1 text-sm leading-6 text-blue-800">
          This virtual device simulates measurement acquisition for the
          laptop-only prototype. A future hardware adapter can replace this
          layer without changing the inspection workflow.
        </p>
      </div>
    </div>
  );
}