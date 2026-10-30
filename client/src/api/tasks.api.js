import axiosInstance from "./axios.js";

const unwrapData = (response) => response?.data?.data ?? response?.data ?? null;

export const tasksApi = {
  async list(filters = {}) {
    const params = {
      page: 1,
      limit: 20,
      ...filters,
    };

    const response = await axiosInstance.get("/tasks", { params });
    const payload = unwrapData(response) ?? {};

    return {
      tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
      pagination: payload.pagination ?? {
        page: params.page,
        limit: params.limit,
        total: 0,
        totalPages: 1,
      },
    };
  },

  async get(taskId) {
    const response = await axiosInstance.get(`/tasks/${taskId}`);
    const payload = unwrapData(response) ?? {};
    return payload.task ?? payload;
  },

  async create(taskInput) {
    const response = await axiosInstance.post("/tasks", taskInput);
    const payload = unwrapData(response) ?? {};
    return payload.task ?? payload;
  },

  async update(taskId, updates) {
    const response = await axiosInstance.patch(`/tasks/${taskId}`, updates);
    const payload = unwrapData(response) ?? {};
    return payload.task ?? payload;
  },

  async remove(taskId) {
    const response = await axiosInstance.delete(`/tasks/${taskId}`);
    return response.status === 204 ? true : unwrapData(response) ?? true;
  },

  async complete(taskId) {
    const response = await axiosInstance.post(`/tasks/${taskId}/complete`);
    const payload = unwrapData(response) ?? {};
    return payload;
  },

  async reopen(taskId) {
    const response = await axiosInstance.post(`/tasks/${taskId}/reopen`);
    const payload = unwrapData(response) ?? {};
    return payload;
  },

  async stats() {
    const response = await axiosInstance.get("/tasks/stats");
    const payload = unwrapData(response) ?? {};
    return payload.stats ?? payload;
  },
};

export default tasksApi;
