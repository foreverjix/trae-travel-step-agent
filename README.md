# LeLing Travel (乐龄出行)

**AI voice-driven one-stop travel guardian for elderly users — a WeChat Mini Program.**

> **Demo notice**: This is a demo project, built end-to-end with [Trae](https://www.trae.cn/) (the AI-native IDE), submitted to the [TRAE AI Creativity Contest](https://www.trae.cn/ai-creativity) — Social Good track. Third-party API calls fall back to mock data without keys, so the demo runs out of the box.

Speak a destination, get a complete trip plan; the whole journey is monitored, narrated aloud, and guarded by AI. No typing, no menus, no learning curve.

---

## 1. About This Project

I am an undergraduate student and independent developer. Most of my work is about finding real pain points in everyday life and shipping lightweight AI products around them — user research first, then front-end architecture, intent recognition, and anomaly-detection algorithms.

**LeLing Travel** started from what I kept seeing on long-distance trips: older travelers locked out of digital mobility. I once watched a woman wait 40 minutes for a ride outside a high-speed rail station, while the young man next to her got one in two minutes. Smart mobility is spreading fast, but for many seniors it has quietly built a wall.

So I built this: a **zero-learning-cost, safety-first, voice-powered** travel tool that treats elderly users as first-class citizens — not as an accessibility afterthought.

Everything you see here — architecture, UI, the VAD engine, the ranking algorithm, the safety agents — was designed and implemented end-to-end in Trae, with the AI engineer handling code generation, debugging, and iteration while I drove product decisions.

## 2. What It Does & Who It Serves

LeLing Travel targets five core pain points: hard to operate, hard to travel, too many apps to switch between, high learning cost, no companion, no safety net. It integrates **rail tickets, ride-hailing, and public transit** into one closed loop of AI planning, minimal interaction, family guardianship, and volunteer-based offline fallback.

| User group | Needs |
|---|---|
| **Seniors 50+** (primary) | Simplified large-text UI, voice-only operation, high-frequency scenarios: solo medical visits, returning home by train, township-to-city travel |
| **Adult children 25–45** (secondary) | Remote assistance, real-time location monitoring, anomaly alerts for parents traveling alone |

## 3. Key Features

### 3.1 Voice-first, senior-first UI

Large fonts, high contrast, zero ads, zero decoration. Interaction is built around speech instead of taps: Baidu ASR + TTS across the whole app, a tuned recognition pipeline that tolerates dialects and accents, and a one-sentence trip builder — the senior says "I want to visit my grandson in Nanjing tomorrow" and a full itinerary comes back. No typing, no multi-level menus.

### 3.2 "Tap once, keep talking" conversation engine

The signature interaction. Tap the floating orb once and it behaves like a phone call:

- Speech is captured continuously; a 1.2 s pause auto-submits it for recognition
- The AI reply is spoken via TTS, then the app returns to listening after 0.6 s — no repeated tapping until the user taps again to end the session
- Senior-friendly affordances: a large red **"Done speaking"** button, a breathing animation that shows "I'm listening", result cards that stay on screen

Under the hood is a self-built **frame-level VAD**: real-time RMS energy on 16-bit PCM frames, with a triple condition (silence threshold 55, minimum speech 500 ms, 600 ms consecutive silence to stop). A **600 ms grace period** after recording starts skips detection so the TTS tail is never mistaken for the user talking again — this fixed the "had to say it twice" bug.

### 3.3 Online intelligence + offline fallback

Ride-hailing coverage is thin in townships and remote areas, so the app plans multimodal routes (walk / bus / subway / rail / ride-hailing) online via the full AMap API suite — geocoding, POI search, transit planning, real-time data — ranked by a self-implemented **entropy-weight + TOPSIS** multi-criteria algorithm across price, duration, and comfort. Offline, a community volunteer assistance system (architecture + demo done, community rollout planned) covers the last mile where online supply fails.

### 3.4 Two-layer AI safety alerts

A hybrid local-rules + AI-Agent architecture:

- **Layer 1, local rule engine** — route deviation > 500 m, stationary > 15 min, safety ratio < 1.2, arrival after 22:00. Millisecond response, works fully offline; triggers instant default alert text + vibration
- **Layer 2, Qwen Agent** — runs in parallel with structured context (deviation distance, traveler profile, remaining buffer time) and rewrites the alert into something human: "Your father is 523 m off the route, he may have taken a wrong turn. A phone call is recommended."
- **Guardrails** — AI output only overrides the default text when `confidence ≥ 0.7`; on failure or timeout it falls back to the local text. Alerts render instantly from rules, then refresh asynchronously when AI answers

Network dies? Rules still guard. Network lives? Alerts read like a family member wrote them.

### 3.5 Real-time visual navigation

For "I can't read the signs / can't find my gate" moments in stations:

- The senior raises the phone; every 3 s a frame is sent to **qwen-vl-max**, which reasons about the scene *together with the trip context* (train number, gate, seat, departure time) and returns four-part spoken guidance — *what I see → where to go → where the target is → what to watch out for* — played via Baidu TTS
- Unlike OCR, which only reads text off signs, the vision model understands spatial layout ("waiting hall, security check on the left, elevator ahead-right") and fuses it with the itinerary ("Gate 12 is 50 m on your right")
- Graceful failure: blurry frame → "turn your phone slowly" + auto retry; network timeout → fall back to GPS map navigation; non-station scenes → best-effort direction hints
- A single-shot **"snap & ask"** mode for weak networks: photo in, large-type answer card out (40 rpx+ font), with "read it again" and "show me on the map" buttons

### 3.6 Full-scenario voice assistant

- **Elderly-speech NLP pipeline** (self-built, four layers): duplicate-word removal → filler-word removal → word-order correction → entity extraction, turning vague speech into structured trip intents
- **Multi-turn clarification with Qwen**: when the request is ambiguous ("I have a hospital appointment tomorrow"), the AI asks back ("The provincial people's hospital again? Morning or afternoon?") instead of repeating "please say it again"
- **Step-by-step voice guidance** for the whole journey ("Next, enter through Gate 2 North of Taiyuan South Station"), with louder volume and repeat playback in noisy environments
- **Doubao end-to-end realtime voice** with barge-in: the senior can interrupt the AI mid-sentence, get an answer, and the narration continues — no walkie-talkie-style turn taking

### 3.7 Flat information architecture, one tap to everything

No nested menus anywhere. High-frequency scenarios (hospital, homecoming, commute) sit directly on the home page as cards; after booking, a floating card with today's trip summary (train, departure, seat) stays on the home page and narrates progress en route. Booking, ride-hailing, SOS, and guardianship are all single-tap. A global recorder singleton mutex guarantees the home mic and the AI assistant never fight over the recorder.

### 3.8 Iteration highlights (round 2)

- **Tech**: Baidu ASR/TTS, AMap travel APIs, Qwen (text + vision), Doubao realtime voice; dual-layer AI + local NLP parsing; entropy-weight + TOPSIS ranking; trip-connection safety verification model
- **Features**: VAD continuous-conversation engine (echo-proof grace period + frame-level energy state machine + auto-resume loop); five-level degradation for weak networks; two-layer safety-alert agent
- **UX**: dozens of polish rounds; fill-then-correct POI strategy for zero-latency voice form filling; multi-level fuzzy station matching for cross-city queries; palette moved from warm orange to a calm blue-white scheme

## 4. Feature Overview

| Module | Description |
|---|---|
| Voice travel | Tap once and keep talking; AI plans the route |
| Ride-hailing | One-tap ride for urban, township, and remote areas |
| Ticketing | Train & coach ticket search and booking |
| Trip monitoring | Real-time progress tracking and departure reminders |
| AI safety alerts | Local rules + AI agent anomaly detection |
| Visual navigation | First-person live guidance / snap & ask |
| SOS | One-tap emergency contacts, 110 / 120 dialing |
| Volunteer help | Nearby volunteers for accompaniment and station pickup |
| Care points | Seniors earn points for accepted help, redeemable rewards |
| Family remote assist | Children view parents' location, book on their behalf, monitor trips |

---

## 5. Getting Started

### 5.1 Requirements

- [WeChat DevTools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) (stable 1.06+)
- WeChat 8.0+

### 5.2 AppID

The project ships with AppID `wx15d63b4104db72a8`. To use your own, change `appid` in `project.config.json`.

### 5.3 Domain whitelist

Request domains must be registered in the WeChat admin console (**mp.weixin.qq.com → Development → Development Settings → Server Domains**):

```
https://restapi.amap.com        # AMap (geocoding, POI, routing)
https://aip.baidubce.com        # Baidu voice (ASR + TTS)
https://dashscope.aliyuncs.com  # Alibaba DashScope (Qwen text + vision)
```

> In DevTools you can check "Do not verify legal domains" for local debugging.

### 5.4 API keys

All keys live in **`config/api.js`**. The repo ships with every key **blanked out** — never commit real keys to a public repo.

**Step 1 — Apply for keys**

| Field | Provider | Console | Notes |
|---|---|---|---|
| `AMAP_KEY` | AMap Open Platform | [console.amap.com](https://console.amap.com) | Choose **"Web端 (JS API)"** key type |
| `BAIDU_ASR_API_KEY` + `BAIDU_ASR_SECRET_KEY` | Baidu AI Cloud | [console.bce.baidu.com](https://console.bce.baidu.com) | Create an app under "Speech Technology" with **ASR (1537 Mandarin)** and **TTS** enabled |
| `DASHSCOPE_API_KEY` | Alibaba DashScope | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com) | Create an API key under "API-KEY Management" |

**Step 2 — Where each key is consumed**

`AMAP_KEY` — [services/amap-service.js](services/amap-service.js): geocoding, reverse geocoding, POI text/around search, transit/driving/walking routing, bus & subway queries; [services/travel.js](services/travel.js): POI matching + ride distance estimates.

`BAIDU_ASR_*` — [services/baidu-asr.js](services/baidu-asr.js): token + PCM speech recognition (home mic, voice input on ticket/ride pages); [services/baidu-tts.js](services/baidu-tts.js): token + text-to-speech (trip narration, AI replies, SOS alerts). Also proxied through `cloudfunctions/asr-proxy`.

`DASHSCOPE_API_KEY` — [services/ai-service.js](services/ai-service.js): entity extraction, itinerary candidate generation, safety-alert second pass; [services/travel.js](services/travel.js): narration copy generation; [services/vision-service.js](services/vision-service.js): qwen-vl-max visual navigation.

**Step 3 — Fill in `config/api.js`**

```javascript
module.exports = {
  AMAP_KEY: '',
  AMAP_GEOCODE: 'https://restapi.amap.com/v3/geocode/geo',
  AMAP_TRANSIT: 'https://restapi.amap.com/v3/direction/transit/integrated',
  BAIDU_ASR_API_KEY: '',
  BAIDU_ASR_SECRET_KEY: '',
  DASHSCOPE_API_KEY: '',
  MINI_PROGRAMS: {
    TRAIN_12306: 'wx79b6c2f37a00f5c3',
    AMAP: 'wx5597bf2c7d4c5c5c'
  }
}
```

**Step 4 — Verify**

1. **AMap**: trip monitor page shows a real place name instead of raw coordinates
2. **ASR**: hold the home mic, speak, and text appears
3. **TTS**: floating trip card → "play narration" produces audio
4. **DashScope**: say "I want to go to Nanjing tomorrow" and the AI fills date + destination correctly

Everything still works without keys — the app degrades to mock data (see [Degradation](#12-graceful-degradation)).

---

## 6. Run the Project

1. DevTools → **Import Project** → select the `Dream` folder
2. Pick your AppID (or a test AppID)
3. Click **Compile** — `lazyCodeLoading: "requiredComponents"` is already configured
4. Test in the simulator: home (location, voice), tickets, ride-hailing, trip monitor, SOS

## 7. Release a Trial Version

1. DevTools → **Upload**, set a version number
2. WeChat admin console → **Management → Version Settings** → set as trial version
3. **Members → Experience Members** → add testers by WeChat ID; they scan the QR code (up to 90 testers, no review needed)

## 8. Demo Flows

```
Voice travel : Home → hold mic → "I'm going to the provincial hospital"
             → AI recognizes → route planned → options displayed

Ride-hailing : Ride page → auto locate → set destination
             → fare estimate → call → driver accepts → live progress

Ticketing    : Ticket page → train/coach → cities + date → search
             → pick train & seat class → add passenger → booked

SOS          : SOS page → one-tap 110/120 or emergency contact
             → share location → pick emergency type → help sent

Family assist: Home → switch to child mode → parent's location & trips
             → book remotely → live monitoring
```

## 9. Project Structure

```
Dream/
├── app.js                    # Mini program entry
├── app.json                  # Global config
├── app.wxss                  # Global styles
├── config/
│   └── api.js                # API keys (fill in your own)
├── services/
│   ├── amap-service.js       # AMap suite wrapper
│   ├── ai-service.js         # Qwen text AI (entities, plans, alerts)
│   ├── vision-service.js     # qwen-vl-max visual navigation
│   ├── baidu-asr.js          # Baidu speech recognition
│   ├── baidu-tts.js          # Baidu speech synthesis
│   ├── doubao-realtime.js    # Doubao realtime voice
│   ├── ranking.js            # Entropy-weight + TOPSIS ranking
│   ├── travel.js             # Trip planning service
│   └── db-service.js         # Cloud DB access
├── cloudfunctions/
│   ├── asr-proxy/            # Baidu ASR proxy (keys stay server-side)
│   ├── agent-proxy/          # Qwen agent proxy
│   ├── train-search/         # Train ticket search
│   ├── parent-location/      # Parent location upload
│   └── init-data/            # DB bootstrap
├── components/
│   ├── custom-tabbar/        # Custom bottom navigation
│   ├── float-island/         # Floating trip card
│   └── ai-assistant/         # Voice AI assistant
├── pages/
│   ├── index/                # Home (senior side)
│   ├── agent/                # AI assistant page
│   ├── vision-live/          # Live visual navigation
│   ├── vision-guide/         # Snap & ask navigation
│   ├── map-trip/             # Route planning
│   ├── ticket/               # Ticketing
│   ├── taxi/                 # Ride-hailing
│   ├── trip-monitor/         # Trip monitoring
│   ├── child/                # Family (child) side
│   ├── volunteer/            # Volunteer system
│   └── sos/                  # Emergency help
└── images/                   # Icons
```

## 10. Tech Stack

| Tech | Usage |
|---|---|
| WeChat Mini Program | Native framework, on-demand code injection |
| Direct API calls | Third-party services called via `wx.request` / cloud function proxies |
| AMap API | Geocoding, POI, transit/driving/walking routing |
| Baidu Voice | ASR + TTS |
| Qwen (DashScope) | NLU, itinerary planning, safety alerts, visual navigation |
| Doubao Realtime Voice | Barge-in, end-to-end speech conversations |
| Self-built algorithms | Entropy-weight + TOPSIS, frame-level VAD, elderly-speech NLP pipeline |
| Local storage | Profiles, orders, trip records |

## 11. Graceful Degradation

Without any API keys the app still runs end-to-end:

| Feature | Full mode | Degraded mode |
|---|---|---|
| Location | AMap live GPS | Simulated coordinates |
| Geocoding | AMap reverse geocoding | Local coordinate mapping |
| Speech recognition | Baidu ASR | Manual text input |
| AI planning | Qwen | Local rule-based suggestions |
| Visual navigation | qwen-vl-max scene understanding | GPS map navigation |
| Route search | AMap live data | Mock data |

Degradation is automatic — no manual switching.

## 12. Notes

1. Register request domains before release, or API calls fail online
2. Location and microphone permissions must be granted on first use
3. Network required for API features
4. Free API tiers are quota-limited; buy capacity for production
5. Declare location-data usage in the mini program's privacy guide
6. **Never commit real API keys to a public repo**

## 13. FAQ

**Q: Pages report `request:fail`.**
A: Register the request domains, or check "do not verify legal domains" in DevTools.

**Q: Speech recognition does nothing.**
A: Grant microphone permission; check the Baidu keys in `config/api.js`; check network.

**Q: Location is inaccurate.**
A: GPS is weak indoors; re-grant precise location permission in settings.

**Q: AI planning hangs.**
A: Verify `DASHSCOPE_API_KEY`; the app falls back to local suggestions when keys are absent.

**Q: How do I check whether an API call succeeded?**
A: Open the DevTools **Console** and look for success/degradation logs.

---

*LeLing Travel — because getting from A to B should never require a manual.*
