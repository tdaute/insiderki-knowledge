# KNOWLEDGE — Design System v2

Verbindlich für alle neuen Decks. Die Vorlage ist inhaltlich leer und zeigt jeden Folientyp einmal mit
Platzhaltern: `_vorlage/deck.json` und `https://knowledge.insiderki.ai/_vorlage/`. Der Bau stoppt, wenn in
einem echten Deck noch ein Platzhaltertext steht.
Das frühere System (Navy, Inter, Sidebar) liegt in `_archiv/` und gilt nur noch für Decks,
die noch nicht umgezogen sind.

---

## 1. Aufbau

```
<slug>/deck.json      Inhalt, das einzige, was ein Deck ausmacht
_engine/              Design und Technik für alle Decks
node _engine/build.mjs <slug>
<slug>/index.html     fertige Einzeldatei, läuft auch ohne Netz
```

Inhalte stehen nur in `deck.json`, Gestaltung nur in `_engine/`. Eine Design-Änderung erreicht
ein Deck, sobald es neu gebaut wird (`node _engine/build.mjs --alle`). Die `index.html` wird nie
von Hand bearbeitet.

## 2. Farben

| Token | Wert | Verwendung |
|---|---|---|
| `--bg` | `#0A0A0A` | Hintergrund |
| `--surface` | `#141414` | Karten |
| `--surface-hi` | `#1B1B1B` | Felder, erhöhte Flächen |
| `--line` | `rgba(255,255,255,.06)` | Raster, Kartenrand |
| `--line-hi` | `rgba(255,255,255,.14)` | Knöpfe, Hover |
| `--text` | `#F2F1ED` | Headlines, Titel |
| `--text-dim` | `#A8A8A3` | Fließtext |
| `--text-faint` | `#85857F` | Labels, Fußzeile |
| `--accent` | `#E50101` | **Rot** für Flächen, Ringe, Linien |
| `--accent-text` | `#E50101` | Rot als Schrift, immer im Schnitt 600 |
| `--warm` | `#F2B53A` | **Nur** Fortschritt und Zähler |
| `--ok` `--no` `--warn` | `#3FB27F` `#E05252` `#E0A83C` | **Nur** Statusaussagen: zulässig, unzulässig, Grenzfall |

Rot ist Markenfarbe und macht keine Statusaussage.

**Abweichung von der INSIDER.KI-Guideline:** Die Guideline nennt `#C21D1A`. Decks stehen seit November 2026
in `#E50101`, das Handout im Editorial-Layout bleibt bei `#C21D1A`.

**Bewusste Abweichung von der INSIDER.KI-Guideline:** Die Guideline verbietet Glow und Schatten.
Decks nutzen beides gezielt, weil die Bewegung und das Leuchten den Vortrag führen. Alles andere
folgt der Guideline: Schwarz, ein Akzent, viel Negativraum.

## 3. Typografie

- **Switzer** für alles Gesetzte. Headlines im dünnen Schnitt 200, Fließtext 300, Titel 500.
  **Rote Schrift steht immer im kräftigen Schnitt 600.**
- **Bebas Neue** für große Ziffern und das Wasserzeichen.

Beide stecken im Deck (`_engine/fonts/`), es gibt keine Abrufe bei Google Fonts. Gleiche
Kombination wie auf `check.kodex-insider.com`. Den Headline-Schnitt ändert ein Token: `--hl-weight`.

| Rolle | Größe bei 1440×810 | Schnitt |
|---|---|---|
| Titel und Abschluss | 52 px | 200 |
| Kapitel | 56 px | 200 |
| Headline | 44 px, Zeilenhöhe 1.06, Laufweite -0.02em | 200 |
| Headline Zeitleiste, Zweispalter, Chat | 36 px | 200 |
| Zitat | 32 px | 200 |
| Kennzahl | 36 px | 200 |
| Lead | 15 px | 300 |
| Randtext | 14 px | 300 |
| Karten-Titel | 15 px | 500 |
| Zeilen-Titel | 14 px | 500 |
| Karten- und Zeilen-Text | 12 px | 300 |
| Eyebrow | 10 px, Versalien, +0.18em, mit rotem Strich davor | 500 |
| Sektionslabel und Seitenzahl oben rechts | 9 px, Versalien, +0.18em | 500 |

1rem entspricht 16 px bei 1440×810. Alles skaliert mit dem Fenster, Beamer wie 4K: Bei 1920×1080 sind
alle Werte ein Drittel größer. Das Hintergrundraster hat 36 px Kantenlänge.

**Signatur:** Headline zweizeilig, zweite Zeile oder ein Teilsatz in Rot. Einzeilig ist in Ordnung
bei `section`, `compare`, `table`, `timeline` und wenn es kurz genug ist. Höchstens eine rote Stelle
je Headline.

## 4. Folienraster

```
┌──────────────────────────────────────────────────────────┐
│ Logo                             SEKTIONSLABEL  07 / 31  │  Kopfzeile
│                                                          │
│   —— EYEBROW                      Randtext,              │  Inhalt ab 23 %
│   Headline weiß                   höchstens 3 Zeilen     │
│   Headline rot.                                          │
│                                                          │
│   [Karte] [Karte] [Karte] [Karte]                    07  │  Wasserzeichen
│ ‹  ▬▬▬▬▬▬▬▬▬▬───────────────  ›³   ← → navigieren        │  Slider, Zähler
└──────────────────────────────────────────────────────────┘
```

Passt der Inhalt nicht, rückt die Engine ihn automatisch nach oben und enger zusammen.
`__deck.audit()` im Browser misst den tiefsten Inhalt gegen die Fußzeile und meldet unter `ueberlauf`, was
trotzdem nicht passt. `umbrueche` nennt Headlines, die mehr Zeilen brauchen als vorgesehen.

## 5. Folientypen

Alle Felder im Muster `_vorlage/deck.json`. Jede Folie braucht ein `label` für die Kopfzeile: das
Thema in ein bis drei Wörtern.

| `type` | Für | Aufbau-Schritte | Eigene Felder |
|---|---|---|---|
| `title` | Einstieg mit Kennzahlen und Bild rechts | keine | `eyebrow` `headline` `lead` `kpis` `live` `nametag` `media` |
| `statement` | Eine Aussage, ein Hinweis | keine | `eyebrow` `headline` `lead` `callout` |
| `section` | Kapitelanfang, durchnummeriert | keine | `chapter` `headline` `lead` |
| `cards` | 1 bis 6 Karten | je Karte | Kopf, `cards` `columns` `callout` `scale` `zoom` |
| `rows` | 1 bis 6 Zeilen, ab 4 zweispaltig | je Zeile | Kopf, `rows` `columns` `ordinal` `callout` `zoom` |
| `quote` | Zitat mit Sprecher-Pille | keine | `text` `person` |
| `timeline` | 2 bis 8 Stationen mit Detailkarte | je Station | Kopf, `stations` `stepWord` `callout`, `aside` als `{ title, items }` |
| `video` | Video mit Play-Knopf, Start per Klick | keine | `kicker` `title` `media` |
| `image` | Großes Bild | keine | `kicker` `title` `media` `fit` |
| `split` | Text und Bild | je Punkt | `eyebrow` `headline` `lead` `bullets` `media` `side` `callout` |
| `compare` | Spalten mit `tone` | je Spalte | Kopf, `columns` `callout` `scale` |
| `table` | Tabelle, `steps: true` deckt zeilenweise auf | optional | Kopf, `columns` `rows` `callout` |
| `chat` | Fenster mit Schreibmaschine und Antwort | läuft automatisch | `eyebrow` `headline` `lead` `window` |
| `closing` | Abschluss mit Knopf und Person | keine | `eyebrow` `headline` `lead` `cta` `person` `media` |
| `custom` | Eigenes HTML, Schritte per `data-step="n"` | frei | Kopf, `html` |

**Kopf** heißt: `eyebrow` `headline` `lead` `aside` `badge`.

**Auf jeder Folie möglich:** `label`, `id` (Sprungziel), `source` (Quelle, Stand, Hinweis klein am
Fuß), `notes` (Sprechernotizen, nur als Daten), `glow` (`br` `bl` `c` `none`), `watermark: false`,
`steps: false` (alles sofort zeigen).

Der Bau lehnt Felder ab, die ein Folientyp nicht darstellt. So geht nichts still verloren.

**Einzelne Elemente:**
- Karte: `icon` `label` `value` `sub` `title` `text` `media` `highlight` `tone`
- Zeile: `title` `text` `icon` `highlight` `to`, dazu `ordinal` (eigener Text, oder `false` für eine
  leere Spalte). `ordinal: false` an der Folie nimmt die Spalte ganz weg
- Spalte in `compare`: `title` `icon` `items` `tone`
- Station: `label` `icon` `title` `text`. `stepWord` ersetzt „Schritt", `stepWord: ""` nimmt die Zeile weg
- `scale`: `{ from, to }`, Verlaufsskala von Grün nach Rot
- `callout`: Text oder `{ text, tone }`
- `tone`: `ok` `no` `warn` `accent`

**Im Text:** `*rot*`, `**fett**`, `\n` für einen Zeilenumbruch, `{ok:…}` `{warn:…}` `{no:…}` für
farbige Statuswörter.

**Sprünge:** `"id": "agenda"` an der Zielfolie, `"to": "agenda"` an `cta` oder an einer Zeile. Sprünge
landen voll aufgebaut. Mit `zoom: true` vergrößert ein Klick eine Karte oder Zeile für den Raum.

**Richtwerte in Zeichen:** Headline 70, Lead 260, Randtext 220, Zeile 110, Zeilentitel 60, Karte 130,
Kartentitel 60, Station 150, Zitat 170, Punkt 120, Tabellenzelle 160, Hinweiskasten 240, Quelle 200.
Der Bau meldet Überschreitungen als Hinweis.

Pro Folie leuchtet genau eine Karte: die zuletzt aufgedeckte. `highlight: true` legt sie fest.

## 6. Bewegung

| Was | Wie |
|---|---|
| Aufbau-Schritt | von `opacity 0, 12px, scale .98` in 420 ms, mehrere gleichzeitig mit 60 ms Versatz. Sichtbares bewegt sich nicht |
| Folienwechsel | Überblendung in 220 ms (`BLENDE_MS` in `engine.js`). Entfällt beim Springen und schnellen Blättern |
| Wisch | nur jeder dritte Folienwechsel (`WISCH_ALLE`), in 280 ms (`WISCH_MS`): Ein dünner roter Strich (1,5 px bei 1440) läuft über die Folie, vor ihm die alte, hinter ihm die neue. Im Wechsel von rechts nach links und von unten nach oben, zurück gespiegelt |
| Symbol beim Wechsel | nur das Symbol, klein mittig (44 px bei 1440), blendet bei jedem Wechsel kurz auf und wieder aus |
| Namensfeld | roter Punkt pulsiert dauerhaft, 2 s |
| Aktiver Punkt | atmet dauerhaft mit `pulse`, 2 s |
| Verbindungslinie | füllt sich bis zum aktiven Punkt, Rot nach Bernstein, 500 ms |
| Play-Knopf | Schein atmet in 3 s, beim Hover größer |
| Chat | Schreibmaschine mit 28 ms je Zeichen, danach die Antwort |
| Bildformat | `media.ratio` passend zur Datei wählen, auch `3:2`. Passt ein Bild nicht zum Format seiner Reihe: `media.fit: true`, in `custom` die Klasse `fit`. Dann bleibt der Rahmen und das ganze Bild ist darin zu sehen |
| Bewegtes Bild | `media.anim` an `split` und `cards`: Abdeckungen in Bildpixeln geben Chat-Nachrichten frei, `wave` lässt eine Tonspur schwingen. `src` nennt die Bilddatei, bei einem anderen Bild steht es still. Farben im Browser messen (Canvas), nicht aus der Datei |
| Gesichtserkennung | `media.anim.scan`: Das Bild liegt abgedunkelt unter einem Punktraster, ein Suchrahmen springt umher und rastet auf `targets[].box` ein (Bildpixel), dabei werden `reveal` scharf, danach die Felder aus `after`, zuletzt das ganze Bild. Mit `fit` bleibt der Rahmen der Reihe |
| Leichte Bewegung | In `custom` das Bild in `<div class="kb">` legen: langsamer Zoom um 9 %, je Karte in eine andere Richtung |
| Einzoomen | `enter: "zoom"` an der Folie: Jede aufgedeckte Karte erscheint groß in der Folienmitte und zieht sich auf ihren Platz zurück (1,5 s) |
| Zahl hochzählen | Karte mit `count: true`: Die erste Zahl im `value` läuft beim Aufdecken in 2,2 s von 0 hoch, Komma wird übernommen (7,5) |
| Karten-Effekt | Karte mit `fx: "linie"` (rote Kurve läuft mit der Zahl mit) oder `fx: "geld"` (100-Euro-Scheine flattern in die rechte Kartenhälfte). Inhalt bleibt links lesbar |
| Fluss und Marken | In `custom`: `<i class="fluss ok pfeil">` gestrichelte Linie, die sich zeichnet und dann strömt (`.v` senkrecht, `.ok`/`.no` Farbe, `--fd` Verzögerung). `class="pz"` lässt Ja/Nein-Marken groß hereinzoomen (`--pd` Verzögerung, `.sanft` für große Blöcke). Schon Aufgedecktes läuft beim nächsten Schritt nicht neu an |
| Hover | zurückhaltend, Rand wird heller |

`prefers-reduced-motion`: Überblendung statt Wisch, kein Strich, kein Puls.

## 7. Bedienung

| Eingabe | Wirkung |
|---|---|
| `→` `Leertaste` `Bild ab` | nächster Schritt, sonst nächste Folie |
| `←` `Bild auf` | ein Schritt zurück, sonst vorherige Folie, voll aufgebaut |
| `Pos1` `Ende` | erste und letzte Folie |
| `F` | Vollbild |
| Slider | klicken oder ziehen springt zur Folie |
| ‹ › in der Detailkarte, Punkte der Zeitleiste | blättern in der Zeitleiste |
| `#7` oder `#7.2` | Link auf Folie 7, Schritt 2 |
| Wischen | auf dem Handy links und rechts |
| Klick auf Zeile mit Pfeil | springt zum Kapitel |
| Klick auf Karte mit `zoom` | vergrößert sie, `Esc` oder Klick schließt |

Der gelbe Zähler am Weiter-Knopf zeigt die verbleibenden Schritte der Folie.

## 8. Logo

**Das Standardlogo seit November 2026:** Symbol und „KNOW" im Verlauf von Rot nach Orange, „LEDGE" in Weiß.
Das Gesamtlogo steht oben links. Das Symbol allein steht klein in der Blende, in der Chat-Demo, bei der Person
im Abschluss und blass als Platzhalter, wenn es kein Titelbild gibt.

| Datei in `_engine/logo/` | Zweck |
|---|---|
| `knowledge-logo-original.webp` | Original auf Schwarz, die Quelle |
| `logo-voll.png` | Gesamtlogo, freigestellt, wird eingebettet |
| `logo-symbol.png` | Nur das Symbol, freigestellt, wird eingebettet |

Neues Logo einsetzen: `swift _engine/tools/logo-aufbereiten.swift <original> _engine/logo`, danach alle Decks
neu bauen. Das Original muss auf schwarzem Grund stehen, die Helligkeit wird zur Deckkraft.

## 9. Medien

Supabase-Projekt `ai-governance`, Tabellen `presentations` und `presentation_slots`, Bucket
`workshop-assets`. Im Deck steht nur der Slot:

```json
"media": { "slot": "motivKurzname", "label": "Was zu sehen ist (16:9)", "ratio": "16:9" }
```

**Ausnahme Porträt:** Tinos Porträt gehört wie das Logo zur Engine und steckt im Deck, sobald es genutzt wird:

```json
"media": { "asset": "portrait", "label": "Porträt Tino Daute" },
"nametag": { "name": "Tino Daute", "sub": "INSIDER.KI" }
```

Das geht auf `title` und `closing`. Die Dateien liegen in `_engine/portrait/`, ein neues Foto auf hellem Grund
stellt `swift _engine/tools/portrait-freistellen.swift <original> _engine/portrait/tino-daute 1100` frei. Es
läuft lokal mit der Motiv-Erkennung von macOS.

Bei Videos zusätzlich `"kind": "video"`. Die Engine fragt beim Laden die Tabelle ab und ersetzt
jeden Platzhalter, zu dem eine URL hinterlegt ist. Ohne Netz bleiben die Platzhalter stehen, das
Deck bleibt vorführbar. Das Format gehört ins `label`, damit es im Media Manager sichtbar ist.

## 10. Harte Regeln

- Inhaltliche Bilder und Videos nie ins Repo und nie als Base64 ins Deck. Ausnahmen sind nur Logo und Porträt
- Kein `localStorage`, kein `sessionStorage`
- Externe Abrufe nur zu Supabase. Das Handout lädt zusätzlich Google Fonts
- `index.html` und `handout.html` nie von Hand ändern, immer neu bauen
- Das Repo ist öffentlich, auch `deck.json` und `notes`. Interne Fragen und Abstimmungen gehören
  nie in ein Deck
- Decks mit Git pushen. Der GitHub-Web-Editor zerschießt die Umlaute
