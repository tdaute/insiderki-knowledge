#!/usr/bin/env python3
"""Liest eine alte Praesentation fuer den präsentation_agent ein.

Aufruf:  python3 -I _engine/tools/quelle-lesen.py <datei> <ausgabeordner>

PPTX  quelle.md (Text und Notizen je Folie), medien/ (eingebettete Bilder und Videos)
PDF   quelle.md (Text je Seite), seiten/ (ein Bild je Seite, nur auf dem Mac)
HTML  quelle.html (Quelltext der Folien ohne Base64), quelle.md (Slots), medien/ (eingebettete Bilder)

Nur Standardbibliothek, damit es auf allen Rechnern ohne Installation laeuft.
"""
import base64
import gzip
import json
import posixpath
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
P = '{http://schemas.openxmlformats.org/presentationml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
REL = '{http://schemas.openxmlformats.org/package/2006/relationships}'
ZEILE = 250000  # EMU, rund 0,7 cm. Formen innerhalb dieser Hoehe gelten als eine Zeile


WARNWOERTER = re.compile(r'\b(vertraulich\w*|confidential\w*|streng geheim|geheimhaltung|nda|nur intern|internal use|sensitivity|msip_label\w*)\b', re.I)


def warnung(text, wo):
    """Hinweise auf vertrauliches Material. Der Agent stoppt dann und fragt."""
    treffer = sorted({m.group(0) for m in WARNWOERTER.finditer(text)})
    if treffer:
        return f'ACHTUNG, moeglicherweise vertraulich ({wo}): ' + ', '.join(treffer)
    return ''


def absatz_text(para):
    teile = []
    for el in para:
        if el.tag in (A + 'r', A + 'fld'):
            t = el.find(A + 't')
            teile.append(t.text or '' if t is not None else '')
        elif el.tag == A + 'br':
            teile.append(' ')
    return ''.join(teile).strip()


def absaetze(root):
    return [t for t in (absatz_text(p) for p in root.iter(A + 'p')) if t]


def lage(el, kind):
    xfrm = el.find(f'{P}{kind}/{A}xfrm') if kind else el.find(P + 'xfrm')
    off = xfrm.find(A + 'off') if xfrm is not None else None
    if off is None:
        return None
    return int(off.get('x', 0)), int(off.get('y', 0))


def bloecke(baum):
    """Zerlegt die Formen einer Folie in Bloecke: (x, y, [Zeilen])."""
    out = []
    for i, el in enumerate(baum):
        if el.tag == P + 'sp':
            zeilen = absaetze(el)
            if not zeilen:
                continue
            ph = el.find(f'{P}nvSpPr/{P}nvPr/{P}ph')
            titel = ph is not None and ph.get('type') in ('title', 'ctrTitle')
            pos = lage(el, 'spPr') or (0, -ZEILE if titel else ZEILE)
            out.append((pos[0], pos[1], i, zeilen))
        elif el.tag == P + 'grpSp':
            pos = lage(el, 'grpSpPr') or (0, 1)
            innen = sorted(bloecke(el), key=lambda b: (round(b[1] / ZEILE), b[0], b[2]))
            zeilen = [z for b in innen for z in b[3]]
            if zeilen:
                out.append((pos[0], pos[1], i, zeilen))
        elif el.tag == P + 'graphicFrame':
            pos = lage(el, '') or (0, 1)
            tabelle = el.find(f'.//{A}tbl')
            if tabelle is not None:
                zeilen = [' | '.join(' '.join(absaetze(z)) for z in r.findall(A + 'tc')) for r in tabelle.findall(A + 'tr')]
                out.append((pos[0], pos[1], i, zeilen))
            else:
                out.append((pos[0], pos[1], i, ['[Diagramm oder Grafik: Inhalt hier nicht lesbar, Folienbild oder PDF noetig]']))
    return out


def lesereihenfolge(baum):
    """Von oben nach unten, innerhalb einer Hoehe von links nach rechts."""
    reihen = {}
    for x, y, i, zeilen in bloecke(baum):
        reihen.setdefault(round(y / ZEILE), []).append((x, i, zeilen))
    out = []
    for _, reihe in sorted(reihen.items()):
        reihe.sort(key=lambda b: (b[0], b[1]))
        if len(reihe) > 1 and all(len(b[2]) == 1 for b in reihe):
            out.append('- ' + ' | '.join(b[2][0] for b in reihe))
        else:
            for b in reihe:
                out.extend(f'- {z}' for z in b[2])
    return out


def rels_of(zf, part):
    d, f = posixpath.split(part)
    path = f'{d}/_rels/{f}.rels'
    if path not in zf.namelist():
        return {}
    root = ET.fromstring(zf.read(path))
    return {r.get('Id'): (r.get('Type', ''), posixpath.normpath(posixpath.join(d, r.get('Target', '')))) for r in root.iter(REL + 'Relationship')}


def metadaten(zf):
    out = []
    for teil, felder in (('docProps/core.xml', ('title', 'subject', 'creator', 'lastModifiedBy', 'keywords', 'description')),
                         ('docProps/app.xml', ('Company', 'Manager', 'Template'))):
        if teil in zf.namelist():
            for el in ET.fromstring(zf.read(teil)).iter():
                name = el.tag.split('}')[-1]
                if name in felder and (el.text or '').strip():
                    out.append(f'- {name}: {el.text.strip()}')
    if 'docProps/custom.xml' in zf.namelist():
        for el in ET.fromstring(zf.read('docProps/custom.xml')):
            wert = ''.join(el.itertext()).strip()
            if wert:
                out.append(f'- {el.get("name")}: {wert}')
    return out


def pptx(src, out):
    medien = out / 'medien'
    medien.mkdir(parents=True, exist_ok=True)
    body = []
    genutzt = set()
    with zipfile.ZipFile(src) as zf:
        meta = metadaten(zf)
        pres = ET.fromstring(zf.read('ppt/presentation.xml'))
        pres_rels = rels_of(zf, 'ppt/presentation.xml')
        schriften = sorted({f.get('typeface') for f in pres.iter(P + 'font') if f.get('typeface')})
        ids = [s.get(R + 'id') for s in pres.iter(P + 'sldId')]
        for no, rid in enumerate(ids, 1):
            part = pres_rels[rid][1]
            root = ET.fromstring(zf.read(part))
            rels = rels_of(zf, part)
            body.append(f'## Folie {no}' + (' (ausgeblendet)' if root.get('show') == '0' else ''))
            zeilen = lesereihenfolge(root.find(f'{P}cSld/{P}spTree'))
            body.extend(zeilen or ['(leer)'])
            for typ, target in rels.values():
                if typ.endswith('/image') or typ.endswith('/video') or typ.endswith('/media'):
                    if target in zf.namelist():
                        name = f'f{no:02d}_{posixpath.basename(target)}'
                        (medien / name).write_bytes(zf.read(target))
                        genutzt.add(target)
                        body.append(f'- [Medium: medien/{name}]')
                if typ.endswith('/notesSlide') and target in zf.namelist():
                    notes = [t for t in absaetze(ET.fromstring(zf.read(target))) if not t.isdigit()]
                    if notes:
                        body += ['', 'Notizen: ' + ' / '.join(notes)]
            body.append('')
        rest = [n for n in zf.namelist() if n.startswith('ppt/media/') and n not in genutzt]
    kopf = [f'# Quelle: {src.name}', '', '## Metadaten', ''] + (meta or ['- keine'])
    if schriften:
        kopf.append('- Eingebettete Schriften: ' + ', '.join(schriften))
    if rest:
        kopf.append(f'- {len(rest)} weitere Medien gehoeren zum alten Master und wurden bewusst nicht uebernommen')
    text = '\n'.join(kopf + [''] + body)
    (out / 'quelle.md').write_text(text, encoding='utf-8')
    print(f'PPTX: {len(ids)} Folien, {len(genutzt)} Medien auf Folien, {len(rest)} im Master')
    hinweis = warnung('\n'.join(meta) + '\n' + '\n'.join(body), 'Metadaten oder Folientext')
    if hinweis:
        print(hinweis)


def pdf(src, out):
    tool = Path(__file__).with_name('pdf-zu-bildern.swift')
    if sys.platform != 'darwin' or not shutil.which('swift'):
        print('PDF: Bilder nur auf dem Mac moeglich. Sonst den Skill anthropic-skills:pdf nutzen.')
        return
    seiten = out / 'seiten'
    seiten.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(['swift', str(tool), str(src), str(seiten), '1280', str(out / 'quelle.md')], capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())
    if r.returncode:
        sys.exit(r.returncode)
    hinweis = warnung((out / 'quelle.md').read_text(encoding='utf-8'), 'Metadaten oder Seitentext')
    if hinweis:
        print(hinweis)


def html(src, out):
    raw = src.read_text(encoding='utf-8', errors='replace')
    before = len(raw)
    medien = out / 'medien'
    medien.mkdir(parents=True, exist_ok=True)
    zaehler = [0]

    def sichern(typ, daten):
        zaehler[0] += 1
        name = f'bild{zaehler[0]:03d}.{typ.split("/")[-1].split("+")[0]}'
        (medien / name).write_bytes(daten)
        return name

    def ersetzen(m):
        return 'medien/' + sichern(m.group(1), base64.b64decode(m.group(2) + '=='))

    # Exporte aus Claude Design legen Bilder komprimiert in einem Manifest ab
    manifest = re.search(r'<script type="__bundler/manifest">(.*?)</script>', raw, re.S)
    if manifest:
        for eintrag in json.loads(manifest.group(1)).values():
            daten = base64.b64decode(eintrag.get('data', ''))
            if eintrag.get('compressed'):
                daten = gzip.decompress(daten)
            if eintrag.get('mime', '').startswith(('image/', 'video/')):
                sichern(eintrag['mime'], daten)
    # Exporte aus Claude Design stecken das eigentliche Deck in einen JSON-Block
    bundle = re.search(r'<script type="__bundler/template">(.*?)</script>', raw, re.S)
    if bundle:
        raw = json.loads(bundle.group(1))
    clean = re.sub(r'data:((?:image|video)/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+)=*', ersetzen, raw)
    clean = re.sub(r'data:[a-z]+/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+', 'data:ENTFERNT', clean)
    (out / 'quelle.html').write_text(clean, encoding='utf-8')
    slots = set(re.findall(r'data-slot="([A-Za-z0-9_-]+)"', clean))
    slots |= set(re.findall(r"""ph\(\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'([A-Za-z0-9_-]+)'\s*\)""", clean))
    art = 'Export aus Claude Design' if bundle else 'Einzeldatei'
    lines = [f'# Quelle: {src.name}', '', f'{art}. Aus {before} auf {len(clean)} Zeichen gekuerzt.', '',
             'Maßgeblich fuer Slots ist die Tabelle presentation_slots. Im Quelltext gefunden:', ''] + [f'- {s}' for s in sorted(slots)]
    (out / 'quelle.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'HTML ({art}): {len(clean)} Zeichen, {len(slots)} Slots, {zaehler[0]} Bilder. Folien stehen im Quelltext von quelle.html.')
    hinweis = warnung(clean, 'Quelltext')
    if hinweis:
        print(hinweis)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, out = Path(sys.argv[1]).expanduser(), Path(sys.argv[2])
    if src.is_dir():
        src = src / 'index.html'
    if not src.exists():
        sys.exit(f'Nicht gefunden: {src}')
    out.mkdir(parents=True, exist_ok=True)
    kind = src.suffix.lower()
    if kind in ('.pptx', '.potx'):
        pptx(src, out)
    elif kind == '.pdf':
        pdf(src, out)
    elif kind in ('.html', '.htm'):
        html(src, out)
    elif kind == '.ppt':
        sys.exit('Altes .ppt-Format: bitte zuerst in PowerPoint oder Keynote als .pptx speichern.')
    else:
        sys.exit(f'Dateityp nicht unterstuetzt: {kind}')


if __name__ == '__main__':
    main()
