# FruitVerse

## Current State
Backend canister zaman zaman "stopped" hatasıyla kapanıyor (`IC0508`). Bu, kullanıcı kayıt, giriş, skor kayıt ve diğer tüm backend işlevlerini kırıyor. Frontend'de mevcut sağlık kontrolü 30 saniyede bir `appStatus` çağrısı yapıyor, ancak yeniden bağlanma mantığı yeterince güçlü değil.

## Requested Changes (Diff)

### Add
- Backend Motoko koduna `system func heartbeat()` ekle -- canister aktif kaldığı sürece belirli aralıklarla otomatik ping atarak uyanık kalmasını destekler.
- `useActor` hook'una canister bağlantı durumunu izleyen daha sağlam retry mekanizması.
- Frontend'e `BackendStatusBanner` bileşeni: backend çevrimdışıyken kullanıcıya görünür, otomatik yeniden bağlanma denemesi sayacı gösteren bir banner.
- `useBackendReconnect` hook'u: exponential backoff (2s → 4s → 8s → 16s → max 60s) ile arka planda otomatik yeniden bağlanma.

### Modify
- `useBackendHealthCheck` hook'unu daha sık kontrol eder hale getir (30s → 10s), hata durumunda daha hızlı retry.
- `LoginPage` ve `GamePage`'e backend offline banner entegre et.

### Remove
- Yok

## Implementation Plan
1. `main.mo`'ya `system func heartbeat()` ekle -- her heartbeat'te basit bir log kaydı veya boş işlem yaparak canister'ı uyanık tutar.
2. `useQueries.ts`'teki `useBackendHealthCheck`'i iyileştir: refetchInterval 10s, retry 5, retryDelay exponential.
3. `BackendStatusBanner.tsx` bileşeni oluştur: `useBackendHealthCheck` hook'unu dinle, backend `error` veya `disconnected` ise ekranda otomatik geri sayım + yeniden bağlanma butonu göster.
4. `App.tsx`'e `BackendStatusBanner` entegre et, tüm sayfalarda görünür olsun.
