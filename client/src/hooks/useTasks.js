import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { tasksApi } from "../api/tasks.api.js";

export const taskKeys = {
  all: ["tasks"],
  list: (filters = {}) => [...taskKeys.all, "list", filters],
  detail: (taskId) => [...taskKeys.all, "detail", taskId],
  stats: () => [...taskKeys.all, "stats"],
};

export function useTasks(filters = {}) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => tasksApi.list(filters),
    enabled: true,
  });

  const statsQuery = useQuery({
    queryKey: taskKeys.stats(),
    queryFn: () => tasksApi.stats(),
  });

  const invalidateTaskQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: taskKeys.all }),
    ]);
  };

  const createTaskMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: async () => {
      toast.success("Task created.");
      await invalidateTaskQueries();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to create task.");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }) => tasksApi.update(taskId, updates),
    onSuccess: async () => {
      toast.success("Task updated.");
      await invalidateTaskQueries();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to update task.");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: tasksApi.remove,
    onSuccess: async () => {
      toast.success("Task removed.");
      await invalidateTaskQueries();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to delete task.");
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: tasksApi.complete,
    onSuccess: async () => {
      toast.success("Task completed.");
      await invalidateTaskQueries();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to complete task.");
    },
  });

  const reopenTaskMutation = useMutation({
    mutationFn: tasksApi.reopen,
    onSuccess: async () => {
      toast.success("Task reopened.");
      await invalidateTaskQueries();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to reopen task.");
    },
  });

  return {
    tasks: listQuery.data?.tasks ?? [],
    pagination: listQuery.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
    stats: statsQuery.data ?? null,
    isLoading: listQuery.isLoading || statsQuery.isLoading,
    isFetching: listQuery.isFetching || statsQuery.isFetching,
    error: listQuery.error || statsQuery.error,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    completeTask: completeTaskMutation.mutateAsync,
    reopenTask: reopenTaskMutation.mutateAsync,
  };
}

export function useTask(taskId) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => tasksApi.get(taskId),
    enabled: Boolean(taskId),
    select: (data) => data?.task ?? data ?? null,
  });
}

export default useTasks;
