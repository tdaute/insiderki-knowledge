---
name: präsentation_agent
description: Startet den Bau eines KNOWLEDGE-Decks im Design v2 und fragt zuerst nach dem Modus (form, verdichten oder neu), jeweils mit Erklärung. Nutzen bei /präsentation_agent, wenn Tino den präsentation_agent beim Namen nennt oder eine Präsentation für knowledge.insiderki.ai neu aufbauen oder ins neue Design bringen will. Nicht für PowerPoint-Dateien ohne Bezug zu KNOWLEDGE.
argument-hint: "[Datei] [Modus]"
---

Tino will aus einer Quelle ein KNOWLEDGE-Deck bauen lassen. Die Modi kennt er nach ein paar Wochen nicht
mehr auswendig, deshalb kommt die Frage sofort und immer mit Erklärung.

Angaben aus dem Aufruf: $ARGUMENTS

## 1. Modus klären

Nennt der Aufruf oder seine Nachricht schon `form`, `verdichten` oder `neu`, gilt das und du fragst nicht.

Sonst ist `AskUserQuestion` dein erster Schritt, noch vor jedem anderen Werkzeug. Empfiehl keinen Modus und
leite ihn nicht aus der Datei ab, Tino entscheidet das je Deck.

Frage: „Welcher Modus für dieses Deck?“, Kurztitel „Modus“, eine Antwort.

| Option | Beschreibung |
|---|---|
| `form` | Für neue Decks. Dein Text bleibt Wort für Wort, er bekommt nur die neue Form. Volle Folien werden aufgeteilt. |
| `verdichten` | Für bewährte Decks. Der Text wird mindestens 25 % kürzer, Details wandern ins Handout. Aussagen, Zahlen und Fristen bleiben gleich. |
| `neu` | Für alte Decks. Das alte Deck ist nur noch Material und wird frei neu getextet. Fristen, Zahlen und Rechtsaussagen werden im Web geprüft. |

Gibt es `AskUserQuestion` nicht, stellst du dieselbe Frage samt den drei Erklärungen als Text und wartest.

## 2. Quelle klären

Fehlt die Quelle, frag danach im Chat: PPTX, PDF oder altes HTML-Deck, als Pfad oder per Drag-and-drop.
Word oder Keynote speichert Tino vorher als PDF. Prüfe, dass die Datei existiert.

## 3. Agent starten

Nimm das Werkzeug `Agent` mit `subagent_type: präsentation_agent`. Der Agent liegt im Repo, in Sitzungen aus
anderen Ordnern gibt es diesen Typ deshalb nicht. Meldet das Werkzeug das, nimmst du `general-purpose` und
beginnst den Auftrag mit:
„Lies `/Volumes/Daten/insiderki-knowledge/.claude/agents/präsentation_agent.md` vollständig und arbeite danach,
alles im Ordner `/Volumes/Daten/insiderki-knowledge`.“

Der Auftrag nennt Quelle und Modus, dazu Slug, Kunde und Datum, falls Tino sie genannt hat. Sag Tino in einer
Zeile, dass der Bau läuft.

## 4. Ergebnis weitergeben

Tino sieht den Bericht des Agenten nicht, gib ihn weiter: Pfad, Folienzahl, Prüfergebnis, offene Punkte. Der
Agent committet und veröffentlicht nichts. Das geschieht erst, wenn Tino es ausdrücklich freigibt.
