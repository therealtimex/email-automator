# Port Configuration

## Default Ports

Email Automator uses the following ports by default:

| Service | Default Port | Configurable |
|---------|-------------|--------------|
| Frontend (Vite) | 5173 | Yes (--port) |
| Express API | 3004 | Yes (--port or PORT env) |
| Edge Functions | via Supabase | N/A |

## Port Conflicts

**RealTimeX Desktop** uses ports **3001** and **3002**, so Email Automator defaults to **3004** to avoid conflicts.

## Changing Ports

### Frontend Port

```bash
# Via command line
npm run dev -- --port 5174

# Via environment variable
PORT=5174 npm run dev
```

### Express API Port

```bash
# Via command line
npm run dev:api -- --port 3005

# Via environment variable
PORT=3005 npm run dev:api
```

### Update Frontend API URL

If you change the Express API port, update the frontend configuration:

**.env:**
```bash
VITE_API_URL=http://localhost:3005
```

## Production Deployment

For production, set the ports via environment variables:

```bash
# Express API
PORT=3004 npm start

# Frontend (if serving)
PORT=5173 npm run preview
```

## Port Selection Best Practices

- **3001-3003**: Reserved for RealTimeX Desktop
- **3004**: Email Automator Express API (default)
- **5173**: Frontend dev server (Vite default)
- **8000+**: Available for custom services

## Troubleshooting

### "Port already in use" Error

```bash
# Check what's using a port (macOS/Linux)
lsof -i :3004

# Kill process on port
kill -9 $(lsof -ti :3004)

# Or use a different port
npm run dev:api -- --port 3005
```

### Frontend can't connect to API

1. Verify API is running: `curl http://localhost:3004/api/health`
2. Check VITE_API_URL matches API port
3. Restart frontend after changing .env
