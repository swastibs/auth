import axiosInstance from "./axios.js";

const unwrapData = (response) => response?.data?.data ?? response?.data ?? null;

export const habitsApi = {
  async list(filters = {}) {
    const params = {
      page: 1,
      limit: 20,
      archived: false,
      ...filters,
    };

    const response = await axiosInstance.get("/habits", { params });
    const payload = unwrapData(response) ?? {};

    return {
      habits: Array.isArray(payload.habits) ? payload.habits : [],
      pagination: payload.pagination ?? {
        page: params.page,
        limit: params.limit,
        total: 0,
        totalPages: 1,
      },
    };
  },

  async get(habitId) {
    const response = await axiosInstance.get(`/habits/${habitId}`);
    const payload = unwrapData(response) ?? {};
    return payload.habit ? { ...payload, habit: payload.habit } : payload;
  },

  async create(habitInput) {
    const response = await axiosInstance.post("/habits", habitInput);
    const payload = unwrapData(response) ?? {};
    return payload.habit ?? payload;
  },

  async update(habitId, updates) {
    const response = await axiosInstance.patch(`/habits/${habitId}`, updates);
    const payload = unwrapData(response) ?? {};
    return payload.habit ?? payload;
  },

  async remove(habitId) {
    const response = await axiosInstance.delete(`/habits/${habitId}`);
    return response.status === 204 ? true : unwrapData(response) ?? true;
  },

  async checkIn(habitId, note = "") {
    const response = await axiosInstance.post(`/habits/${habitId}/check-in`, { note });
    const payload = unwrapData(response) ?? {};
    return payload;
  },

  async undoCheckIn(habitId) {
    const response = await axiosInstance.delete(`/habits/${habitId}/check-in`);
    const payload = unwrapData(response) ?? {};
    return payload;
  },

  async history(habitId, days = 30) {
    const response = await axiosInstance.get(`/habits/${habitId}/history`, {
      params: { days },
    });
    return unwrapData(response) ?? {};
  },

  async stats() {
    const response = await axiosInstance.get("/habits/stats");
    const payload = unwrapData(response) ?? {};
    return payload.stats ?? payload;
  },
};

export default habitsApi;
