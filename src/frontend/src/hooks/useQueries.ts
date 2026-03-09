import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AudioMetadata,
  type BoosterType,
  ExternalBlob,
  UserProfile,
} from "../backend";
import { useActor } from "./useActor";

interface RegisterUserParams {
  username: string;
  password: string;
}

interface LoginUserParams {
  username: string;
  password: string;
}

interface AdminLoginParams {
  username: string;
  password: string;
}

interface UseBoosterParams {
  username: string;
  boosterType: BoosterType;
  amount: bigint;
}

interface UpdateBoosterCountParams {
  username: string;
  boosterType: BoosterType;
  amount: bigint;
}

interface SubmitScoreParams {
  username: string;
  score: number;
}

interface UpdateSoundPreferenceParams {
  username: string;
  soundPref: boolean;
}

interface UploadAudioFromUrlParams {
  id: string;
  name: string;
  description: string;
  url: string;
}

export function useRegisterUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, password }: RegisterUserParams) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.registerUser(username, password);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["boosterInventory", variables.username.toLowerCase()],
      });
    },
  });
}

export function useLoginUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, password }: LoginUserParams) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.login(username, password);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["boosterInventory", variables.username.toLowerCase()],
      });
    },
  });
}

export function useAdminLogin() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ username, password }: AdminLoginParams) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.adminLogin(username, password);
    },
  });
}

export function useCheckUserExists(username: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["userExists", username],
    queryFn: async () => {
      if (!actor) return false;
      return actor.doesUserExist(username);
    },
    enabled: !!actor && !isFetching && username.length > 0,
  });
}

export function useGetBoosterInventory(username: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["boosterInventory", username.toLowerCase()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getBoosterInventory(username);
    },
    enabled: !!actor && !isFetching && username.length > 0,
    staleTime: 3000,
    refetchInterval: 5000,
  });
}

export function useUseBooster() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, boosterType, amount }: UseBoosterParams) => {
      if (!actor) throw new Error("Actor not initialized");
      // biome-ignore lint/correctness/useHookAtTopLevel: false positive - actor method, not a hook
      await actor.useBooster(username, boosterType, amount);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["boosterInventory", variables.username.toLowerCase()],
      });
    },
  });
}

export function useUpdateBoosterCount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      username,
      boosterType,
      amount,
    }: UpdateBoosterCountParams) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.updateBoosterCount(username, boosterType, amount);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["boosterInventory", variables.username.toLowerCase()],
      });
    },
  });
}

export function useSubmitScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, score }: SubmitScoreParams) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.submitScore(username, BigInt(score));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topPlayers"] });
      queryClient.invalidateQueries({ queryKey: ["userRank"] });
      queryClient.invalidateQueries({ queryKey: ["userProfiles"] });
    },
  });
}

export function useGetTopPlayers(limit = 10) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["topPlayers", limit],
    queryFn: async () => {
      if (!actor) return [];
      const players = await actor.getTopPlayers(BigInt(limit));
      return players.map(([username, score]) => ({
        username,
        score: Number(score),
      }));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUserRank(username: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["userRank", username],
    queryFn: async () => {
      if (!actor) return 0;
      const rank = await actor.getRank(username);
      return Number(rank);
    },
    enabled: !!actor && !isFetching && username.length > 0,
  });
}

export function useGetUserProfile(username: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["userProfile", username],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getUserProfile(username);
    },
    enabled: !!actor && !isFetching && username.length > 0,
  });
}

export function useGetUserProfiles(usernames: string[]) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["userProfiles", usernames],
    queryFn: async () => {
      if (!actor) return [];
      const profiles = await Promise.all(
        usernames.map(async (username) => {
          const profile = await actor.getUserProfile(username);
          return { username, profile };
        }),
      );
      return profiles;
    },
    enabled: !!actor && !isFetching && usernames.length > 0,
  });
}

export function useBackendHealthCheck() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["backendHealth"],
    queryFn: async () => {
      if (!actor) return { status: "disconnected", timestamp: Date.now() };
      try {
        const status = await actor.appStatus();
        return {
          status: status === "healthy" ? "healthy" : "unknown",
          timestamp: Date.now(),
        };
      } catch (error) {
        console.error("Health check failed:", error);
        return { status: "error", timestamp: Date.now(), error: String(error) };
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 5000,
  });
}

export function useGetSoundPreference(username: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["soundPreference", username.toLowerCase()],
    queryFn: async () => {
      if (!actor) return true;
      try {
        return await actor.getSoundPreference(username);
      } catch (error) {
        console.error("Failed to fetch sound preference:", error);
        return true;
      }
    },
    enabled: !!actor && !isFetching && username.length > 0,
  });
}

export function useUpdateSoundPreference() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      username,
      soundPref,
    }: UpdateSoundPreferenceParams) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.updateSoundPreference(username, soundPref);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["soundPreference", variables.username.toLowerCase()],
      });
    },
  });
}

export function useGetAllAudioMetadata() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["allAudioMetadata"],
    queryFn: async () => {
      if (!actor) return [];
      const audioData = await actor.getAllAudioMetadata();
      return audioData;
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useGetAudioMetadata(id: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["audioMetadata", id],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getAudioMetadata(id);
    },
    enabled: !!actor && !isFetching && id.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useUploadAudioFromUrl() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      url,
    }: UploadAudioFromUrlParams) => {
      if (!actor) throw new Error("Actor not initialized");

      const blob = ExternalBlob.fromURL(url);
      await actor.uploadAudioFromUrl(id, name, description, blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAudioMetadata"] });
    },
  });
}

export function useGetHighScore(username: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["highScore", username.toLowerCase()],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getHighScore(username);
    },
    enabled: !!actor && !isFetching && username.length > 0,
    staleTime: 5000,
  });
}

interface CheckDailyLoginParams {
  username: string;
}

export function useCheckDailyLogin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username }: CheckDailyLoginParams) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.checkDailyLogin(username);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyStreak"] });
    },
  });
}

interface UpdateAvatarParams {
  username: string;
  avatarId: string;
}

export function useUpdateAvatar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, avatarId }: UpdateAvatarParams) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.updateAvatar(username, avatarId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["userAvatar", variables.username.toLowerCase()],
      });
    },
  });
}

export function useGetAvatar(username: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["userAvatar", username.toLowerCase()],
    queryFn: async () => {
      if (!actor) return "🍎";
      try {
        return await actor.getAvatar(username);
      } catch {
        return "🍎";
      }
    },
    enabled: !!actor && !isFetching && username.length > 0,
    staleTime: 30000,
  });
}

interface BanUserParams {
  username: string;
}

export function useBanUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username }: BanUserParams) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.banUser(username);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    },
  });
}

export function useUnbanUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username }: BanUserParams) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.unbanUser(username);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    },
  });
}

export function useGetAllUsers() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !isFetching,
    staleTime: 10000,
  });
}

export function useDeleteOwnAccount() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ username }: { username: string }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.deleteOwnAccount(username);
    },
  });
}
