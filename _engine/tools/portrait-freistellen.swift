import Foundation
import AppKit
import Vision
import CoreImage

// Stellt ein Porträt auf hellem Grund frei (Motiv-Erkennung von macOS, läuft lokal).
// Der helle Saum an den Kanten wird herausgerechnet, sonst leuchtet er auf dunklem Grund.
// Aufruf: swift portrait-freistellen.swift <original> <ausgabe ohne Endung> [maxHoehe]
// Erzeugt <ausgabe>.jpg und <ausgabe>-maske.png
let args = CommandLine.arguments
guard args.count >= 3 else {
    print("Aufruf: swift portrait-freistellen.swift <original> <ausgabe> [maxHoehe]")
    exit(1)
}
let url = URL(fileURLWithPath: args[1])
let maxHoehe = args.count > 3 ? Int(args[3]) ?? 1200 : 1200

guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
      let original = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("Bild nicht lesbar"); exit(1) }
let w = original.width, h = original.height

let handler = VNImageRequestHandler(cgImage: original, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let obs = request.results?.first else { print("Kein Motiv erkannt"); exit(1) }
let maskBuf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)

// Maske und Bild in gleich große 8-Bit-Puffer legen
let space = CGColorSpace(name: CGColorSpace.sRGB)!
let ci = CIContext(options: [.workingColorSpace: NSNull()])
var maske = [UInt8](repeating: 0, count: w * h * 4)
let ciMaske = CIImage(cvPixelBuffer: maskBuf)
ci.render(ciMaske, toBitmap: &maske, rowBytes: w * 4, bounds: CGRect(x: 0, y: 0, width: w, height: h), format: .RGBA8, colorSpace: nil)

let info = CGImageAlphaInfo.premultipliedLast.rawValue
let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: space, bitmapInfo: info)!
ctx.draw(original, in: CGRect(x: 0, y: 0, width: w, height: h))
let px = ctx.data!.bindMemory(to: UInt8.self, capacity: w * h * 4)

// Kante leicht nach innen ziehen, dann das Weiß aus den halbtransparenten Pixeln herausrechnen.
var oben = h, unten = 0, links = w, rechts = 0
for y in 0..<h {
    for x in 0..<w {
        let i = (y * w + x) * 4
        let roh = Double(maske[i]) / 255
        let a = min(1, max(0, (roh - 0.35) / 0.55))
        if a <= 0 {
            px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = 0
            continue
        }
        for k in 0..<3 {
            let wert = Double(px[i + k])
            let vorn = min(255, max(0, (wert - (1 - a) * 255) / a))
            px[i + k] = UInt8(vorn * a)   // vormultipliziert speichern
        }
        px[i + 3] = UInt8(a * 255)
        if a > 0.1 { oben = min(oben, y); unten = max(unten, y); links = min(links, x); rechts = max(rechts, x) }
    }
}

// Auf das Motiv zuschneiden und verkleinern
let cut = ctx.makeImage()!.cropping(to: CGRect(x: links, y: oben, width: rechts - links + 1, height: unten - oben + 1))!
let f = min(1, Double(maxHoehe) / Double(cut.height))
let zw = Int(Double(cut.width) * f), zh = Int(Double(cut.height) * f)
let klein = CGContext(data: nil, width: zw, height: zh, bitsPerComponent: 8, bytesPerRow: zw * 4, space: space, bitmapInfo: info)!
klein.interpolationQuality = .high
klein.draw(cut, in: CGRect(x: 0, y: 0, width: zw, height: zh))
let q = klein.data!.bindMemory(to: UInt8.self, capacity: zw * zh * 4)

// Farbe und Form getrennt: Ein PNG mit Transparenz waere rund 1,4 MB schwer. JPEG kennt keine Transparenz,
// also liegt die Farbe auf dunklem Grund und die Form steckt in der Maske, samt Auslauf nach unten.
let bildCtx = CGContext(data: nil, width: zw, height: zh, bitsPerComponent: 8, bytesPerRow: zw * 4, space: space, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
let maskCtx = CGContext(data: nil, width: zw, height: zh, bitsPerComponent: 8, bytesPerRow: zw * 4, space: space, bitmapInfo: info)!
let bild = bildCtx.data!.bindMemory(to: UInt8.self, capacity: zw * zh * 4)
let form = maskCtx.data!.bindMemory(to: UInt8.self, capacity: zw * zh * 4)
let auslauf = 0.30   // unterer Anteil des Bildes, der ins Dunkel laeuft
for y in 0..<zh {
    let t = min(1, Double(zh - 1 - y) / (auslauf * Double(zh)))
    let weich = t * t * (3 - 2 * t)
    for x in 0..<zw {
        let i = (y * zw + x) * 4
        let a = Double(q[i + 3]) / 255
        for k in 0..<3 {
            bild[i + k] = a > 0 ? UInt8(min(255, Double(q[i + k]) / a)) : 10
        }
        bild[i + 3] = 255
        let m = a * weich
        for k in 0..<3 { form[i + k] = UInt8(m * 255) }
        form[i + 3] = UInt8(m * 255)
    }
}
let basis = URL(fileURLWithPath: args[2]).deletingPathExtension().path
func schreiben(_ c: CGContext, _ pfad: String, _ typ: String, _ opt: [CFString: Any] = [:]) {
    let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: pfad) as CFURL, typ as CFString, 1, nil)!
    CGImageDestinationAddImage(d, c.makeImage()!, opt as CFDictionary)
    CGImageDestinationFinalize(d)
}
schreiben(bildCtx, basis + ".jpg", "public.jpeg", [kCGImageDestinationLossyCompressionQuality: 0.82])
schreiben(maskCtx, basis + "-maske.png", "public.png")
print("Porträt: \(zw) x \(zh)")
