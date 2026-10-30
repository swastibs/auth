import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { habitsApi } from "../api/habits.api.js";

export const habitKeys = {
  all: ["habits"],
  list: (filters = {}) => [...habitKeys.all, "list", filters],
  detail: (habitId) => [...habitKeys.all, "detail", habitId],
  stats: () => [...habitKeys.all, "stats"],
};

export function useHabits(filters = {}) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: habitKeys.list(filters),
    queryFn: () => habitsApi.list(filters),
  });

  const statsQuery = useQuery({
    queryKey: habitKeys.stats(),
    queryFn: () => habitsApi.stats(),
  });

  const invalidateHabitQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: habitKeys.all }),
    ]);
  };

  const createHabitMutation = useMutation({
    mutationFn: habitsApi.create,
    onSuccess: async () => {
      toast.success("Habit created.");
      await invalidateHabitQueries();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to create habit.");
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: ({ habitId, updates }) => habitsApi.update(habitId, updates),
    onSuccess: async () => {
      toast.success("Habit updated.");
      await invalidateHabitQueries();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to update habit.");
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: habitsApi.remove,
    onSuccess: async () => {
      toast.success("Habit removed.");
      await invalidateHabitQueries();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to delete habit.");
    },
  });

  const checkInMutation = useMutation({
    mutationFn: ({ habitId, note }) => habitsApi.checkIn(habitId, note),
    onSuccess: async () => {
      toast.success("Habit check-in saved.");
      await invalidateHabitQueries();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to check in.");
    },
  });

  const undoCheckInMutation = useMutation({
    mutationFn: habitsApi.undoCheckIn,
    onSuccess: async () => {
      toast.success("Check-in undone.");
      await invalidateHabitQueries();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to undo check-in.");
    },
  });

  return {
    habits: listQuery.data?.habits ?? [],
    pagination: listQuery.data?.pagination ?? {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    },
    stats: statsQuery.data ?? null,
    isLoading: listQuery.isLoading || statsQuery.isLoading,
    error: listQuery.error || statsQuery.error,
    createHabit: createHabitMutation.mutateAsync,
    updateHabit: updateHabitMutation.mutateAsync,
    deleteHabit: deleteHabitMutation.mutateAsync,
    checkIn: checkInMutation.mutateAsync,
    undoCheckIn: undoCheckInMutation.mutateAsync,
  };
}

export function useHabit(habitId) {
  return useQuery({
    queryKey: habitKeys.detail(habitId),
    queryFn: () => habitsApi.get(habitId),
    enabled: Boolean(habitId),
    select: (data) => data?.habit ?? data ?? null,
  });
}

export default useHabits;
