# Implementierungsbericht: SQLite WASM + OPFS Storage

## 1. Status Quo & Architektur

Die persistente Datenspeicherung wurde erfolgreich von IndexedDB (Dexie) auf **SQLite WASM mit OPFS (Origin Private File System)** umgestellt. Die Initialisierungshürden (ESM-Export-Mismatch) wurden behoben, und der `DatabaseClient` ist nun vollständig typsicher ohne `any`-Casts implementiert.

### Technische Kernkomponenten:
- **SQLite Worker**: Nutzung des offiziellen `sqlite3-worker1.mjs`.
- **VFS**: Origin Private File System (OPFS) für native Dateisystem-Performance.
- **API**: Promise-basierte Kommunikation via `sqlite3Worker1Promiser` (v2).

---

## 2. Antworten auf Architektur-Fragen

### Was wird nun lokal gespeichert?
Wir unterscheiden zwei Datenbank-Bereiche:
1.  **Global (`global_openings_cache`)**:
    - `theory_stats`: Eröffnungswerte (FEN-Keys, Statistiken, Ablaufdaten).
    - `wiki_content`: Lokaler Cache für Wiki-Artikel (Markdown/HTML).
2.  **User (`user_{lichess_id}`)**:
    - `studies`: Metadaten deiner Studien (Titel, Typ, Sortierung).
    - `chapters`: Der eigentliche PGN-Content (FEN-Bäume, Kommentare, Konfigurationen).
    - `diamonds` & `brilliants`: Gesammelte Taktiken und Glanzpartien.
    - `settings`: Benutzerspezifische App-Einstellungen.

### Wo finden Agenten das Data Schema?
Das "Source of Truth" Schema ist imperativ in der Datei `src/shared/api/storage/DatabaseClient.ts` definiert.
- Die Tabellen für globale Daten befinden sich in der Methode `_doInit()`.
- Die Tabellen für Nutzerdaten befinden sich in `openUserDb()`.

### Wo werden die Datenbank-Dateien abgelegt?
Die Dateien liegen im **Origin Private File System (OPFS)** des Browsers.
- Diese Dateien sind für den Nutzer nicht direkt im Dateimanager des Betriebssystems sichtbar, sondern werden vom Browser in einem sandboxed Bereich verwaltet.
- Intern werden sie als `file:global_openings_cache?vfs=opfs` und `file:user_{id}?vfs=opfs` angesprochen.

### Kompatibilität & Empfehlungen
- **Voraussetzung**: Die App benötigt `SharedArrayBuffer` (aktiviert durch COOP/COEP Header) und die `FileSystemHandle` API.
- **Empfehlung**: 
    - **Beste Erfahrung**: Google Chrome (Desktop & Android), Microsoft Edge. Chromium-Browser haben derzeit die stabilste OPFS-Implementation.
    - **iOS/Safari**: Funktioniert in modernen Versionen (17+), kann aber bei sehr großen Datenbanken strengere Quota-Limits haben.
    - **Firefox**: Unterstützt OPFS, zeigt aber gelegentlich Performance-Unterschiede bei WASM-Modulen.

### Backup & Wiederherstellung
- **Technisch möglich?** Ja. Die SQLite-API bietet eine `export`-Funktion, die die gesamte Datenbank als `Uint8Array` zurückgibt.
- **Status**: Die Infrastruktur im `DatabaseClient` ist vorhanden, eine UI-Funktion ("Export DB") müsste noch im User-Cabinet implementiert werden.

---

## 3. Technische Schulden & Legacy

### Zu beseitigende Altlasten:
- **Dexie/IndexedDB**: (ERLEDIGT) `dexie` wurde deinstalliert und die Datei `StudyDatabase.ts` gelöscht.
- **Legacy Repositories**: (ERLEDIGT) Alle Repositories unter `src/shared/api/storage/repositories/` wurden auf SQLite umgestellt.

### Verbliebene Schulden im DatabaseClient:
- **Schema Migrations**: (TEILWEISE ERLEDIGT) Eine `meta`-Tabelle mit Versionsnummer wurde eingeführt. Ein vollwertiges Migrations-Framework steht noch aus.
- **Zentrale Fehlerbehandlung**: (VERBESSERT) SQL-Fehler werden nun detailliert in der Konsole geloggt und können einfacher an die UI durchgereicht werden.
- **Vite Static Copy**: Die manuellen Kopieranweisungen in `vite.config.ts` für die `.wasm` und `.mjs` Dateien müssen bei SQLite-Updates synchron gehalten werden.

---

## 4. Empfehlungen für Stabilität & Produktivität

1.  **Schema Migrations**: Wir nutzen die neue `meta`-Tabelle, um bei Bedarf Schema-Updates durchzuführen (z.B. `IF version < 2 THEN ALTER TABLE...`).
2.  **Binary Storage (BLOBs)**: Große PGN-Bäume werden aktuell als JSON-Strings gespeichert. Für massive Studien (>100.000 Knoten) empfiehlt es sich, auf binäre Formate oder komprimierte Strings umzusteigen.
3.  **Visual Feedback**: Da Schreibvorgänge im OPFS asynchron sind, wäre ein kleiner "Auto-Save" Indikator in der UI sinnvoll, um dem Nutzer zu signalisieren, dass seine Änderungen sicher in der SQLite-DB gelandet sind.
4.  **Quota Check**: Implementierung von `navigator.storage.estimate()`, um den Nutzer zu warnen, bevor der Browser-Speicher voll ist.
