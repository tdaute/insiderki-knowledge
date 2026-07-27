# KNOWLEDGE — Design System für Präsentationen

Verbindliche Grundlage für alle Decks der Marke KNOWLEDGE. Referenzimplementierung:
`KNOWLEDGE-praesentation-master.html`. Produktivbeispiel:
`ki-kennzeichnungspflichten/index.html`.

---

## 1. Farben

| Token | Hex | Verwendung |
|---|---|---|
| `--bg` | `#0a0e1a` | Folienhintergrund |
| `--bg-2` | `#0d1424` | Abgesetzte Flächen |
| `--panel` | `#111a2c` | Chips, Karten auf Karten |
| `--sig` | `#C21D1A` | **Signalrot.** Vertikalstriche, Kapitel-Pills, Stichtagsmarken |
| `--sig-br` | `#e04340` | Aufgehelltes Signalrot für Text auf dunklem Grund |
| `--orange` | `#e8863c` | Primärakzent: Eyebrow, Icons, Listenzeichen, Graph-Knoten |
| `--orange-br` | `#f59e42` | Hover, Hervorhebung im Fließtext |
| `--white` | `#ffffff` | Überschriften |
| `--grey` | `#9aa3b2` | Fließtext |
| `--grey-2` | `#6b7280` | Fußnoten, inaktive Navigation |
| `--green` | `#3fb27f` | Zulässig, erfüllt, „kein Handlungsbedarf" |
| `--red` | `#e05252` | Unzulässig, Risiko, Pflicht ausgelöst |
| `--amber` | `#e0a83c` | Grenzfall |
| `--blue` | `#5b8def` | Rolle „Anbieter" |

Semantische Regel: **Grün = zulässig, Rot = Pflicht/Risiko, Gelb = Grenzfall.**
Signalrot ist Markenfarbe und wird nicht für Statusaussagen benutzt — dafür `--red`.

Rollencodierung durchgängig: Anbieter blau, Betreiber grün, beide orange.

**Kontrasthinweis:** `--sig` auf `--bg` liegt bei etwa 3:1. Für die Wortmarke
ausreichend, für Fließtext nicht. Kleine Schrift in Rot immer `--sig-br`.

## 2. Typografie

- **Inter** (300–800) für alles Gesetzte
- **JetBrains Mono** (400/500) für Daten, Aktenzeichen, Kapitel-Untertitel, Zähler

| Rolle | Größe | Gewicht |
|---|---|---|
| Deckblatt-Titel | `clamp(2.6rem, 7vw, 6rem)` | 800 |
| Kapitel-Titel | `clamp(2.2rem, 4.6vw, 3.6rem)` | 800 |
| Folientitel `.h1` | `clamp(1.6rem, 2.9vw, 2.5rem)` | 700 |
| Lead | `.92rem` / Zeilenhöhe 1.55 | 400 |
| Karten-Überschrift | `1rem` | 700 |
| Karten-Text | `.84rem` / 1.62 | 400 |
| Listenpunkt | `.82rem` / 1.6 | 400 |
| Eyebrow | `.72rem`, `letter-spacing .2em`, Versalien | 600 |

Alle Größen sind viewport-relativ. Feste Pixelwerte nur für Strichstärken und Icons.

## 3. Logo

Obsidian-Graph: 35 Knoten, 54 Kanten, prozedural gestreut, bewusst asymmetrisch
und ohne erkennbares Zentrum. Knoten in `--orange` und `--orange-br`, Kanten
`--orange` bei 40 % Deckkraft. Wortmarke **KNOWLEDGE** in `--sig`, `letter-spacing .26em`,
Gewicht 700. **Kein Zusatz unter der Wortmarke.**

Aufrufe: `logo(40)` in der Sidebar, `logo(52)` auf Titelfolien.

## 4. Folienraster

Inhaltsfolien bestehen aus Sidebar (230 px) und Bühne.

- **Bühne:** `padding: 3.4rem 2.6rem 1.6rem`
- **Header-Block:** Eyebrow und Titel hinter einem 4 px breiten vertikalen
  Signalrot-Strich, `padding-left: 1.15rem`
- **Body:** füllt den Rest, vertikal zentriert

**Kein horizontaler Strich unter dem Titel.** Die Trennung erfolgt ausschließlich
über den vertikalen Strich links.

**Kapitel-Trenner:** Pill in Signalrot mit `Kapitel N`, darunter Titel und
Monospace-Untertitel hinter einem 5 px breiten vertikalen Strich. Durchgehende
Nummerierung, keine „N von M"-Zählung.

## 5. Komponenten

| Klasse | Zweck |
|---|---|
| `.grid.g2` – `.g5` | Kartenraster, 2 bis 5 Spalten |
| `.card` | Grundkarte. Varianten `ok` `no` `warn` `acc` |
| `.card ul.bare` | Aufzählung ohne Listenzeichen |
| `.callout` | Hervorgehobener Kasten. Varianten `green` `red` |
| `.check` / `.check-i` | Nummerierte Schrittfolge. Variante `lg` größer |
| `.arw-v` | Vertikaler Pfeil zwischen Schritten |
| `.stack` / `.stack-row` | Gestapelte Zeilen, Titelspalte links |
| `.tl2` | Zeitstrahl mit mehreren Ästen |
| `.tech` | Merkmalsblock mit Label links |
| `.scale` | Verlaufsskala grün → gelb → rot mit Polbeschriftung |
| `.mk` | Wireframe-Mockup. Varianten `ok` `no` |
| `.t2` | Entscheidungsbaum mit seitlichen Abzweigen |
| `.brk` | Klammern über Kartengruppen |
| `.badge` | Rollenmarkierung oben rechts. Variante `inline` für Karten |
| `.fine` / `.fine-box` | Betragskästen |
| `.aiicons` | Icon-Reihe mit Beschriftung |

Icons über `ico(name, größe, farbe, strichstärke)`. Verfügbar: `speech`, `imgnote`,
`facescan`, `videowave`, `doc`, `shield`, `puzzle`, `chain`, `checkc`, `lock`, `eye`,
`globe`, `scaleico`, `mask`, `block`, `contract`, `cal`, `police`. Alle als Outline,
Strichstärke 1.5, Endkappen rund.

## 6. Bilder

Platzhalter und echte Bilder laufen über `ph(label, klasse, slotKey)`.

| Klasse | Verhältnis |
|---|---|
| keine / `tall` / `wide` | 1:1 |
| `r169` | 16:9 |
| `r34` | 3:4 Hochformat |
| `r11` | 1:1 explizit |

Die Deckelung erfolgt über `vh`-Werte, damit Bilder relativ zur Folienhöhe
skalieren und nie überlaufen. Neue Verhältnisklassen müssen in `hydrateMedia()`
in die Liste der erhaltenen Klassen aufgenommen werden.

## 7. Bedienung

Pfeiltasten, Leertaste, Bild auf/ab, Pos1, Ende. `R` löst das Quiz aus.
Sidebar-Einträge springen auf die erste Folie des Kapitels. Videos laufen nur
auf der aktiven Folie.

## 8. Medienanbindung

Supabase-Projekt **ai-governance** (`nblyvxnahkbvtatathbh`).

- `presentations` — eine Zeile je Deck, identifiziert über `slug`
- `presentation_slots` — eine Zeile je Bildplatz, verknüpft über `presentation_id`
- Bucket `workshop-assets`

`hydrateMedia()` liest beim Laden alle Slots mit gesetzter `public_url` und
ersetzt die Platzhalter. Ohne Netz bleiben die Platzhalter stehen — das Deck ist
offline vorführbar.

**`media_kind` ist kein Seitenverhältnis**, sondern nur `image` / `video` / `any`.
Der Zuschnitt steckt allein in den CSS-Klassen. Damit im Media Manager sichtbar
ist, was gebraucht wird, gehört das Format ins `label`, etwa „Strafverfolgung (16:9)".

## 9. Neues Deck anlegen

1. `KNOWLEDGE-praesentation-master.html` kopieren
2. `{{PLATZHALTER}}` ersetzen, `PRES_SLUG` und `NAV` setzen
3. Demo-Folien durch echte ersetzen, Bausteine aus Abschnitt 5 kombinieren
4. Zeile in `presentations` anlegen, Slots in `presentation_slots`
5. Mit jsdom prüfen: Folienzahl, keine JS-Fehler, alle Slots vorhanden
6. Ausliefern nach `tdaute/insiderki-knowledge`

## 10. Harte Regeln

- HTML-Dateien **immer** per Drag-and-drop über „Upload files" nach GitHub,
  **nie** über den Web-Editor — der zerschießt die UTF-8-Kodierung
- Ein Deck ist **eine** Datei. Keine externen CSS- oder JS-Dateien
- Externe Abhängigkeiten: nur Google Fonts und Supabase REST
- Kein `localStorage`, kein `sessionStorage`
- Änderungen bündeln, dann einmal bauen
