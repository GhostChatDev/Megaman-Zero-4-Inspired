# Nighttail: The Blackthorn Gate — Web Game & Design Plans

> **Current playable web build (`index.html`):** **Nighttail · The Blackthorn Gate**, a single-file HTML5 Canvas 2D action-platformer starring **Rook**, a monkey courier fighting past the Blackthorn Gate guardian (**CARAPACE-IX**) and across an 8-stage relay campaign + final stage.
>
> **Companion design docs in this repository:**
> - [`nighttail.md`](nighttail.md) — Nighttail gothic action-platformer direction, palette, Act I stages, combat kit, and boss encounters.
> - Below: original *Ruin Core* iOS SpriteKit specification kept for reference.

## Playable Web Milestone (`index.html`)

Open `index.html` in a modern browser to play. Saves stay in that browser on the same origin.

Rook, a monkey courier, enters Blackthorn fortress looking for his missing sister Mira.  
Its bells have stolen the voices of nearby villages, and the Hollow Crown plans to use them at midnight.  
To free those voices, Rook must silence the fortress itself.  
Nighttail: The Blackthorn Gate

- **Opening stage:** **NIGHTTAIL — THE BLACKTHORN GATE** opens at Blackthorn fortress, where Rook faces CARAPACE-IX. The current visuals combine a dark fortress backdrop with the existing sci-fi platformer art.
- **Controls:**
  - **Keyboard:** `A`/`D` or Left/Right to move, `Up`/`Space`/`Z` to jump & double-jump, `J`/`X` to slash, `K`/`V` to hold/release ranged bolt, `C`/`Shift` to dash, `Q` for equipped skill, `E` for ultimate, `B` for workshop, `P`/`Esc` to pause.
  - **Touch:** Lower-left virtual joystick and lower-right action cluster (`JUMP`, `SLASH`, `DASH`, `BOLT`, `SKILL`, `ULT`).
  - **Gamepad:** Standard mapping supported.
- **Game feel & accessibility:**
  - Enemy and boss attacks use warning indicators.
  - The game pauses when the window loses focus or the tab is hidden.
  - Settings include volume, touch controls, screen shake and flashes, and difficulty (`Story`, `Hard`, `Nightmare`). Settings and campaign progress are stored locally in the browser; clearing browser data removes them.
- **Current scope:** Nine playable stages, three selectable heroes, upgrades, sound effects and music. The attached prompt's ten levels and branching story choices are not yet implemented; the later stages retain sci-fi art alongside the Nighttail story.

---

# Ruin Core — Five-Step Game Build Plan (Reference Spec)

> Working title. Build a landscape, single-player action-platformer and tower-defense game inspired by the supplied gameplay reference.

**Status:** Specification only. This README does not claim that gameplay, assets, or tests already exist.

## 1. Project Goal

Create a complete, playable iPhone and iPad game where an agile hero defends a power core from ten waves of robots arriving through a portal. Players jump between platforms, attack enemies, collect scrap, and build defensive turrets.

The reference image is the visual target, not an existing playable implementation. Match its readable composition, layered ruins, cyan technology, expressive characters, and clear touch controls using original or properly licensed assets.

### Assumptions

- Platform: iOS/iPadOS 17 or later, landscape orientation.
- Toolchain: Xcode 16 or later with Swift 6 language mode.
- Rendering and physics: SpriteKit.
- Menus and application shell: SwiftUI.
- Local preferences and small save data: Foundation Codable and UserDefaults.
- No multiplayer, backend, accounts, ads, or purchases in the initial release.
- Work through Steps 1–5 in order. Each step must pass its acceptance checklist before the next begins.

## 2. Reference Image

Save the supplied reference image in this repository as `Docs/Images/gameplay-reference.png`. This is a proposed path; the file must be added separately.

### Screen Layout

| Area | Reference target |
| --- | --- |
| Top left | Hero portrait, health bar, energy bar |
| Top center | Current wave out of ten and power-core health |
| Top right | Scrap counter and pause button |
| Far left | Glowing cyan power core that must survive |
| Center | Main walkway, raised platforms, and hero combat space |
| Build points | Clearly marked holographic pads on the ground and raised platforms |
| Far right | Enemy portal |
| Bottom left | Virtual movement control |
| Bottom center | Three turret purchase buttons with prices |
| Bottom right | Jump, dash, and attack buttons |
| Background | Ancient stone ruins, vegetation, distant cliffs, and waterfalls |

Keep UI inside device safe areas. The reference is a composition guide: adapt spacing to iPhone and iPad instead of stretching the entire image.

## 3. Core Gameplay

### Core Loop

1. Prepare defenses during a short build phase.
2. Start the next wave manually or allow the countdown to finish.
3. Fight enemies while turrets automatically defend their lanes.
4. Collect scrap from defeated enemies.
5. Repair the core, add defenses, or upgrade existing turrets.
6. Complete wave ten with the core alive to win.

### First 30 Seconds

- Show one unobtrusive instruction at a time: move, jump, attack, then build.
- Begin with enough scrap to purchase the basic cannon.
- Introduce two slow ground enemies before presenting flying enemies.
- Make hits, scrap rewards, and the first turret shot immediately readable.
- Do not require a long tutorial or account creation.

### Controls

- Left virtual control: horizontal movement; vertical input is reserved for future features.
- Jump: jump from a supported surface; allow one additional jump in the air.
- Dash: short horizontal burst in the facing direction, consuming energy.
- Attack: hold for repeated close-range energy strikes at a controlled rate.
- Turret button: select a turret type, then tap a valid build pad to purchase it.
- Occupied pad: open upgrade, repair, and sell actions.
- Pause: stop simulation and open Resume, Restart, Settings, and Main Menu.

Support simultaneous movement and action touches. Releasing, cancelling, pausing, or backgrounding the app must clear active input.

### Win and Lose Conditions

- Win: wave ten has finished spawning and all remaining enemies are defeated while core health is above zero.
- Lose: core health reaches zero.
- Hero health reaching zero causes a three-second respawn at the core, not an immediate loss.
- The core remains vulnerable during the respawn countdown; briefly protect the respawned hero from damage.
- Stop further rewards and combat events once either end state is entered.

### Initial Balance Targets

These are starting values to tune during playtesting, not final balance commitments.

| System | Initial value |
| --- | --- |
| Hero health | 100 |
| Hero energy | 100 |
| Power-core health | 1,000 |
| Starting scrap | 150 |
| Dash cost | 25 energy |
| Dash cooldown | 0.8 seconds |
| Energy regeneration | 15 per second after 1 second without spending |
| Build phase | 12 seconds, with Start Wave available |
| Cannon cost | 100 scrap |
| Tesla turret cost | 200 scrap |
| Solar turret cost | 300 scrap |
| Core repair | 100 scrap restores up to 150 health |
| Total waves | 10 |

## 4. Technical Design

### Architecture

- Keep all SpriteKit scene and node mutation on the main actor.
- Use a single source of truth for health, scrap, wave state, and purchase validation.
- Keep movement, damage, rewards, economy, and wave calculations separate from visual nodes where practical.
- Use elapsed simulation time, not frame counts, for cooldowns and spawning.
- Cap unusually large frame deltas to avoid physics and spawn bursts after interruptions.
- Use collision bit masks with named categories rather than unexplained numeric values.
- Queue entity removal until contact processing is safe; a dead enemy must award scrap exactly once.
- Use stable entity identifiers instead of retaining dead scene nodes in targeting systems.
- Deliver UI state to SwiftUI through a main-actor observable session model.
- Avoid an application-wide singleton for mutable gameplay state.

### Proposed Repository Layout

Create these files as implementation progresses. This list describes the intended structure, not files known to exist.

```text
RuinCore/
  App/
    RuinCoreApp.swift
    RootView.swift
  UI/
    MainMenuView.swift
    GameContainerView.swift
    GameHUDView.swift
    TouchControlsView.swift
    PauseMenuView.swift
    ResultsView.swift
    SettingsView.swift
  Game/
    GameScene.swift
    GameSession.swift
    GameState.swift
    GameConfiguration.swift
    PhysicsCategory.swift
    InputState.swift
    Entities/
      HeroNode.swift
      EnemyNode.swift
      TurretNode.swift
      ProjectileNode.swift
      PowerCoreNode.swift
      BuildPadNode.swift
    Systems/
      CombatSystem.swift
      WaveDirector.swift
      TargetingSystem.swift
      EconomySystem.swift
      SaveStore.swift
    Models/
      EnemyDefinition.swift
      TurretDefinition.swift
      WaveDefinition.swift
      SaveData.swift
  Resources/
    Assets.xcassets/
    Audio/
RuinCoreTests/
  CombatTests.swift
  EconomyTests.swift
  WaveDirectorTests.swift
  SaveStoreTests.swift
Docs/
  Images/
    gameplay-reference.png
  TESTING.md
  ASSET_LICENSES.md
README.md
```

Use shape nodes and simple local textures until gameplay is validated. Do not block Step 1 or Step 2 on finished artwork.

## Step 1 — Create the Project and Playable Arena

### Goal

Launch into a stable landscape arena with responsive movement and platform collision.

### Build Tasks

- [ ] Create an Xcode iOS App project named `RuinCore`, using SwiftUI and Swift.
- [ ] Set the minimum deployment target to iOS 17 and the Swift language mode to Swift 6.
- [ ] Configure landscape orientations for both iPhone and iPad.
- [ ] Add a unit-test target if the project template did not create one.
- [ ] Present a SpriteKit scene through SwiftUI `SpriteView`.
- [ ] Establish a consistent logical gameplay coordinate system with an aspect-aware camera.
- [ ] Build the ground walkway, side boundaries, raised platforms, power-core position, and portal position.
- [ ] Add a placeholder hero with horizontal movement, facing, gravity, and double jump.
- [ ] Implement multi-touch input with separate movement and action tracking.
- [ ] Prevent platform tunneling at intended movement speeds and recover the hero if it falls outside the arena.
- [ ] Add a debug overlay for frame rate, physics bodies, and hero position in debug builds only.
- [ ] Add a minimal main menu with Play and Settings.

### Acceptance Checklist

- [ ] A clean checkout builds and launches without missing resources.
- [ ] The hero moves and jumps on an iPhone and an iPad layout without stretched geometry.
- [ ] Holding movement and jumping simultaneously works reliably.
- [ ] Releasing or cancelling touches never leaves movement stuck on.
- [ ] The hero lands correctly on raised platforms and cannot escape the playable bounds.
- [ ] Restarting the scene does not duplicate nodes or input handlers.

**Suggested commit:** `feat: add playable arena and hero movement`

## Step 2 — Implement Combat, Enemies, and Core Damage

### Goal

Make defending the core playable before adding the complete economy.

### Build Tasks

- [ ] Add hero health, energy, attack cooldown, dash, and damage feedback.
- [ ] Implement a short-range directional attack with one damage event per target per attack.
- [ ] Implement dash energy cost and cooldown. The initial dash does not grant invulnerability.
- [ ] Add brief post-hit invulnerability so overlapping contacts do not drain hero health instantly.
- [ ] Add three enemy archetypes: ground scout, flying drone, and armored brute.
- [ ] Ground enemies advance along the main walkway toward the core; flying enemies steer through air lanes toward it.
- [ ] Avoid general-purpose pathfinding in the first version; author spawn routes suited to each archetype.
- [ ] Enemies attack the hero when in range and otherwise advance toward the core.
- [ ] Add core health, damage intervals, hit feedback, and destruction.
- [ ] Implement hero defeat, respawn countdown, and temporary respawn protection.
- [ ] Define physics contacts for attacks, projectiles, enemies, terrain, hero, and core.
- [ ] Add defeat cleanup, scrap reward events, and safe projectile lifetimes.
- [ ] Add temporary debug spawn controls for each enemy type.

### Acceptance Checklist

- [ ] Each enemy can spawn, navigate its intended route, attack, take damage, and die.
- [ ] A single attack or projectile cannot accidentally apply duplicate damage.
- [ ] Hero energy never becomes negative and dash cannot bypass its cooldown.
- [ ] Dead enemies award scrap exactly once.
- [ ] Core damage follows a controlled attack interval rather than every physics frame.
- [ ] Hero death and respawn do not reset core health or enemy progress.
- [ ] Core destruction enters a stable loss state only once.
- [ ] Unit tests cover damage clamping, energy spending, cooldown eligibility, and duplicate reward prevention.

**Suggested commit:** `feat: add combat enemies and core defense`

## Step 3 — Add Turrets, Build Pads, and Scrap Economy

### Goal

Let the player make meaningful defensive purchases during combat and between waves.

### Turret Roles

| Turret | Cost | Behavior |
| --- | --- | --- |
| Cannon | 100 | Moderate-rate projectile damage against ground and flying enemies |
| Tesla | 200 | Short-range electrical strike that chains to a limited number of nearby enemies |
| Solar | 300 | Slow, powerful ranged energy shot against tougher targets |

All three turret types must have distinct silhouettes, range, firing cadence, and feedback. Balance numbers belong in configuration data rather than being scattered through scene code.

### Build Tasks

- [ ] Add fixed build pads matching the reference composition where practical.
- [ ] Show affordability, selected turret, valid pads, and insufficient-funds feedback.
- [ ] Validate pad availability and funds atomically before subtracting scrap and creating a turret.
- [ ] Implement target acquisition, range checks, attack cooldowns, and target invalidation.
- [ ] Make projectiles expire after a lifetime or leaving the arena.
- [ ] Implement bounded Tesla chaining without hitting the same enemy twice in one chain.
- [ ] Give turrets health; enemies retaliate against a nearby turret attacking them, then resume their route after it is destroyed.
- [ ] Add two upgrade levels per turret with visible cost and stat changes.
- [ ] Add turret repair and selling, with refunds based on recorded purchase and upgrade spending.
- [ ] Add core repair during build phases only.
- [ ] Clamp repairs to missing health and reject purchases that have no effect.
- [ ] Keep combat input separate from build-menu touches to prevent accidental attacks or purchases.

### Acceptance Checklist

- [ ] Purchases cannot produce negative scrap or multiple turrets on one pad.
- [ ] All three turret types can defeat valid enemies without retaining dead targets.
- [ ] Upgrade, repair, sell, and rebuild work repeatedly on the same pad.
- [ ] A destroyed turret clears its pad and stops all associated firing effects.
- [ ] Selling cannot return more scrap than the configured refund policy permits.
- [ ] Core repair is unavailable during combat and at full core health.
- [ ] Unit tests cover exact-funds purchases, insufficient funds, occupied pads, repair limits, and refund calculations.

**Suggested commit:** `feat: add build pads turrets and scrap economy`

## Step 4 — Complete Ten Waves and the Full Game Loop

### Goal

Deliver one complete match from the main menu to victory or defeat.

### Match State Machine

`mainMenu → preparing → waveActive → waveCleared → preparing`

- Repeat preparation and combat until ten waves are completed.
- Enter `victory` only after the last scheduled spawn and the last living enemy are gone.
- Enter `defeat` whenever core health reaches zero during a match.
- Treat pause as a suspended match state; resume must restore the previous state and timing.
- At new-match creation, reset health, energy, scrap, wave progress, entities, timers, and selected build actions.

### Wave Progression

| Waves | Purpose |
| --- | --- |
| 1–2 | Teach movement, basic combat, and the first cannon purchase |
| 3–4 | Introduce flying drones and mixed attack lanes |
| 5–6 | Introduce armored brutes and encourage upgrades |
| 7–8 | Increase mixed pressure without relying only on larger health pools |
| 9 | Test preparation with a demanding combined assault |
| 10 | Final assault led by a stronger brute variant with a distinct appearance |

Define each wave using explicit spawn entries, delays, and enemy types. The final brute variant can reuse existing behavior with configured stats; a complex boss is outside the initial scope.

### Build Tasks

- [ ] Implement data-driven schedules for all ten waves.
- [ ] Track scheduled, spawned, living, and defeated enemies explicitly.
- [ ] Add the preparation countdown and Start Wave action.
- [ ] Ensure wave completion waits for pending spawns as well as living enemies.
- [ ] Add wave banners, rewards, victory, defeat, and match statistics.
- [ ] Add pause, resume, restart, and return-to-menu flows.
- [ ] Suspend gameplay, spawning, cooldowns, and relevant audio when the app becomes inactive.
- [ ] Clear touches on interruption and require an explicit resume after returning.
- [ ] Save settings, tutorial completion, best completed wave, and best score locally.
- [ ] Document that mid-match save/resume is not included in version one.
- [ ] Recover safely from missing, outdated, or corrupted local save data.

### Acceptance Checklist

- [ ] A full match can progress through all ten waves and reach victory.
- [ ] Losing during a spawn sequence does not spawn more enemies afterward.
- [ ] Pausing does not advance waves, timers, damage, or energy regeneration.
- [ ] Repeated restart and main-menu transitions do not leak old match state.
- [ ] Backgrounding and returning cannot cause a large simulation-time jump.
- [ ] Unit tests cover empty schedules, delayed final spawns, final-wave completion, defeat precedence, and save-data fallback.

**Suggested commit:** `feat: complete ten wave campaign and match flow`

## Step 5 — Apply Reference Art, Polish, Test, and Package

### Goal

Turn the complete prototype into a coherent, stable, release-candidate build.

### Visual and Audio Tasks

- [ ] Replace placeholders with original or properly licensed character, enemy, turret, environment, and UI art.
- [ ] Recreate the reference's stone ruins, cyan lighting, vegetation, portal, and layered background.
- [ ] Add readable idle, run, jump, attack, hurt, death, and turret-firing animations.
- [ ] Add restrained particles for hits, electrical attacks, core damage, scrap rewards, and portal spawning.
- [ ] Add music, weapon sounds, enemy feedback, purchase feedback, and separate audio volume settings.
- [ ] Add optional screen shake and haptics with disable settings; account for unsupported devices.
- [ ] Ensure health bars, build pads, enemy silhouettes, and important projectiles remain readable over effects.
- [ ] Provide large touch targets and do not communicate essential state by color alone.
- [ ] Label SwiftUI menus and controls for accessibility; document gameplay accessibility limitations honestly.

### Quality and Repository Tasks

- [ ] Profile on a physical iPhone and iPad, targeting stable 60 FPS under the designed maximum enemy load.
- [ ] Bound enemies, particles, audio voices, and projectile counts; optimize measured bottlenecks first.
- [ ] Test safe areas, camera framing, HUD overlap, and touch controls across supported screen sizes.
- [ ] Complete a clean build, unit tests, and a manual ten-wave playthrough.
- [ ] Verify airplane-mode play and that no unnecessary permissions are requested.
- [ ] Add an app icon and an appropriate launch presentation.
- [ ] Record asset authors, source URLs, licenses, and attribution requirements in `Docs/ASSET_LICENSES.md`.
- [ ] Document tested devices, OS versions, known issues, and reproduction steps in `Docs/TESTING.md`.
- [ ] Add a suitable `.gitignore`; do not commit signing secrets, local user state, or build artifacts.
- [ ] Commit a shared Xcode scheme so repository automation can run the intended test target.
- [ ] If macOS GitHub Actions is configured, use an available simulator destination discovered by the workflow rather than assuming a specific installed device.
- [ ] Add actual screenshots and update this README with implemented status and real setup notes.
- [ ] Choose a source-code license before public distribution; do not assume the code license covers third-party artwork.

### Final Acceptance Checklist

- [ ] A new developer can clone the repository, open the Xcode project, select a simulator, and run it using the documented instructions.
- [ ] All automated tests pass and no unresolved build errors remain.
- [ ] Every path from main menu through gameplay, pause, results, restart, and back works.
- [ ] All ten waves are winnable without debug tools.
- [ ] Controls work with simultaneous touches on physical devices.
- [ ] No known crash, duplicate reward, negative currency, or stuck-wave issue remains.
- [ ] Asset licensing and remaining limitations are documented.
- [ ] Repository status accurately distinguishes implemented features from future plans.

**Suggested commit:** `release: polish validate and document version one`

## 5. Xcode Setup and Run Instructions

These instructions apply after the Xcode project has been created in Step 1.

1. Clone the repository and open `RuinCore.xcodeproj` in Xcode.
2. Select the `RuinCore` app target and confirm its deployment target is iOS 17 or later.
3. For a physical device, open **Signing & Capabilities**, choose your development team, and use a unique bundle identifier.
4. Select an installed iPhone or iPad simulator, or your connected device, in the run destination menu.
5. Choose **Product → Run** or press **Command-R**.
6. Choose **Product → Test** or press **Command-U** to run the test target.

### Permissions and Capabilities

- No camera, microphone, photos, location, or tracking permissions are required for the defined game.
- No special entitlements are required for local offline gameplay.
- Configure supported landscape orientations for both iPhone and iPad in the app target's supported orientations settings.
- Keep background audio disabled unless a later requirement explicitly calls for it.
- Reassess privacy declarations if analytics, advertising, networking SDKs, or other data-collecting dependencies are added.

## 6. Implementation Rules for Contributors and Coding Agents

1. Inspect the repository before creating files; preserve the actual project structure when it differs from this proposal.
2. Implement the current step fully before expanding into later features.
3. Use complete compiling files, not pseudocode, missing resources, or empty feature stubs.
4. Keep balance values centralized and gameplay rules testable without SpriteKit when practical.
5. Run available tests and report the exact checks performed. Do not describe Apple UI code as compiled if only plain Swift logic was tested.
6. For each step, summarize changed files, completed checkboxes, checks run, and remaining issues.
7. Never commit credentials, signing certificates, private keys, or unrelated generated files.
8. Do not replace a working implementation merely to match the proposed filenames.
9. Keep feature scope small: one arena, three enemy archetypes, three turret types, and ten waves.
10. Mark a step complete only when its acceptance checklist has actually been checked.

## 7. Out of Scope for Version One

- Online multiplayer, accounts, cloud saves, and leaderboards.
- Procedural maps or a multi-level campaign.
- Inventory, crafting trees, character classes, and equipment drops.
- Ads, in-app purchases, subscriptions, and live-service events.
- Complex boss behavior, destructible terrain, and general-purpose enemy pathfinding.
- A full mid-match persistence system.

## 8. Definition of Done

Version one is complete when a clean checkout builds in the documented Xcode environment, a player can finish all ten waves with working combat and defenses, the acceptance checklists pass, all required resources are included legally, and the repository documents its actual tested state.

---
<img src="https://ghostchat.tech/icons/ghost-code-dev.png" width="20" height="20" alt="" align="top"> Built by [Ghost Code Dev](https://ghostchat.tech)
