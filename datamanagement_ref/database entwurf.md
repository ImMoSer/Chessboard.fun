# SQLite & OPFS Data Structure Design (2026)

Dieses Dokument beschreibt die vereinfachte, benutzerisolierte Datenstruktur für den Wechsel auf SQLite + OPFS.

## 1. Dateisystem-Struktur (OPFS)

Die Dateianordnung ist auf maximale Isolation ausgelegt.

```text
/ (OPFS Root)
├── global/
│   └── openings_cache.db  (Geteilt unter allen Usern, speichert FENs & Wikibooks)
└── users/
    ├── {lichess_id_1}/
    │   └── main.db        (Persistente Daten für User A)
    ├── {lichess_id_2}/
    │   └── main.db        (Persistente Daten für User B)
    └── anon/
        └── main.db        (Daten für Gäste / lokales Experimentieren)
```

---

## 2. Tabellen-Schema: `main.db` (Der User-Kern)

Die `main.db` jedes Nutzers folgt einem flachen relationalen Modell. Komplexe Objekte (Bäume, JSON) werden als `JSON/TEXT` Spalten gespeichert.

### Tabelle: `studies`
*Metadaten für importierte oder lokale Studien.*
| Spalte | Typ | Beschreibung |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Die Lichess ID der Studie. |
| `title` | TEXT | Anzeigename. |
| `type` | TEXT | 'owned' oder 'community'. |
| `order_index` | INTEGER | Sortierung in der Seitenleiste. |

### Tabelle: `chapters`
*Der eigentliche Schach-Inhalt.*
| Spalte | Typ | Beschreibung |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Chapter UUID oder Lichess Chapter ID. |
| `study_id` | TEXT (FK) | Referenz auf `studies.id`. |
| `name` | TEXT | Name des Kapitels. |
| `pgn_tree` | JSON | Der komplette PGN-Baum (als serialisiertes JSON). |
| `tags` | JSON | PGN Meta-Tags. |
| `saved_path` | TEXT | Letzte Cursorposition (z. B. '3.0.1'). |
| `config` | JSON | Orientation, Farbe, Kapiteltyp. |

### Tabelle: `diamonds`
*Erfolge und Fehlersuche.*
| Spalte | Typ | Beschreibung |
| :--- | :--- | :--- |
| `id` | INTEGER (PK) | Auto-increment ID. |
| `hash` | TEXT | Zobrist/FEN der Position. |
| `fen` | TEXT | Vollständige FEN. |
| `pgn` | TEXT | Zugfolge bis zum Fehler. |
| `collected_at` | INTEGER | Zeitstempel in ms. |

### Tabelle: `settings`
*Generische UI-Präferenzen.*
| Spalte | Typ | Beschreibung |
| :--- | :--- | :--- |
| `key` | TEXT (PK) | Name der Einstellung (z. B. 'board_theme'). |
| `value` | TEXT | JSON/String Wert. |

---

## 3. Tabellen-Schema: `openings_cache.db` (Globale Ebene)

Dient der Reduzierung redundanter API-Aufrufe bei mehreren Nutzern.

### Tabelle: `theory_stats`
| Spalte | Typ | Beschreibung |
| :--- | :--- | :--- |
| `fen_key` | TEXT (PK) | Saubere FEN (ohne Zugnummern). |
| `source` | TEXT | 'lichess', 'masters', 'mozer'. |
| `data` | JSON | Raw API Response Payload. |
| `expires` | INTEGER | TTL Prüfung (Date.now() + TTL). |

### Tabelle: `wiki_content`
| Spalte | Typ | Beschreibung |
| :--- | :--- | :--- |
| `slug` | TEXT (PK) | Wikibooks Slug. |
| `content` | TEXT | HTML/Markdown Auszug. |
| `timestamp` | INTEGER | Letztes Update. |
