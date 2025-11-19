import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
    ,
    hmr: {
      // Tell the client to connect to the service port (80) instead of the dev
      // server port inside the container (5173). When accessing the app via
      // the LoadBalancer/NodePort or port-forward, the browser will connect
      // to port 80 (or forwarded port) so the HMR websocket client must use
      // that external port.
      clientPort: 80
    }
  }
})