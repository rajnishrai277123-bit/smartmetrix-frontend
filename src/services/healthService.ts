import api from "./api";

export const getInstrumentHealth = async (instrumentId: number) => {
  const response = await api.get(
    `/instruments/${instrumentId}/health`
  );

  console.log("Instrument Health:", response.data);

  return response.data;
};