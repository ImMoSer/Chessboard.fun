# Audit: Ladevorgang Optimierung

## 1. Problem-Übersicht (Status Quo)
Bei einer simulierten 4G-Verbindung (slow) tritt folgendes Verhalten auf:
1. **Logo & Spinner (Shell):** Erscheinen sofort nach dem Parsen der `index.html`.
2. **~10-30 Sekunden Stillstand:** Während dieser Zeit werden hunderte Ressourcen (MP3s, JS-Chunks) geladen.
3. **Erster Profile-Check:** Passiert erst extrem spät (um Sekunde 30), obwohl er das wichtigste Element für den Start ist.
4. **Interaktivität:** Der "Login"-Knopf erscheint erst, wenn die gesamte Kaskade abgeschlossen ist.

---

## 2. Identifizierte Flaschenhälse (Root Causes)

### A. Der "Sound Service" Overkill
Der `soundService.ts` ist der größte Blocker im System.
* **Was passiert:** Im Konstruktor des `SoundServiceController` wird `initializeAudio()` aufgerufen, welches via `import.meta.glob` **alle** verfügbaren MP3-Dateien (über 100 Stück) findet und sofort mit `audio.load()` herunterlädt.
* **Die Kaskade:** `App.vue` (statisch) -> `useGameStore` (statisch) -> `soundService` (statisch).
* **Folge:** Der Browser-Request-Queue wird sofort mit Audio-Files geflutet. Wichtige API-Requests (wie das User-Profil) stehen hinten an.

### B. Massive statische Importe in `App.vue`
`App.vue` fungiert aktuell als "Magnet" für alle Feature-Dependencies:
* Es importiert `NavMenu`, `SettingsMenu`, `GalaxyBackground`, `useGameStore` usw. statisch.
* Sogar wenn diese Komponenten nicht sofort sichtbar sind, werden deren Stores und Services (inklusive Sound-Preloading) beim Start von `boot()` in `main.ts` sofort geladen, weil `App.vue` dynamisch via `await import` geholt wird – was den gesamten Unterbaum triggert.

### C. Resource Saturation
Durch das massive Laden von Assets (Bilder, Sounds, PGN-Logik) ist die Bandbreite gesättigt. Der `authStore.initialize()` Aufruf in `main.ts` (Phase 3) muss warten, bis die Browser-Pipeline frei ist.

---

## 3. Analyse der Ladesequenz

1. **index.html** (Schnell, Shell sichtbar)
2. **main.js bundle** (Groß, enthält `App.vue` und seine statischen Abhängigkeiten)
3. **Vite Dynamic Import `App.vue`**: Hier beginnt das Desaster, da `App.vue` den `soundService` und alle anderen Stores weckt.
4. **Browser lädt MP3s**: Die Leitung ist "dicht".
5. **Phase 3 (`authStore`)**: Erst jetzt wird versucht, `/profile` zu laden. Der Request steht in der Warteschlange hinter den MP3s.

---

## 4. Empfehlungen für den nächsten Schritt

### 1. Sound-Lazy-Loading (Dringend)
Der `soundService` darf **keine** Sounds im Konstruktor laden. Er sollte Sounds erst laden, wenn sie zum ersten Mal gebraucht werden (`load-on-demand`) oder nachdem die App vollständig interaktiv ist.

### 2. Entkopplung der Login-Shell
`App.vue` sollte so minimal wie möglich sein. Schwere Komponenten wie `GalaxyBackground`, `NavMenu` und sogar der `GameStore` sollten via `<component :is="...">` oder `defineAsyncComponent` erst geladen werden, wenn der User eingeloggt ist.

### 3. Verbesserung der index.html Shell
* **Logo Größe:** Das Logo in der `initial-loader` Klasse muss vergrößert werden (aktuelle 120px wirken bei mobile/4G verloren).
* **Zustands-Feedback:** (Optional) Ein kleiner Text unter dem Spinner ("Prüfe Identität...", "Lade Schach-Zentrale...") würde die subjektive Wartezeit verkürzen.

### 4. Vite Chunking optimieren
Prüfen, ob wir das User-Modul in einen komplett eigenen Chunk zwingen können, der als allererstes (parallel zur App) geladen wird.

---

## 5. Audit-Fazit
Wir haben "Auth-First" programmiert, aber die "Statischen Side-Effects" (vor allem Sounds) ignorieren diese Logik und blockieren die Leitung. Die Lösung liegt nicht in der Verschiebung von `await`-Aufrufen, sondern im radikalen Entfernen von statischen Importen schwerer Services aus der Root-Komponente.
