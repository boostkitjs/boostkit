import type { Config } from 'vike/types'
import vikePhoton from 'vike-photon/config'
import vikeReact from 'vike-react/config'

export default {
  extends: [vikePhoton, vikeReact],
  photon: {
    server: 'bootstrap/app.ts',
  },
} as unknown as Config
