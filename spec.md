# Specification

## Summary
**Goal:** Add an `app-ads.txt` file served as a static public asset at `/app-ads.txt` for Google AdMob verification.

**Planned changes:**
- Create `frontend/public/app-ads.txt` with the exact content: `google.com, pub-7936595519986908, DIRECT, f08c47fec0942fa0`

**User-visible outcome:** Navigating to `https://fruitverse-kaz.caffeine.xyz/app-ads.txt` returns the correct plain-text AdMob verification content, enabling Google AdMob to verify the app's publisher ID.
