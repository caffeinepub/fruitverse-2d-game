import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface LeaderboardEntry {
    month: bigint;
    score: bigint;
}
export interface Badges {
    hasRookie: boolean;
    hasAdvanced: boolean;
    hasNovice: boolean;
    hasMaster: boolean;
}
export type Time = bigint;
export interface AudioMetadata {
    id: string;
    blob: ExternalBlob;
    name: string;
    description: string;
}
export interface HealthCheckLog {
    status: string;
    recoveryAttempted: boolean;
    recoverySuccess: boolean;
    timestamp: Time;
}
export interface Badge {
    name: string;
    design: string;
}
export interface BoosterInventory {
    alignmentCount: bigint;
    bombCount: bigint;
    nextFruitChangeCount: bigint;
}
export interface UserProfile {
    username: string;
    badges: Badges;
}
export enum BoosterType {
    bomb = "bomb",
    nextFruitChange = "nextFruitChange",
    alignment = "alignment"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_healthy {
    healthy = "healthy"
}
export interface backendInterface {
    adminLogin(username: string, password: string): Promise<void>;
    adminLogout(): Promise<void>;
    adminUpdateUserBoosters(username: string, boosters: BoosterInventory): Promise<void>;
    appStatus(): Promise<Variant_healthy>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    audioFilesEmpty(): Promise<boolean>;
    banUser(username: string): Promise<void>;
    checkDailyLogin(username: string): Promise<bigint>;
    deleteAudioFile(id: string): Promise<void>;
    deleteOwnAccount(username: string): Promise<void>;
    deleteUser(username: string): Promise<void>;
    doesUserExist(username: string): Promise<boolean>;
    getAllAudioMetadata(): Promise<Array<[string, AudioMetadata]>>;
    getAllUsers(): Promise<Array<[string, {
            soundPreference: boolean;
            badges: Badges;
            highScore: bigint;
            isBanned: boolean;
            avatarId: string;
            boosters: BoosterInventory;
        }]>>;
    getAudioMetadata(id: string): Promise<AudioMetadata | null>;
    getAvatar(username: string): Promise<string>;
    getBadge(badgeName: string): Promise<Badge | null>;
    getBoosterInventory(username: string): Promise<BoosterInventory>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCompleteLeaderboard(): Promise<Array<[string, LeaderboardEntry]>>;
    getHealthCheckLogs(): Promise<Array<[Time, HealthCheckLog]>>;
    getHighScore(username: string): Promise<bigint>;
    getRank(username: string): Promise<bigint>;
    getSoundPreference(username: string): Promise<boolean>;
    getTopPlayers(limit: bigint): Promise<Array<[string, bigint]>>;
    getUserProfile(username: string): Promise<UserProfile | null>;
    getUserTheme(username: string): Promise<string>;
    getWinCounts(username: string): Promise<bigint>;
    isAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    login(username: string, password: string): Promise<void>;
    logout(): Promise<void>;
    registerUser(username: string, password: string): Promise<void>;
    resetLeaderboard(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitScore(username: string, score: bigint): Promise<void>;
    unbanUser(username: string): Promise<void>;
    updateAvatar(username: string, avatarId: string): Promise<void>;
    updateBoosterCount(username: string, boosterType: BoosterType, amount: bigint): Promise<void>;
    updateSoundPreference(username: string, soundPref: boolean): Promise<void>;
    updateUserTheme(username: string, themeName: string): Promise<void>;
    uploadAllAudioFiles(): Promise<void>;
    uploadAudioFromUrl(id: string, name: string, description: string, blob: ExternalBlob): Promise<void>;
    useBooster(username: string, boosterType: BoosterType, amount: bigint): Promise<void>;
}
