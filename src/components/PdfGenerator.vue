<template>
  <div class="pdf-generator">
    <div class="panel">
      <h1>PDF Generator</h1>

      <label for="size">Size (MB)</label>
      <input id="size" type="number" v-model.number="sizeMB" min="1" max="1000" />

      <div class="content-type">
        <label>
          <input type="radio" value="text" v-model="mode" />
          Text <small>(better for small files)</small>
        </label>
        <label>
          <input type="radio" value="image" v-model="mode" />
          Images
        </label>
      </div>

      <button :disabled="isGenerating" @click="generatePdf">
        {{ isGenerating ? "Generating..." : "Generate PDF" }}
      </button>

      <div class="progress" v-if="isGenerating">
        <div class="bar" :style="{ width: progress + '%' }"></div>
      </div>

      <p v-if="status" class="status">{{ status }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import '@/styles/PdfGenerator.css'

const PdfWorker = new Worker(new URL('@/workers/pdfWorker.ts', import.meta.url), {
  type: 'module'
})

const sizeMB = ref<number>(1)
const mode = ref<'text' | 'image'>('text')
const status = ref<string>('')
const isGenerating = ref<boolean>(false)
const progress = ref<number>(0)

const generatePdf = () => {
  isGenerating.value = true
  progress.value = 0
  status.value = 'Generating...'

  PdfWorker.postMessage({ sizeMB: sizeMB.value, mode: mode.value })

  PdfWorker.onmessage = (event) => {
    const { progress: p, done, blob } = event.data

    if (p !== undefined) {
      progress.value = p
      status.value = `Generating... ${p}%`
    }

    if (done && blob) {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `generated-${sizeMB.value}MB.pdf`
      link.click()
      URL.revokeObjectURL(url)

      status.value = `PDF generated: ${(blob.size / 1024 / 1024).toFixed(2)} MB`
      isGenerating.value = false
    }
  }
}
</script>
