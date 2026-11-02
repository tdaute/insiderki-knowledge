import Foundation
import AppKit

// Stellt das KNOWLEDGE-Logo vom schwarzen Grund frei und schneidet Gesamtlogo und Symbol zu.
// Die Helligkeit wird zur Deckkraft: Auf Schwarz sieht es aus wie das Original, auf anderem Grund
// bleibt kein Kasten stehen und der Schein laeuft weich aus.
// Aufruf: swift logo-aufbereiten.swift <original> <ausgabeordner>
let args = CommandLine.arguments
guard args.count == 3,
      let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, nil),
      let original = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    print("Aufruf: swift logo-aufbereiten.swift <original> <ausgabeordner>")
    exit(1)
}
let outDir = args[2]
let w = original.width, h = original.height
let space = CGColorSpace(name: CGColorSpace.sRGB)!
let info = CGImageAlphaInfo.premultipliedLast.rawValue
let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: space, bitmapInfo: info)!
ctx.draw(original, in: CGRect(x: 0, y: 0, width: w, height: h))
let px = ctx.data!.bindMemory(to: UInt8.self, capacity: w * h * 4)

// Der Grund des Originals rauscht leicht, darunter wird alles voll transparent.
let boden = 10.0
for i in 0..<(w * h) {
    let r = Double(px[i * 4]), g = Double(px[i * 4 + 1]), b = Double(px[i * 4 + 2])
    let hell = max(r, g, b)
    let a = max(0, (hell - boden) * 255 / (255 - boden))
    let f = hell > 0 ? a / hell : 0
    px[i * 4] = UInt8(r * f); px[i * 4 + 1] = UInt8(g * f); px[i * 4 + 2] = UInt8(b * f); px[i * 4 + 3] = UInt8(a)
}

// Lage suchen. Zeile 0 im Speicher ist die oberste Bildzeile.
let schwelle: UInt8 = 28
func alpha(_ x: Int, _ y: Int) -> UInt8 { px[(y * w + x) * 4 + 3] }
func spalteBelegt(_ x: Int) -> Bool { (0..<h).contains { alpha(x, $0) > schwelle } }
func box(_ x0: Int, _ x1: Int) -> (Int, Int, Int, Int) {
    var top = h, bottom = 0, left = w, right = 0
    for y in 0..<h { for x in x0...x1 where alpha(x, y) > schwelle {
        top = min(top, y); bottom = max(bottom, y); left = min(left, x); right = max(right, x)
    } }
    return (left, top, right, bottom)
}
let belegt = (0..<w).filter(spalteBelegt)
guard let erste = belegt.first, let letzte = belegt.last else { print("Kein Logo gefunden"); exit(1) }

// Das Symbol endet an der ersten Luecke von mindestens 25 Spalten.
var symbolEnde = erste
for x in belegt { if x - symbolEnde >= 25 { break }; symbolEnde = x }

func speichern(_ b: (Int, Int, Int, Int), rand: Int, breite: Int, quadrat: Bool, name: String) {
    var (l, t, r, u) = (b.0 - rand, b.1 - rand, b.2 + rand, b.3 + rand)
    if quadrat {
        let seite = max(r - l, u - t)
        let cx = (l + r) / 2, cy = (t + u) / 2
        (l, t, r, u) = (cx - seite / 2, cy - seite / 2, cx + seite / 2, cy + seite / 2)
    }
    l = max(l, 0); t = max(t, 0); r = min(r, w - 1); u = min(u, h - 1)
    let cut = ctx.makeImage()!.cropping(to: CGRect(x: l, y: t, width: r - l + 1, height: u - t + 1))!
    let zielB = min(breite, cut.width)
    let zielH = Int((Double(cut.height) * Double(zielB) / Double(cut.width)).rounded())
    let out = CGContext(data: nil, width: zielB, height: zielH, bitsPerComponent: 8, bytesPerRow: zielB * 4, space: space, bitmapInfo: info)!
    out.interpolationQuality = .high
    out.draw(cut, in: CGRect(x: 0, y: 0, width: zielB, height: zielH))
    let url = URL(fileURLWithPath: "\(outDir)/\(name)") as CFURL
    let dest = CGImageDestinationCreateWithURL(url, "public.png" as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, out.makeImage()!, nil)
    CGImageDestinationFinalize(dest)
    print("\(name): \(zielB) x \(zielH)")
}

let rand = w / 90
speichern(box(erste, letzte), rand: rand, breite: 1000, quadrat: false, name: "logo-voll.png")
speichern(box(erste, symbolEnde), rand: rand, breite: 256, quadrat: true, name: "logo-symbol.png")
