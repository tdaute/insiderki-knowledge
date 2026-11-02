#!/usr/bin/env python3
"""Prueft im Modus form, ob der Text eines Decks wortgleich zur Quelle ist.

Aufruf:  python3 -I _engine/tools/wortgleich.py _arbeit/<slug>/quelle/quelle.md <slug>/deck.json

Vergleicht die Woerter als Multimenge. Reihenfolge, Zeilenumbrueche, geschuetzte Leerzeichen und
Markierungen (*rot*, **fett**) spielen keine Rolle. Nicht gezaehlt werden Felder, die kein Folientext
sind, etwa label, description und notes. Was die Engine selbst setzt (Ordnungsziffern, "Schritt 1 von 5",
"Kapitel 1"), steht nicht in der deck.json und faellt hier nicht auf: Das regeln die Anweisungen.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

KEIN_FOLIENTEXT = {'type', 'label', 'id', 'glow', 'watermark', 'notes', 'steps', 'slug', 'title', 'description',
                   'client', 'event_date', 'lang', 'slot', 'ratio', 'kind', 'icon', 'tone', 'side', 'fit', 'to',
                   'highlight', 'columns_count', 'zoom', 'live', 'chapter', 'stepWord', 'media', 'ordinal_auto'}
WORT = re.compile(r"[0-9A-Za-zÄÖÜäöüß€%§'’-]+")


def woerter(text):
    return Counter(WORT.findall(text.replace(' ', ' ').replace(' ', ' ')))


def aus_quelle(path):
    zeilen = []
    im_kopf = False
    for z in Path(path).read_text(encoding='utf-8').splitlines():
        if z.startswith('## Metadaten'):
            im_kopf = True
            continue
        if z.startswith('## '):
            im_kopf = False
            continue
        if im_kopf or z.startswith(('# ', 'Notizen:', '- [Medium', '- [Diagramm')) or z.strip() == '(leer)':
            continue
        zeilen.append(re.sub(r'^\s*-\s', '', z).replace(' | ', ' '))
    return woerter('\n'.join(zeilen))


def strings(wert, schluessel=None):
    if schluessel in KEIN_FOLIENTEXT:
        return
    if isinstance(wert, dict):
        for k, v in wert.items():
            yield from strings(v, k)
    elif isinstance(wert, list):
        for v in wert:
            yield from strings(v)
    elif isinstance(wert, str):
        yield re.sub(r'\{(?:ok|warn|no):([^}]+)\}', r'\1', wert).replace('*', '')


def aus_deck(path):
    deck = json.loads(Path(path).read_text(encoding='utf-8'))
    return woerter('\n'.join(t for s in deck['slides'] for t in strings(s)))


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    quelle, deck = aus_quelle(sys.argv[1]), aus_deck(sys.argv[2])
    fehlt = quelle - deck
    neu = deck - quelle
    print(f'Quelle: {sum(quelle.values())} Woerter, Deck: {sum(deck.values())} Woerter')
    if fehlt:
        print('Fehlen im Deck:', ', '.join(f'{w} ({n})' if n > 1 else w for w, n in fehlt.most_common()))
    if neu:
        print('Neu im Deck:', ', '.join(f'{w} ({n})' if n > 1 else w for w, n in neu.most_common()))
    if fehlt or neu:
        sys.exit(1)
    print('Wortgleich.')


if __name__ == '__main__':
    main()
