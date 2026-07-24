# INSIDER.KI — KNOWLEDGE

Präsentationen und Workshop-Unterlagen.
Live: **https://knowledge.insiderki.ai**

## Struktur

```
index.html                      Übersicht (lädt live aus Supabase)
ki-kennzeichnungspflichten/     Art. 50 AI Act, 45 Folien
netlify.toml                    Header + Cache-Regeln
```

## Neue Präsentation hinzufügen

1. Ordner `<slug>/index.html` anlegen
2. In Supabase (`ai-governance`) eintragen:

```sql
insert into public.presentations (slug, title, description, client, status, html_path, slide_count)
values ('mein-slug','Titel','Beschreibung','Kunde','published','mein-slug/index.html', 30);
```

3. Committen und pushen — Netlify deployt automatisch

Die Indexseite listet nur `status = 'published'`. Entwürfe (`draft`) bleiben unsichtbar.

## Medien

Bilder und Videos werden **nicht** in diesem Repo abgelegt, sondern über den
Media Manager (media.insiderki.ai) in den Supabase-Bucket `workshop-assets`
geladen. Die Präsentationen holen sie beim Laden automatisch.

## Wichtig

HTML-Dateien immer per **GitHub "Upload files" (Drag-and-Drop)** ersetzen,
nie über den Web-Editor kopieren — das zerschießt die UTF-8-Umlaute.
