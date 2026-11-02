import Foundation
import PDFKit
import AppKit

// Rendert jede PDF-Seite als JPEG und schreibt den Text je Seite in eine Markdown-Datei.
// Aufruf: swift pdf-zu-bildern.swift <eingabe.pdf> <bildordner> <breite> [<text.md>]
let args = CommandLine.arguments
guard args.count >= 4,
      let doc = PDFDocument(url: URL(fileURLWithPath: args[1])),
      let maxWidth = Double(args[3]) else {
    print("Aufruf falsch oder PDF nicht lesbar")
    exit(1)
}
let outDir = args[2]
var text = "# Quelle: \(URL(fileURLWithPath: args[1]).lastPathComponent)\n\n## Metadaten\n\n"
for (key, value) in doc.documentAttributes ?? [:] {
    if let k = key as? PDFDocumentAttribute, let v = value as? String, !v.isEmpty { text += "- \(k.rawValue): \(v)\n" }
}
text += "\n"

for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let bounds = page.bounds(for: .mediaBox)
    let scale = maxWidth / Double(bounds.width)
    let size = NSSize(width: Double(bounds.width) * scale, height: Double(bounds.height) * scale)
    let img = page.thumbnail(of: size, for: .mediaBox)
    if let tiff = img.tiffRepresentation,
       let rep = NSBitmapImageRep(data: tiff),
       let jpg = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.72]) {
        try? jpg.write(to: URL(fileURLWithPath: String(format: "%@/s%02d.jpg", outDir, i + 1)))
    }
    text += "## Seite \(i + 1)\n\n\(page.string ?? "")\n\n"
}
if args.count >= 5 {
    try? text.write(toFile: args[4], atomically: true, encoding: .utf8)
}
print("PDF: \(doc.pageCount) Seiten")
