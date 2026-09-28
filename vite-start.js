import { createServer } from 'vite'

const server = await createServer({
  server: {
    middlewareMode: false,
    port: 5173,
    host: '0.0.0.0'
  }
})

await server.listen()
console.log('Vite server is running on http://localhost:5173')
