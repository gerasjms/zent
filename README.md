# Finanzas — Control total de tu dinero

App personal de finanzas que sincroniza BBVA, Mercado Pago, ARQ y Edenred en un solo lugar, con motor de presupuesto 50/30/20 y recomendaciones automáticas de cuentas.

## Stack

- **Frontend/Backend**: Next.js 15 (App Router, TypeScript)
- **Auth + DB**: Supabase (Google OAuth + PostgreSQL)
- **UI**: shadcn/ui + Tailwind CSS + Recharts
- **Deploy**: Vercel (con Cron Jobs cada 4h para auto-sync)

## Configuración inicial (paso a paso)

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el archivo `supabase/schema.sql`
3. Ve a **Authentication → Providers → Google** y habilita Google OAuth:
   - Necesitas un OAuth Client ID de [Google Cloud Console](https://console.cloud.google.com)
   - URI de redirección: `https://TU_PROJECT_ID.supabase.co/auth/v1/callback`
4. Copia tus credenciales desde **Settings → API**

### 2. BBVA API Market México

1. Regístrate en [bbvaapimarket.com](https://www.bbvaapimarket.com/en/register/)
2. Crea una nueva aplicación → selecciona las APIs: **Accounts**, **Balances**, **Transactions**
3. Configura el Redirect URI: `https://tu-app.vercel.app/api/bbva/callback`
4. Copia el `Client ID` y `Client Secret`

### 3. Mercado Pago

1. Entra a [mercadopago.com.mx/developers/panel/app](https://www.mercadopago.com.mx/developers/panel/app)
2. Crea una nueva aplicación
3. En **Credenciales de producción**, copia el `Client ID` y `Client Secret`
4. Agrega el Redirect URI: `https://tu-app.vercel.app/api/mercadopago/callback`

### 4. Variables de entorno

Copia `.env.example` a `.env.local` y llena todos los valores:

```bash
cp .env.example .env.local
```

### 5. Deploy en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variables de entorno en Vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add BBVA_CLIENT_ID
vercel env add BBVA_CLIENT_SECRET
vercel env add BBVA_REDIRECT_URI        # https://tu-app.vercel.app/api/bbva/callback
vercel env add MP_CLIENT_ID
vercel env add MP_CLIENT_SECRET
vercel env add MP_REDIRECT_URI          # https://tu-app.vercel.app/api/mercadopago/callback
vercel env add CRON_SECRET              # string aleatorio largo

# Deploy a producción
vercel --prod
```

El `vercel.json` ya incluye el Cron Job que sincroniza automáticamente cada 4 horas.

### 6. Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Funcionalidades

| Feature | Estado |
|---------|--------|
| Auth con Google (Supabase) | ✅ |
| Dashboard con presupuesto 50/30/20 | ✅ |
| BBVA → OAuth2 + sync automático | ✅ |
| Mercado Pago → OAuth2 + sync automático | ✅ |
| ARQ → importación CSV | ✅ |
| Edenred → importación CSV | ✅ |
| Historial con filtros avanzados | ✅ |
| Motor de recomendaciones de cuentas | ✅ |
| Cron Job cada 4h (Vercel) | ✅ |
| Auto-categorización por palabras clave | ✅ |
| Gráficas de tendencia 6 meses | ✅ |
| Transferencias sin doble conteo | ✅ |
| Modo mobile (nav inferior) | ✅ |
