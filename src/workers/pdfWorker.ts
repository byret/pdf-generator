import { jsPDF } from 'jspdf'

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })

self.onmessage = async (e) => {
  const { sizeMB, mode } = e.data
  const targetSize = sizeMB * 1024 * 1024
  const doc = new jsPDF()
  let blobSize = 0
  let pageCount = 0
  let y = 10

  while (blobSize < targetSize * 0.95 && pageCount < 1000) {
    if (mode === 'text') {
      const textLine = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
      doc.text(textLine, 10, y)
      y += 10
      if (y > 280) {
        doc.addPage()
        y = 10
        pageCount++
      }
    } else if (mode === 'image') {
      const canvas = new OffscreenCanvas(300, 300)
      const ctx = canvas.getContext('2d')!

      const imageData = ctx.createImageData(300, 300)
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = Math.random() * 255
        imageData.data[i + 1] = Math.random() * 255
        imageData.data[i + 2] = Math.random() * 255
        imageData.data[i + 3] = 255
      }
      ctx.putImageData(imageData, 0, 0)

      const blob = await canvas.convertToBlob()
      const base64Image = await blobToBase64(blob)

      doc.addImage(base64Image, 'PNG', 0, 0, 210, 297)
      doc.addPage()
      pageCount++
    }

    const blob = doc.output('blob')
    blobSize = blob.size
    self.postMessage({ progress: Math.min(100, Math.round((blobSize / targetSize) * 100)) })
    await sleep(1)
  }

  const pdfBytes = doc.output('arraybuffer') as ArrayBuffer
  const pdfArray = new Uint8Array(pdfBytes)
  const missingBytes = targetSize - pdfArray.length
  const filler = new Uint8Array(missingBytes > 0 ? missingBytes : 0)
  filler.fill(0x20)

  const finalBytes = new Uint8Array(pdfArray.length + filler.length)
  finalBytes.set(pdfArray)
  finalBytes.set(filler, pdfArray.length)

  const finalBlob = new Blob([finalBytes], { type: 'application/pdf' })
  self.postMessage({ done: true, blob: finalBlob })
}
