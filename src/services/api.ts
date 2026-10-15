
import axios from "axios";

const api = axios.create({
  baseURL: "https://smartmetrix-backend-mf17.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Get health data for one instrument
export const getInstrumentHealth = async (instrumentId: number) => {
  const response = await api.get(`/instruments/${instrumentId}/health`);
  return response.data;
};

// Get health data for all instruments
export const getAllInstrumentHealth = async () => {
  const response = await api.get("/instruments/health");
  return response.data;
};

export default api;
