# INSIDER.KI — KNOWLEDGE

Präsentationen und Workshop-Unterlagen.
Live: **https://knowledge.insiderki.ai**

## Struktur

```
index.html                      Übersicht (lädt live aus Supabase)
DESIGN-SYSTEM.md                Verbindliche Gestaltungsgrundlage
_vorlage/index.html             Master-Vorlage mit allen Layouts
ki-kennzeichnungspflichten/     Art. 50 AI Act, 45 Folien
netlify.toml                    Header + Cache-Regeln
```

Jede Präsentation ist **eine** Datei unter `<slug>/index.html`. Keine externen
CSS- oder JS-Dateien, keine Bilder im Repo.

## Neue Präsentation anlegen

1. `_vorlage/index.html` nach `<slug>/index.html` kopieren
2. Platzhalter in doppelten geschweiften Klammern ersetzen, `PRES_SLUG` und
   `NAV` oben im Script setzen
3. Demo-Folien durch echte ersetzen — die Bausteine sind in `DESIGN-SYSTEM.md`
   Abschnitt 5 dokumentiert und in der Vorlage einmal durchgespielt
4. In Supabase (`ai-governance`) eintragen:

```sql
insert into public.presentations (slug, title, description, client, status, html_path, slide_count)
values ('mein-slug','Titel','Beschreibung','Kunde','published','mein-slug/index.html', 30);
```

5. Bildplätze anlegen — je `ph(..., ..., 'slotKey')` eine Zeile:

```sql
insert into public.presentation_slots
  (presentation_id, slot_key, slide_number, slide_title, label, media_kind, sort_order)
select p.id, 'meinSlot', 5, 'Folientitel', 'Beschreibung (16:9)', 'image', 0
from public.presentations p where p.slug = 'mein-slug';
```

6. Committen und pushen — Netlify deployt automatisch

Die Indexseite listet nur `status = 'published'`. Entwürfe (`draft`) bleiben
unsichtbar.

## Vorlage öffnen

`https://knowledge.insiderki.ai/_vorlage/` zeigt alle Layouts als lauffähiges
Deck. Der Ordner ist von der Indexierung ausgenommen und erscheint nicht in der
Übersicht.

## Gestaltung ändern

`DESIGN-SYSTEM.md` ist die Quelle für Farben, Typografie, Raster und
Komponenten. Änderungen dort werden anschließend in `_vorlage/index.html`
nachgezogen; bestehende Decks bleiben, wie sie sind, bis sie bewusst
nachgezogen werden.

Für Entwürfe lässt sich das Repo in **Claude Design** als Codebase verbinden.
Claude Design liest `DESIGN-SYSTEM.md` und die Vorlage aus und entwirft neue
Folien im bestehenden Stil. Ergebnisse werden als Code zurück in die Vorlage
oder in ein Deck übernommen — Claude Design ist der Entwurfsraum, das Repo
bleibt die Quelle.

## Medien

Bilder und Videos werden **nicht** in diesem Repo abgelegt, sondern über den
Media Manager (media.insiderki.ai) in den Supabase-Bucket `workshop-assets`
geladen. Die Präsentationen holen sie beim Laden automatisch.

`media_kind` in `presentation_slots` ist **kein** Seitenverhältnis, sondern nur
`image` / `video` / `any`. Der Zuschnitt steckt in den CSS-Klassen `r169`, `r34`,
`r11`. Damit im Media Manager sichtbar ist, was gebraucht wird, gehört das
Format ins `label`.

## Prüfen vor dem Ausliefern

```bash
npm install jsdom
node -e "
const {JSDOM}=require('jsdom'),fs=require('fs');
const dom=new JSDOM(fs.readFileSync('<slug>/index.html','utf8'),{runScripts:'dangerously'});
setTimeout(()=>{
  const d=dom.window.document;
  console.log('Folien:', d.querySelectorAll('.slide').length);
  console.log('Slots:', new Set([...d.querySelectorAll('[data-slot]')].map(e=>e.dataset.slot)).size);
},600);"
```

Folienzahl muss zur `slide_count` in Supabase passen, die Slot-Zahl zur Anzahl
der Zeilen in `presentation_slots`.

## Wichtig

HTML-Dateien immer per **GitHub „Upload files" (Drag-and-Drop)** ersetzen,
nie über den Web-Editor kopieren — das zerschießt die UTF-8-Umlaute.
