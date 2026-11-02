# INSIDER.KI — KNOWLEDGE

Präsentationen und Workshop-Unterlagen.
Live: **https://knowledge.insiderki.ai**

## Struktur

```
index.html                  Übersicht, lädt live aus Supabase
DESIGN-SYSTEM.md            Verbindliche Gestaltungsgrundlage
.claude/agents/deck-builder.md   Agent für den Umbau alter Präsentationen
_engine/                    Design und Technik für alle Decks
_vorlage/                   Alle Folientypen als lauffähiges Deck
<slug>/deck.json            Inhalt eines Decks
<slug>/index.html           Fertiges Deck, wird gebaut
<slug>/handout.md, .html    Handout, wird gebaut
_arbeit/                    Quellen, Protokolle, SQL. Wird nicht eingecheckt
_archiv/                    Altes Design-System und alte Vorlage
netlify.toml                Header und Cache-Regeln
```

Decks mit `deck.json` nutzen die neue Engine. `ki-kennzeichnungspflichten`, `eu-ai-act` und
`schatten-ki` stehen noch im alten Design und bleiben so, bis sie neu gebaut werden.

## Alte Präsentation neu aufbauen

In Claude Code in diesem Ordner sagen:

> Bau aus `~/Downloads/alte-praesentation.pptx` ein neues Deck. Modus: verdichten.

Der Agent `deck-builder` nimmt PPTX, PDF und alte HTML-Decks an. Den Modus gibst du je Deck vor:

| Modus | Für | Was passiert |
|---|---|---|
| `form` | neue Decks | Nur neue Form, der Text bleibt wortgleich. `_engine/tools/wortgleich.py` prüft das |
| `verdichten` | bewährte Decks | Text wird gekürzt und neu gegliedert, Fakten bleiben |
| `neu` | alte Decks | Neu geschrieben im eigenen Stil, Fakten neu geprüft |

Vertrauliches oder fremdes Material und Themen außerhalb von INSIDER.KI baut der Agent nicht, er stoppt
und fragt nach.

Danach liegen lokal vor: `<slug>/index.html`, `<slug>/handout.html` und das Änderungsprotokoll
`_arbeit/<slug>/protokoll.md`. Der Agent stoppt dann. Nach deiner Durchsicht sagst du „freigeben",
dann trägt er das Deck in Supabase ein und pusht es. Neue Decks starten als Entwurf, „veröffentlichen"
nimmt sie in die Übersicht auf.

Das Repo ist öffentlich. Auch ein Entwurf ist nach dem Push per URL erreichbar.

## Deck von Hand anlegen oder ändern

1. `_vorlage/deck.json` nach `<slug>/deck.json` kopieren, `istVorlage` entfernen, Inhalt schreiben
2. `node _engine/build.mjs <slug>`
3. Lokal ansehen: `python3 -m http.server 4173`, dann `http://127.0.0.1:4173/<slug>/`
4. `_arbeit/<slug>/supabase.sql` in Supabase (`ai-governance`) ausführen. Das SQL legt Deck und
   Slots an und lässt befüllte Medien unangetastet
5. Committen und pushen, Netlify deployt automatisch

Die Übersicht listet nur `status = 'published'`.

## Gestaltung ändern

`DESIGN-SYSTEM.md` beschreibt das System, `_engine/engine.css` und `_engine/render.mjs` setzen es
um. Danach `node _engine/build.mjs --alle`. Neue Decks bekommen die Änderung beim Bauen, jedes neu
gebaute Deck ebenfalls.

## Medien

Bilder und Videos werden **nicht** in diesem Repo abgelegt, sondern über den Media Manager
(media.insiderki.ai) in den Supabase-Bucket `workshop-assets` geladen. Die Decks holen sie beim
Laden automatisch.

`media_kind` in `presentation_slots` ist nur `image`, `video` oder `any`. Das gewünschte Format
gehört deshalb ins `label`.

## Prüfen

`node _engine/build.mjs <slug>` prüft Pflichtfelder, nicht darstellbare Felder, Sprungziele, Slots,
Icons und Textlängen. Im Browser auf
der Deck-Seite prüft `__deck.audit()`, ob auf jeder Folie alles Platz hat, und `__deck.go(5, 2)`
springt auf Folie 5, Schritt 2. `slide_count` und Slots in Supabase setzt das SQL passend.

## Lizenzen

Switzer (Fontshare FFL), Bebas Neue (OFL), Lucide-Icons (ISC), marked (MIT). Details in
`_engine/fonts/` und `_engine/vendor/`.
