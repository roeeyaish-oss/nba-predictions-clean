import { defineConfig, presetAttributify, presetIcons } from 'unocss'
import presetWind3 from '@unocss/preset-wind3'

export default defineConfig({
  theme: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    },
  },
  presets: [
    presetWind3(),
    presetAttributify(),
    presetIcons(),
  ],
})
