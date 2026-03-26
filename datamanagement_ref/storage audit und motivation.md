# Datamanagement Audit & Motivation (März 2026)

Dieses Dokument beschreibt den aktuellen Stand der Datenspeicherung in der `extrapawn.com` Anwendung, die damit verbundenen Probleme und die Motivation für den Wechsel auf eine moderne SQLite WASM + OPFS Architektur.

---

## 1. Ist-Zustand (Bestandsaufnahme)

Derzeit ist die lokale Datenspeicherung über verschiedene Browser-APIs und Bibliotheken verteilt. Es gibt keine zentrale Verwaltung, was zu einer fragmentierten Architektur führt.

### Aktuelle Speicher-Cluster:
*   **IndexedDB (via Dexie)**: 
    *   `StudyDatabase`: Lokale Kopien von Lichess-Studien (Namespacing via `ownerId`).
    *   `OpeningDatabase`: FEN-basierter Cache für Eröffnungswerte (Global).
    *   `DiamondDB`: Achievements und Blunder-Tracking (Global).
    *   `WikiBooksDatabase`: Lokaler Cache für Wikibooks-Inhalte (Global).
*   **localStorage**: 
    *   `user_profile`: Aktuelles Benutzerprofil.
    *   `lastActiveChapterId_{id}`: Zuletzt geöffnetes Kapitel pro User.
    *   `redirect_after_login`: Navigationsstatus nach Auth.
*   **sessionStorage**:
    *   `lichess_study_ready`: Synchronisations-Flags.

---

## 2. Problematik

Das aktuelle System weist drei gravierende Schwachstellen auf:

1.  **Mangelnde Datenisolation (Cross-Account Leaks)**: Da Datenbanken wie die `DiamondDB` global sind, sehen verschiedene Nutzer auf demselben Endgerät (z. B. IPad der Familie) die Erfolge und Fehlerhistorien des jeweils anderen.
2.  **Unzuverlässige Persistenz auf Mobilgeräten**: Android und iOS verwalten den Browser-Speicher oft als temporären Cache. Ohne explizites `Storage Persistence Requesting` können kritische Daten (lokale Studien) vom OS gelöscht werden, wenn Speicherplatz benötigt wird.
3.  **Architektonische Fragmentierung**: Die Definitionen der Datenbanken sind über das gesamte Projekt verteilt (`entities/opening`, `features/study`, `features/diamond-hunter`). Dies erschwert die Wartung, Schema-Upgrades und Debugging erheblich.

---

## 3. Motivation für den Wechsel (SQLite WASM + OPFS)

Der Umstieg auf SQLite im Origin Private File System (OPFS) ist ein strategischer Schritt zur Steigerung der App-Qualität:

*   **Zentrale Kontrolle**: Statt vieler kleiner "Insel-Speicher" gibt es eine klare Dateistruktur im virtuellen Dateisystem des Browsers.
*   **Wahre Multi-User Isolation**: Durch die Trennung der Datenbank-Dateien (z. B. `/users/alice/main.db` vs. `/users/bob/main.db`) ist eine versehentliche Datenvermischung technisch ausgeschlossen.
*   **Performance & Zuverlässigkeit**: SQLite bietet echte ACID-Konformität (Atomicity, Consistency, Isolation, Durability) und ist bei komplexen relationalen Abfragen (z. B. Suche in PGN-Bäumen) deutlich performanter als IndexedDB.
*   **"Native File" Feeling**: OPFS erlaubt es dem Browser, die Daten so robust zu verwalten wie echte Dateien auf der Festplatte, was die Gefahr von Datenverlusten durch automatische Cache-Bereinigungen minimiert.

---

## 4. Kompatibilität & "Strict Gatekeeping"

Um die Stabilität der Anwendung zu garantieren und Support-Aufwände durch veraltete Browser oder restriktive In-App-Browser (Instagram, Telegram, etc.) zu vermeiden, verfolgen wir eine **Null-Toleranz-Strategie** bei den Systemanforderungen.

### Motivation der Strenge:
*   **Keine Fallbacks**: Wir implementieren keine "Polyfills" oder Ausweichmechanismen für IndexedDB, wenn OPFS fehlt. Wenn die Hardware/Software den Standard nicht erfüllt, bleibt die App gesperrt.
*   **Vermeidung von Support-Tickets**: 90% der "Datenverlust"-Meldungen stammen von Nutzern in In-App-Webviews oder uralten mobilen Browsern. Durch das konsequente Aussperren dieser Umgebungen eliminieren wir diese Fehlerquelle systemisch.

### Untersuchung: `GlobalAssetLoader.vue`
Die Komponente `GlobalAssetLoader.vue` fungiert als der zentrale **Kill-Switch**. Derzeit prüft sie bereits:
*   `SharedArrayBuffer` (Notwendig für Multi-Threaded Stockfish).
*   `IndexedDB` (Bisheriger Speicherstandard).
*   `Cache API` (Offline-Funktionalität).

### Notwendiges Refactoring für SQLite/OPFS:
Für den Umstieg auf SQLite WASM + OPFS müssen die Prüfungen in `preloadAssets()` verschärft werden. Ein Nutzer darf den Loader nur verlassen, wenn folgende Bedingungen erfüllt sind:
1.  **OPFS Support**: `typeof navigator.storage.getDirectory === 'function'`. Ohne Zugriff auf das Origin Private File System kann keine Nutzer-Datenbank angelegt werden.
2.  **Cross-Origin Isolation**: Da SQLite WASM mit OPFS auf `SharedArrayBuffer` und Atomics angewiesen ist, muss sichergestellt sein, dass die Seite "Cross-Origin Isolated" ist (entsprechende COOP/COEP Header).
3.  **Web Worker & WASM**: Volle Unterstützung für asynchrone Worker-Kommunikation.

---

## 5. Zielbild

Das neue System soll **flach, verständlich und benutzerzentriert** sein. Wir akzeptieren im Zuge der Entwicklung den Verlust alter Daten, um mit einer sauberen, zukunftssicheren Struktur ohne "Altlasten" in Produktion gehen zu können. Der `GlobalAssetLoader` wird zum Wächter dieser neuen Architektur: Er garantiert, dass jeder Nutzer, der das Dashboard erreicht, auf einem technisch einwandfreien und modernen System arbeitet.
