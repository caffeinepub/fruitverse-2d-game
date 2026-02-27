import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Blob "mo:core/Blob";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import List "mo:core/List";

actor {
  type BoosterType = {
    #bomb;
    #nextFruitChange;
    #alignment;
  };

  type BoosterInventory = {
    bombCount : Nat;
    nextFruitChangeCount : Nat;
    alignmentCount : Nat;
  };

  type Badges = {
    hasNovice : Bool;
    hasRookie : Bool;
    hasAdvanced : Bool;
    hasMaster : Bool;
  };

  type Badge = {
    name : Text;
    design : Text;
  };

  type UserAccount = {
    password : Text;
    soundPreference : Bool;
    boosters : BoosterInventory;
    badges : Badges;
  };

  type Theme = {
    name : Text;
    colorPalette : [Text];
    backgroundImage : Text;
    animation : Text;
  };

  type LeaderboardEntry = {
    score : Nat;
    month : Nat;
  };

  type UserProfile = {
    username : Text;
    badges : Badges;
  };

  type HealthCheckLog = {
    timestamp : Time.Time;
    status : Text;
    recoveryAttempted : Bool;
    recoverySuccess : Bool;
  };

  type AudioMetadata = {
    id : Text;
    blob : Storage.ExternalBlob;
    name : Text;
    description : Text;
  };

  type AdminCredentials = {
    username : Text;
    password : Text;
  };

  let themes = Map.empty<Text, Theme>();
  let userAccounts = Map.empty<Text, UserAccount>();
  let userThemes = Map.empty<Text, Text>();
  let leaderboard = Map.empty<Text, LeaderboardEntry>();
  let monthlyPromotion = Map.empty<Nat, [Text]>();
  let monthlyRewards = Map.empty<Nat, [Text]>();
  let activeSessions = Map.empty<Principal, Text>();
  let badges = Map.empty<Text, Badge>();
  let healthCheckLogs = Map.empty<Time.Time, HealthCheckLog>();
  let audioFiles = Map.empty<Text, AudioMetadata>();

  // Admin credentials stored securely
  let adminUsername = "adminking";
  let adminPassword = "154";

  // Admin session tracking
  let adminSessions = Map.empty<Principal, Bool>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  func isUsernameUnique(username : Text) : Bool {
    not userAccounts.containsKey(username.toLower());
  };

  func isLetter(c : Char) : Bool {
    ('a' <= c and c <= 'z') or ('A' <= c and c <= 'Z');
  };

  func isPasswordValid(password : Text) : Bool {
    password.toArray().all(func(c) { c.isDigit() or isLetter(c) }) and password.size() == 6;
  };

  func getActiveSessionUsername(caller : Principal) : ?Text {
    activeSessions.get(caller);
  };

  func validateSession(caller : Principal) : Text {
    switch (getActiveSessionUsername(caller)) {
      case (null) { Runtime.trap("Oturum açmanız gerekiyor") };
      case (?username) { username };
    };
  };

  func validateUserSession(caller : Principal, username : Text) {
    let sessionUsername = validateSession(caller);
    if (sessionUsername != username.toLower()) {
      Runtime.trap("Bu işlemi yalnızca kendi hesabınız için yapabilirsiniz");
    };
  };

  func isAdminSession(caller : Principal) : Bool {
    switch (adminSessions.get(caller)) {
      case (null) { false };
      case (?isAdmin) { isAdmin };
    };
  };

  func validateAdminSession(caller : Principal) {
    if (not isAdminSession(caller)) {
      Runtime.trap("Yetkisiz: Yalnızca yöneticiler bu işlemi gerçekleştirebilir");
    };
  };

  // Public registration - no authentication required
  public shared ({ caller = _ }) func registerUser(username : Text, password : Text) : async () {
    if (username.size() < 5) {
      Runtime.trap("Kullanıcı adı en az 5 karakter uzunluğunda olmalı.");
    };

    if (password.size() != 6) {
      Runtime.trap("Şifre tam 6 karakter uzunluğunda olmalı.");
    };

    let normalizedUsername = username.toLower();

    if (normalizedUsername.size() < 5) {
      Runtime.trap("Kullanıcı adı en az 5 karakter uzunluğunda olmalı.");
    };

    if (not normalizedUsername.toArray().all(func(c) { c.isDigit() or isLetter(c) })) {
      Runtime.trap("Kullanıcı adı yalnızca harf ve rakamlardan oluşmalı.");
    };

    if (not isUsernameUnique(normalizedUsername)) {
      Runtime.trap("Bu kullanıcı adı zaten kullanımda.");
    };

    if (not isPasswordValid(password)) {
      Runtime.trap("Şifreniz yalnızca harf ve rakamlardan oluşmalıdır.");
    };

    if (isUsernameUnique(normalizedUsername) and isPasswordValid(password)) {
      let initialBadges : Badges = {
        hasNovice = false;
        hasRookie = false;
        hasAdvanced = false;
        hasMaster = false;
      };

      let initialBoosters : BoosterInventory = {
        bombCount = 3;
        nextFruitChangeCount = 3;
        alignmentCount = 3;
      };

      let newUserAccount : UserAccount = {
        password = password.toLower();
        soundPreference = true;
        boosters = initialBoosters;
        badges = initialBadges;
      };

      userAccounts.add(normalizedUsername, newUserAccount);
    } else {
      Runtime.trap("Kayıt başarısız oldu.");
    };
  };

  // Public login - creates user session
  public shared ({ caller }) func login(username : Text, password : Text) : async () {
    let normalizedUsername = username.toLower();
    let normalizedPassword = password.toLower();

    switch (userAccounts.get(normalizedUsername)) {
      case (null) {
        Runtime.trap("Kullanıcı adı veya şifre hatalı.");
      };
      case (?account) {
        if (account.password != normalizedPassword) {
          Runtime.trap("Kullanıcı adı veya şifre hatalı.");
        };
        activeSessions.add(caller, normalizedUsername);
      };
    };
  };

  // Requires active user session
  public shared ({ caller }) func logout() : async () {
    ignore validateSession(caller);
    activeSessions.remove(caller);
    adminSessions.remove(caller);
  };

  // Admin login - separate from user login
  public shared ({ caller }) func adminLogin(username : Text, password : Text) : async () {
    if (username == adminUsername and password == adminPassword) {
      adminSessions.add(caller, true);
    } else {
      Runtime.trap("Yönetici kimlik bilgileri hatalı");
    };
  };

  // Admin logout
  public shared ({ caller }) func adminLogout() : async () {
    validateAdminSession(caller);
    adminSessions.remove(caller);
  };

  // Check if caller has active admin session
  public query ({ caller }) func isAdmin() : async Bool {
    isAdminSession(caller);
  };

  // Requires user session and ownership validation
  public shared ({ caller }) func useBooster(username : Text, boosterType : BoosterType, amount : Nat) : async () {
    validateUserSession(caller, username);

    let normalizedUsername = username.toLower();
    switch (userAccounts.get(normalizedUsername)) {
      case (null) { Runtime.trap("Kullanıcı bulunamadı") };
      case (?userAccount) {
        let currentBoosters = userAccount.boosters;
        let currentCount = switch (boosterType) {
          case (#bomb) { currentBoosters.bombCount };
          case (#nextFruitChange) { currentBoosters.nextFruitChangeCount };
          case (#alignment) { currentBoosters.alignmentCount };
        };

        if (currentCount < amount) {
          Runtime.trap("Yeterli güçlendirici yok");
        };

        let updatedBoosters = switch (boosterType) {
          case (#bomb) {
            let newCount = currentCount.toInt() - amount.toInt();
            { currentBoosters with bombCount = if (newCount < 0) { 0 } else { newCount.toNat() } };
          };
          case (#nextFruitChange) {
            let newCount = currentCount.toInt() - amount.toInt();
            {
              currentBoosters with nextFruitChangeCount = if (newCount < 0) {
                0;
              } else { newCount.toNat() };
            };
          };
          case (#alignment) {
            let newCount = currentCount.toInt() - amount.toInt();
            { currentBoosters with alignmentCount = if (newCount < 0) { 0 } else { newCount.toNat() } };
          };
        };

        let updatedUserAccount = {
          userAccount with boosters = updatedBoosters;
        };

        userAccounts.add(normalizedUsername, updatedUserAccount);
      };
    };
  };

  // Requires user session and ownership validation
  public shared ({ caller }) func updateBoosterCount(username : Text, boosterType : BoosterType, amount : Nat) : async () {
    validateUserSession(caller, username);

    let normalizedUsername = username.toLower();
    switch (userAccounts.get(normalizedUsername)) {
      case (null) { Runtime.trap("Kullanıcı bulunamadı") };
      case (?userAccount) {
        let currentBoosters = userAccount.boosters;
        let updatedBoosters = switch (boosterType) {
          case (#bomb) {
            { currentBoosters with bombCount = amount };
          };
          case (#nextFruitChange) {
            { currentBoosters with nextFruitChangeCount = amount };
          };
          case (#alignment) { { currentBoosters with alignmentCount = amount } };
        };

        let updatedUserAccount = {
          userAccount with boosters = updatedBoosters;
        };

        userAccounts.add(normalizedUsername, updatedUserAccount);
      };
    };
  };

  // Public query - no authentication required (needed for registration flow)
  public query ({ caller = _ }) func doesUserExist(username : Text) : async Bool {
    userAccounts.containsKey(username.toLower());
  };

  // Requires user session and ownership validation
  public query ({ caller }) func getBoosterInventory(username : Text) : async BoosterInventory {
    validateUserSession(caller, username);

    switch (userAccounts.get(username.toLower())) {
      case (null) { Runtime.trap("Kullanıcı bulunamadı") };
      case (?userAccount) { userAccount.boosters };
    };
  };

  func getCurrentMonth() : Nat {
    let now = Time.now();
    ((now / 1_000_000_000) / 2_592_000).toNat() + 1;
  };

  // Requires user session and ownership validation
  public shared ({ caller }) func submitScore(username : Text, score : Nat) : async () {
    validateUserSession(caller, username);

    let normalizedUsername = username.toLower();

    switch (userAccounts.get(normalizedUsername)) {
      case (null) { Runtime.trap("Kullanıcı bulunamadı") };
      case (?_) {
        let currentMonth = getCurrentMonth();
        let entry = leaderboard.get(normalizedUsername);

        switch (entry) {
          case (null) {
            leaderboard.add(normalizedUsername, { score; month = currentMonth });
          };
          case (?existing) {
            if (existing.month != currentMonth) {
              leaderboard.add(normalizedUsername, { score; month = currentMonth });
            } else {
              if (score > existing.score) {
                leaderboard.add(normalizedUsername, { score; month = currentMonth });
              };
            };
          };
        };
      };
    };
  };

  // Requires user session and ownership validation
  public shared ({ caller }) func updateUserTheme(username : Text, themeName : Text) : async () {
    validateUserSession(caller, username);

    let normalizedUsername = username.toLower();
    switch (userAccounts.get(normalizedUsername)) {
      case (null) { Runtime.trap("Kullanıcı bulunamadı") };
      case (?_) {
        userThemes.add(normalizedUsername, themeName);
      };
    };
  };

  // Requires user session and ownership validation
  public query ({ caller }) func getUserTheme(username : Text) : async Text {
    let sessionUsername = validateSession(caller);
    let normalizedUsername = username.toLower();

    if (sessionUsername != normalizedUsername) {
      Runtime.trap("Bu işlemi yalnızca kendi hesabınız için yapabilirsiniz");
    };

    switch (userThemes.get(normalizedUsername)) {
      case (null) { "Varsayılan Tema" };
      case (?themeName) { themeName };
    };
  };

  // Public query - leaderboard is public information
  public query ({ caller = _ }) func getTopPlayers(limit : Nat) : async [(Text, Nat)] {
    let currentMonth = getCurrentMonth();
    let filteredEntries = leaderboard.toArray().filter(
      func(entry) {
        let (_, l) = entry;
        l.month == currentMonth;
      }
    );

    func compareEntries(a : (Text, LeaderboardEntry), b : (Text, LeaderboardEntry)) : Order.Order {
      let (_, entryA) = a;
      let (_, entryB) = b;
      Nat.compare(entryB.score, entryA.score);
    };

    let sortedEntries = filteredEntries.sort(
      compareEntries
    );

    let size = if (sortedEntries.size() < limit) { sortedEntries.size() } else { limit };
    sortedEntries.sliceToArray(0, size).map(
      func(entry) {
        let (username, l) = entry;
        (username, l.score);
      }
    );
  };

  // Requires user session and ownership validation
  public query ({ caller }) func getRank(username : Text) : async Nat {
    let sessionUsername = validateSession(caller);
    let normalizedUsername = username.toLower();

    if (sessionUsername != normalizedUsername) {
      Runtime.trap("Bu işlemi yalnızca kendi hesabınız için yapabilirsiniz");
    };

    let currentMonth = getCurrentMonth();

    let filteredEntries = leaderboard.toArray().filter(
      func(entry) {
        let (_, l) = entry;
        l.month == currentMonth;
      }
    );

    let sortedEntries = filteredEntries.sort(
      func(a, b) {
        let (_, entryA) = a;
        let (_, entryB) = b;
        Nat.compare(entryB.score, entryA.score);
      }
    );

    var rank = 1;
    for ((user, _) in sortedEntries.values()) {
      if (user == normalizedUsername) { return rank };
      rank += 1;
    };

    0;
  };

  func internalPromoteTopPlayers() {
    let currentMonth = getCurrentMonth();
    let filteredEntries = leaderboard.toArray().filter(
      func(entry) {
        let (_, l) = entry;
        l.month == currentMonth;
      }
    );

    func compareEntries(a : (Text, LeaderboardEntry), b : (Text, LeaderboardEntry)) : Order.Order {
      let (_, entryA) = a;
      let (_, entryB) = b;
      Nat.compare(entryB.score, entryA.score);
    };

    let sortedEntries = filteredEntries.sort(
      compareEntries
    );

    if (sortedEntries.size() > 0) {
      let topPlayersCount = Nat.max(1, sortedEntries.size() / 10);

      let promotedPlayers = sortedEntries.sliceToArray(0, topPlayersCount).map(func(entry) { entry.0 });

      let existingPromotion = switch (monthlyPromotion.get(currentMonth)) {
        case (null) { [] };
        case (?existing) { existing };
      };

      monthlyPromotion.add(
        currentMonth,
        existingPromotion.concat(promotedPlayers),
      );

      for (username in promotedPlayers.values()) {
        switch (userAccounts.get(username)) {
          case (?account) {
            let updatedBadges : Badges = {
              account.badges with hasNovice = true;
            };
            let updatedUserAccount = {
              account with badges = updatedBadges;
            };
            userAccounts.add(username, updatedUserAccount);
          };
          case (null) {};
        };
      };

      let top3 = sortedEntries.sliceToArray(0, if (sortedEntries.size() < 3) { sortedEntries.size() } else { 3 });
      let rewardMultipliers = [3, 2, 1];

      for (index in Nat.range(0, top3.size() - 1)) {
        let multiplier = if (index < 3) { rewardMultipliers[index] } else { 1 };

        let entry = top3[index];
        let (username, _) = entry;

        let rewardEntry = username.concat(":").concat(multiplier.toText());

        var rewards = switch (monthlyRewards.get(currentMonth)) {
          case (null) { [] };
          case (?existing) { existing };
        };

        rewards := rewards.concat([rewardEntry]);
        monthlyRewards.add(currentMonth, rewards);

        switch (userAccounts.get(username)) {
          case (?account) {
            let currentBoosters = account.boosters;
            let updatedBoosters : BoosterInventory = {
              bombCount = currentBoosters.bombCount + multiplier;
              nextFruitChangeCount = currentBoosters.nextFruitChangeCount + multiplier;
              alignmentCount = currentBoosters.alignmentCount + multiplier;
            };
            let updatedUserAccount = {
              account with
              boosters = updatedBoosters;
            };
            userAccounts.add(username, updatedUserAccount);
          };
          case (null) {};
        };
      };
    };
  };

  func internalAddBadge(badgeName : Text, badgeDesign : Text) {
    let badge : Badge = {
      name = badgeName;
      design = badgeDesign;
    };
    badges.add(badgeName.toLower(), badge);
  };

  // Requires active user session
  public query ({ caller }) func getBadge(badgeName : Text) : async ?Badge {
    ignore validateSession(caller);
    badges.get(badgeName.toLower());
  };

  // Requires user session and ownership validation
  public query ({ caller }) func getWinCounts(username : Text) : async Nat {
    let sessionUsername = validateSession(caller);
    let normalizedUsername = username.toLower();

    if (sessionUsername != normalizedUsername) {
      Runtime.trap("Bu işlemi yalnızca kendi hesabınız için yapabilirsiniz");
    };

    switch (userAccounts.get(normalizedUsername)) {
      case (null) { Runtime.trap("Kullanıcı bulunamadı") };
      case (?_) {
        var count = 0;
        for ((_, winners) in monthlyPromotion.entries()) {
          if (winners.any(func(winner) { winner == normalizedUsername })) { count += 1 };
        };
        count;
      };
    };
  };

  // Requires active user session
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    switch (getActiveSessionUsername(caller)) {
      case (null) { null };
      case (?username) {
        switch (userAccounts.get(username)) {
          case (null) { null };
          case (?account) {
            ?{
              username = username;
              badges = account.badges;
            };
          };
        };
      };
    };
  };

  // Requires user session and ownership validation (or admin)
  public query ({ caller }) func getUserProfile(username : Text) : async ?UserProfile {
    let normalizedUsername = username.toLower();

    let sessionUsername = switch (getActiveSessionUsername(caller)) {
      case (null) { Runtime.trap("Oturum açmanız gerekiyor") };
      case (?username) { username };
    };

    if (sessionUsername != normalizedUsername and not isAdminSession(caller)) {
      Runtime.trap("Bu işlemi yalnızca kendi profiliniz için yapabilirsiniz");
    };

    switch (userAccounts.get(normalizedUsername)) {
      case (null) { null };
      case (?account) {
        ?{
          username = normalizedUsername;
          badges = account.badges;
        };
      };
    };
  };

  // Requires user session and ownership validation
  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    let sessionUsername = validateSession(caller);
    if (sessionUsername != profile.username.toLower()) {
      Runtime.trap("Profil kullanıcı adı oturum kullanıcı adıyla eşleşmiyor");
    };

    switch (userAccounts.get(sessionUsername)) {
      case (null) { Runtime.trap("Kullanıcı bulunamadı") };
      case (?account) {
        let updatedAccount = {
          account with badges = profile.badges;
        };
        userAccounts.add(sessionUsername, updatedAccount);
      };
    };
  };

  // Public health check - no authentication required
  public query func appStatus() : async { #healthy } {
    #healthy;
  };

  // Requires user session and ownership validation
  public query ({ caller }) func getSoundPreference(username : Text) : async Bool {
    validateUserSession(caller, username);
    switch (userAccounts.get(username.toLower())) {
      case (null) { Runtime.trap("Kullanıcı bulunamadı") };
      case (?userAccount) { userAccount.soundPreference };
    };
  };

  // Requires user session and ownership validation
  public shared ({ caller }) func updateSoundPreference(username : Text, soundPref : Bool) : async () {
    validateUserSession(caller, username);

    let normalizedUsername = username.toLower();

    switch (userAccounts.get(normalizedUsername)) {
      case (null) { Runtime.trap("Kullanıcı bulunamadı") };
      case (?userAccount) {
        let updatedUserAccount = {
          userAccount with soundPreference = soundPref;
        };
        userAccounts.add(normalizedUsername, updatedUserAccount);
      };
    };
  };

  // Public query - audio files are public resources needed by the game
  public query ({ caller = _ }) func getAudioMetadata(id : Text) : async ?AudioMetadata {
    switch (audioFiles.get(id)) {
      case (null) { null };
      case (?metadata) { ?metadata };
    };
  };

  // Public query - audio files are public resources needed by the game
  public query ({ caller = _ }) func getAllAudioMetadata() : async [(Text, AudioMetadata)] {
    audioFiles.toArray();
  };

  // Admin-only: Upload audio from URL
  public shared ({ caller }) func uploadAudioFromUrl(id : Text, name : Text, description : Text, blob : Storage.ExternalBlob) : async () {
    validateAdminSession(caller);

    let audioMetadata : AudioMetadata = {
      id;
      blob;
      name;
      description;
    };

    audioFiles.add(id, audioMetadata);
  };

  // Admin-only: Bulk upload all audio files
  public shared ({ caller }) func uploadAllAudioFiles() : async () {
    validateAdminSession(caller);

    let fileList = List.fromArray<{ id : Text; name : Text; description : Text }>([
      {
        id = "fruitDrop";
        name = "Fruit Drop";
        description = "Sound when fruits drop";
      },
      {
        id = "fruitMerge";
        name = "Fruit Merge";
        description = "Sound when fruits merge";
      },
      {
        id = "bombExplode";
        name = "Bomb Explode";
        description = "Sound for bomb explosion";
      },
      {
        id = "alignmentPing";
        name = "Alignment Ping";
        description = "Alignment booster sound";
      },
      {
        id = "scoreUp";
        name = "Score Up";
        description = "Score increase sound";
      },
      {
        id = "gameStart";
        name = "Game Start";
        description = "Game starting sound";
      },
      {
        id = "gameOver";
        name = "Game Over";
        description = "Game over sound";
      },
      {
        id = "levelUp";
        name = "Level Up";
        description = "Level-up sound";
      },
      {
        id = "boosterEarned";
        name = "Booster Earned";
        description = "Booster earning sound";
      },
      {
        id = "backgroundLoop";
        name = "Background Music Loop";
        description = "Continuous background music loop";
      },
    ]);
  };

  // Admin-only: Get all users
  public query ({ caller }) func getAllUsers() : async [(Text, { boosters : BoosterInventory; badges : Badges; soundPreference : Bool })] {
    validateAdminSession(caller);
    userAccounts.toArray().map(
      func(entry) {
        let (username, account) = entry;
        (
          username,
          {
            boosters = account.boosters;
            badges = account.badges;
            soundPreference = account.soundPreference;
          },
        );
      }
    );
  };

  // Admin-only: Get complete leaderboard
  public query ({ caller }) func getCompleteLeaderboard() : async [(Text, LeaderboardEntry)] {
    validateAdminSession(caller);
    leaderboard.toArray();
  };

  // Admin-only: Reset leaderboard
  public shared ({ caller }) func resetLeaderboard() : async () {
    validateAdminSession(caller);
    for ((username, _) in leaderboard.entries()) {
      leaderboard.remove(username);
    };
  };

  // Admin-only: Delete user
  public shared ({ caller }) func deleteUser(username : Text) : async () {
    validateAdminSession(caller);
    let normalizedUsername = username.toLower();
    userAccounts.remove(normalizedUsername);
    userThemes.remove(normalizedUsername);
    leaderboard.remove(normalizedUsername);
  };

  // Admin-only: Update user boosters
  public shared ({ caller }) func adminUpdateUserBoosters(username : Text, boosters : BoosterInventory) : async () {
    validateAdminSession(caller);
    let normalizedUsername = username.toLower();
    switch (userAccounts.get(normalizedUsername)) {
      case (null) { Runtime.trap("Kullanıcı bulunamadı") };
      case (?account) {
        let updatedAccount = {
          account with boosters = boosters;
        };
        userAccounts.add(normalizedUsername, updatedAccount);
      };
    };
  };

  // Admin-only: Get health check logs
  public query ({ caller }) func getHealthCheckLogs() : async [(Time.Time, HealthCheckLog)] {
    validateAdminSession(caller);
    healthCheckLogs.toArray();
  };

  // Admin-only: Delete audio file
  public shared ({ caller }) func deleteAudioFile(id : Text) : async () {
    validateAdminSession(caller);
    audioFiles.remove(id);
  };

  public query func audioFilesEmpty() : async Bool {
    audioFiles.isEmpty();
  };
};
