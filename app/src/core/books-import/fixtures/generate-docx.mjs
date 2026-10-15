// Recria o exemplo pequeno sem Word nem acesso à rede: node app/src/core/books-import/fixtures/generate-docx.mjs
import { readFile, writeFile } from "node:fs/promises"
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, ImageRun, LevelFormat } from "docx"
const png = await readFile(new URL("../../../assets/runa.png", import.meta.url))
const doc = new Document({
  numbering: { config: [{ reference: "lista", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [{ children: [
    new Paragraph({ text: "A Chegada", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun({ text: "Negrito", bold: true }), new TextRun(" e "), new TextRun({ text: "itálico", italics: true })] }),
    new Paragraph({ text: "Preparação", heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: "Levar corda", numbering: { reference: "lista", level: 0 } }),
    new Paragraph({ text: "Levar luz", numbering: { reference: "lista", level: 0 } }),
    new Table({ rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph("Item")] }), new TableCell({ children: [new Paragraph("Valor")] })] }), new TableRow({ children: [new TableCell({ children: [new Paragraph("Cristal")] }), new TableCell({ children: [new Paragraph("50")] })] })] }),
    new Paragraph({ children: [new ImageRun({ type: "png", data: png, transformation: { width: 120, height: 120 } })] }),
    new Paragraph({ text: "O Retorno", heading: HeadingLevel.HEADING_1 }),
    new Paragraph("O grupo volta para casa."),
  ] }],
})
await writeFile(new URL("exemplo.docx", import.meta.url), await Packer.toBuffer(doc))
