# KioskoPlus — Contexto completo del proyecto

## ¿Qué es esto?
Sistema de gestión integral para kioscos argentinos. Web app con 3 roles separados e independientes:
- **Cliente**: tienda pública, carrito, pago con Mercado Pago
- **Empleado**: ventas, escáner, inventario básico, cierre de caja
- **Administrador**: dashboard analytics profesional, inventario completo, gestión de empleados, reportes

## Stack tecnológico
- **Framework**: Next.js 16.2.2 App Router + TypeScript (estricto)
- **Estilos**: Tailwind CSS
- **Estado global**: Zustand (con persist)
- **Backend/DB**: Supabase (PostgreSQL + Auth JWT + RLS + Realtime + Storage)
- **Auth**: Supabase Auth con JWT — rol leído SIEMPRE desde profiles.role en DB, nunca del JWT metadata
- **Validación**: Zod en cliente y servidor
- **Formularios**: react-hook-form + Zod resolver
- **Pagos**: Mercado Pago Checkout Pro — credenciales APP_USR con modo test
- **Escáner**: Quagga2 (cámara) o lector USB (input nativo)
- **Gráficos**: Recharts
- **Iconos**: lucide-react
- **Deploy**: Vercel (CI/CD desde GitHub)
- **Idioma de la UI**: Español argentino

## Seguridad de roles (3 capas, no negociable)

### Capa 1 — proxy.ts (Next.js 16 renombró middleware.ts a proxy.ts)
- Lee rol desde profiles en Supabase usando service role key (bypasea RLS)
- /empleados/* requiere role empleado o admin
- /admin/* requiere role admin
- Rutas públicas no tocan la DB para no agregar latencia
- Mismatch redirect a / inmediato

### Capa 2 — Layout server-side
- app/(empleados)/layout.tsx y app/(admin)/layout.tsx verifican rol con getRole() desde lib/auth.ts
- getRole() lee desde profiles en DB, nunca del JWT

### Capa 3 — RLS en Supabase
- Políticas por tabla que bloquean queries según JWT
- Service role key solo en server-side

## Bugs resueltos (no repetir)
- Hydration error NavbarTienda: badge del carrito usa useState(mounted) + useEffect
- Middleware deprecado: renombrado a proxy.ts con export async function proxy()
- Rol leído del JWT: getRole() y proxy.ts leen de profiles.role en DB
- RLS bloqueaba middleware: proxy.ts usa service role client para leer profiles
- MP auto_return en localhost: se omite auto_return cuando APP_URL contiene localhost
- useSearchParams sin Suspense: páginas de pago envueltas en Suspense
- Profile no creado por trigger: insertar manualmente si el trigger falla

## Estructura de carpetas
```
kioskoplus/
├── CLAUDE.md
├── .env.local
├── proxy.ts                     <- protección de rutas por rol (Next.js 16)
├── app/
│   ├── layout.tsx
│   ├── admin/page.tsx           <- redirect a /admin/dashboard
│   ├── empleados/page.tsx       <- redirect a /empleados/ventas
│   ├── (public)/
│   │   ├── page.tsx             <- tienda principal
│   │   ├── login/page.tsx
│   │   ├── registro/page.tsx
│   │   └── pago/exitoso|fallido|pendiente/page.tsx
│   ├── (empleados)/
│   │   ├── layout.tsx
│   │   ├── ventas/page.tsx
│   │   ├── inventario/page.tsx
│   │   └── caja/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx   <- REHACER (ver tarea actual)
│   │   ├── productos/page.tsx
│   │   ├── inventario/page.tsx
│   │   ├── analiticas/page.tsx  <- REHACER (ver tarea actual)
│   │   └── empleados/page.tsx
│   └── api/
│       ├── auth/login/route.ts  <- POST login, DELETE logout
│       ├── auth/registro/route.ts
│       ├── products/route.ts
│       ├── sales/route.ts
│       ├── analytics/route.ts   <- EXPANDIR (ver tarea actual)
│       ├── mercadopago/preference/route.ts
│       └── mercadopago/webhook/route.ts
├── components/
│   ├── ui/                      <- Button, Input, Modal, Badge, ToastContainer
│   ├── tienda/                  <- ProductGrid, ProductCard, Cart, VariantPicker, CheckoutModal, NavbarTienda
│   ├── empleados/               <- SalesDashboard, Scanner, ClientVerify, CajaResumen, NavbarEmpleado
│   └── admin/                   <- TODOS NECESITAN REHACERSE (ver tarea actual)
├── lib/
│   ├── supabase/client.ts       <- createBrowserClient
│   ├── supabase/server.ts       <- createServerClient + createServiceClient
│   ├── supabase/middleware.ts   <- updateSession, expone { supabaseResponse, user, supabase }
│   ├── auth.ts                  <- getUser(), getRole() (lee de profiles DB), getProfile()
│   ├── validations.ts
│   └── mercadopago.ts           <- createPreference, isLocalhost check
├── store/cartStore.ts + uiStore.ts
├── types/index.ts
└── supabase/schema.sql + rls-policies.sql
```

## Schema de base de datos

### profiles
id uuid PK, role text (cliente|empleado|admin) default cliente
nombre text, apellido text, dni text unique, telefono text

### categories — 9 cargadas: Bebidas, Golosinas, Snacks, Lácteos, Infusiones, Panadería, Tabaco, Limpieza, Almacén

### products
id uuid PK, nombre text, category_id→categories, emoji text
precio decimal(10,2), unidad text (unid|kg|g|L|ml|pack)
stock integer, stock_minimo integer default 5, activo boolean
imagen_url text, barcode text unique, descripcion text
15 productos de ejemplo cargados

### product_variants
id uuid PK, product_id→products (cascade), nombre text
precio_extra decimal, stock integer, barcode text unique, activo boolean

### sales
id uuid PK, cliente_id→profiles (nullable), empleado_id→profiles
total decimal, metodo_pago (efectivo|mercadopago|transferencia)
mp_payment_id text, mp_status text
estado (pendiente|completada|cancelada) default completada

### sale_items
id uuid PK, sale_id→sales (cascade), product_id→products
variant_id→product_variants (nullable)
cantidad integer, precio_unitario decimal, subtotal decimal

### cash_sessions
id uuid PK, empleado_id→profiles
apertura timestamptz, cierre timestamptz
monto_apertura decimal, monto_cierre decimal
total_efectivo decimal, total_mp decimal, total_ventas integer
estado (abierta|cerrada)

## Variables de entorno (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://tu-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...tu-service-role-key (solo server)
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-xxxx-tu-mp-public-key
MP_ACCESS_TOKEN=APP_USR-xxxx-tu-mp-access-token (solo server)
NEXT_PUBLIC_APP_URL=http://localhost:3000

## TAREA ACTUAL: Admin Dashboard profesional completo

### Problema
El panel admin actual es básico. Necesita rehacerse completamente como herramienta profesional de gestión.

### Requerimientos

#### Selector de rango temporal (afecta todo el dashboard)
- Botones rápidos: Hoy | Ayer | Esta semana | Este mes | Este año
- Selector personalizado: fecha desde → hasta (date picker nativo HTML)
- Rango persistido en URL params ?desde=ISO&hasta=ISO
- Afecta TODOS los widgets simultáneamente

#### KPIs principales (cards superiores)
Para el rango seleccionado:
- Total vendido ($) + comparación vs período anterior con flecha y %
- Cantidad de transacciones + comparación
- Ticket promedio ($)
- Unidades totales vendidas
- Método de pago más usado (efectivo vs MP %)
- Hora pico del día (la hora con más ventas)

#### Gráfico de ventas dinámico
- Recharts ComposedChart: Bar para monto + Line para transacciones
- Eje X dinámico: horas si rango=1día, días si rango<=31días, meses si rango>31días
- Tooltip con formato ARS: Intl.NumberFormat('es-AR', {style:'currency', currency:'ARS'})
- Colores consistentes con el diseño del admin

#### Ranking productos más vendidos
- Top 10 por unidades vendidas en el rango
- Columnas: emoji, nombre, categoría, unidades, monto total, % del total
- Barra de progreso visual proporcional
- Badge de tendencia vs período anterior (subiendo/bajando)

#### Productos sin movimiento / bajas ventas
- Lista de productos con 0 ventas en el período seleccionado
- Productos con stock bajo (stock < stock_minimo) siempre visible
- Indicador visual de urgencia para stock crítico

#### Análisis por categoría
- PieChart/DonutChart de Recharts con ventas por categoría
- Tabla debajo: categoría, emoji, unidades, monto, %

#### Métodos de pago
- BarChart o cards: Efectivo vs MercadoPago vs Transferencia
- Monto y % de cada método para el rango

#### Ventas por empleado
- Tabla: nombre empleado, cantidad ventas, monto total, ticket promedio
- Solo visible si hay más de 1 empleado con ventas en el período

### API requerida: /api/analytics/route.ts
El endpoint debe aceptar: ?desde=ISO&hasta=ISO&tipo=kpis|productos|grafico|categorias|empleados

Queries SQL principales:
```sql
-- KPIs
SELECT COUNT(*) as transacciones, SUM(total) as total_vendido, AVG(total) as ticket_promedio
FROM sales WHERE created_at BETWEEN $desde AND $hasta AND estado = 'completada'

-- Productos más vendidos
SELECT p.id, p.nombre, p.emoji, c.nombre as categoria,
  SUM(si.cantidad) as unidades, SUM(si.subtotal) as monto
FROM sale_items si
JOIN products p ON p.id = si.product_id
JOIN sales s ON s.id = si.sale_id
JOIN categories c ON c.id = p.category_id
WHERE s.created_at BETWEEN $desde AND $hasta AND s.estado = 'completada'
GROUP BY p.id, p.nombre, p.emoji, c.nombre
ORDER BY unidades DESC LIMIT 10

-- Ventas por período (dinámico según rango)
SELECT date_trunc('hour'|'day'|'month', created_at) as periodo,
  COUNT(*) as transacciones, SUM(total) as monto
FROM sales WHERE created_at BETWEEN $desde AND $hasta AND estado = 'completada'
GROUP BY periodo ORDER BY periodo

-- Por categoría
SELECT c.nombre, c.emoji, SUM(si.cantidad) as unidades, SUM(si.subtotal) as monto
FROM sale_items si
JOIN products p ON p.id = si.product_id
JOIN categories c ON c.id = p.category_id
JOIN sales s ON s.id = si.sale_id
WHERE s.created_at BETWEEN $desde AND $hasta AND s.estado = 'completada'
GROUP BY c.nombre, c.emoji ORDER BY monto DESC

-- Por empleado
SELECT pr.nombre, pr.apellido,
  COUNT(s.id) as ventas, SUM(s.total) as monto, AVG(s.total) as ticket
FROM sales s JOIN profiles pr ON pr.id = s.empleado_id
WHERE s.created_at BETWEEN $desde AND $hasta AND s.estado = 'completada'
GROUP BY pr.nombre, pr.apellido ORDER BY monto DESC
```

### Componentes a crear en components/admin/
- DateRangePicker.tsx — selector con botones rápidos + date inputs
- KPICards.tsx — 6 cards con métricas y comparaciones
- SalesChart.tsx — ComposedChart dinámico con Recharts
- ProductRanking.tsx — tabla top productos con barras de progreso
- NoMovementList.tsx — productos sin ventas + alertas stock
- CategoryChart.tsx — dona + tabla por categoría
- PaymentMethodsChart.tsx — efectivo vs MP vs transferencia
- EmployeeSalesTable.tsx — ventas por empleado

### UX obligatorio
- Skeleton loaders mientras cargan datos (no spinners)
- Estado vacío descriptivo si no hay datos en el rango
- Todos los $ en formato: Intl.NumberFormat('es-AR', {style:'currency', currency:'ARS'})
- Fechas en timezone Argentina UTC-3
- Responsive: funciona en tablet

### Orden de implementación
1. /api/analytics/route.ts — todas las queries
2. DateRangePicker.tsx
3. KPICards.tsx
4. SalesChart.tsx
5. ProductRanking.tsx + NoMovementList.tsx
6. CategoryChart.tsx + PaymentMethodsChart.tsx
7. EmployeeSalesTable.tsx
8. app/(admin)/dashboard/page.tsx — orquestación final con Suspense
9. npm run build para verificar

## Convenciones de código
- TypeScript estricto, nunca any
- Server Components por defecto, use client solo si necesita interactividad
- createClient() de lib/supabase/server.ts en Server Components
- createClient() de lib/supabase/client.ts en Client Components
- Route handlers retornan siempre { data, error }
- Números: Intl.NumberFormat('es-AR') siempre
- Fechas: timezone Argentina UTC-3

## Estado del proyecto

### Completado y funcionando
- Next.js 16.2.2 + TypeScript + Tailwind + Dark mode (ThemeToggle en las 3 navbars)
- Supabase configurado (schema, RLS, Realtime) — **proyecto activo: rkeqsfmfzacazgzacoin**
- 15 productos con 47 variantes detalladas (marca, presentación, capacidad, precio por variante)
- proxy.ts con protección de rutas por rol (3 capas) — redirect a /empleados/login o /admin/login
- Tienda pública (/tienda): productos, categorías, carrito, variantes con precio correcto, MP Checkout Pro
- Auth cliente: registro, login, logout; link "Mis pedidos" en navbar cuando está logueado
- Mis pedidos: datos reales de DB, paginado (20 por página, botón "Cargar más")
- Perfil editable del cliente (/perfil)
- Mercado Pago Checkout Pro (prueba funcionando con Buyer Test User)
- Páginas resultado pago: exitoso/fallido/pendiente
- Login separado por rol: /empleados/login y /admin/login
- POS empleado (POSDashboard): búsqueda, categorías, variantes, promos, escáner USB, recibo, guard de turno
- Caja empleado: abrir/cerrar turno, resumen por método de pago, historial de ventas del turno
- Inventario empleado: filtros de vencimiento, escáner USB, filas expandibles con variantes
- Comentarios/logs de empleados: entrada/salida/incidente, editar y eliminar
- Admin dashboard: DateRangePicker, KPICards, SalesChart, ProductRanking, ExpiryAlerts, PromoAnalytics
- Admin analíticas: página separada con análisis profundo
- Admin inventario: tabla expandible con variantes, filtros, export CSV
- Admin empleados: tabs Equipo / Horarios / Comentarios con historial filtrable
- Export CSV: ventas e inventario desde /api/export
- Deploy en Vercel: https://kioskorosh.vercel.app (CI/CD desde GitHub master)

### Bugs resueltos (no repetir)
- API /api/sales/caja POST usaba empleado_id del cliente → ahora usa getUser() server-side
- VariantPicker tienda usaba precio_extra en lugar de precio_variante
- Hydration error NavbarTienda: badge del carrito usa useState(mounted) + useEffect
- Middleware deprecado: renombrado a proxy.ts con export async function proxy()
- Rol leído del JWT: getRole() y proxy.ts leen de profiles.role en DB
- RLS bloqueaba middleware: proxy.ts usa service role client para leer profiles
- MP auto_return en localhost: se omite auto_return cuando APP_URL contiene localhost
- useSearchParams sin Suspense: páginas de pago envueltas en Suspense
- webpack React alias solo aplica en Windows (os.platform() === 'win32') para evitar error en Vercel
- .vercelignore excluye binarios (Antigravity.exe 245MB) para evitar file size limit

### Pendiente
- Webhook MP para confirmar ventas automáticamente en DB (hoy se confirman manualmente)
- Usuarios empleado de prueba (crear desde admin panel o SQL)

## Lo que NO hacer
- Nunca exponer SUPABASE_SERVICE_ROLE_KEY o MP_ACCESS_TOKEN al cliente
- Nunca leer rol desde JWT metadata, siempre desde profiles.role en DB
- Nunca saltear validación Zod en route handlers
- Nunca console.log en producción
- Nunca pantalla en blanco, siempre loading states o empty states
- Nunca hardcodear rangos de fechas, siempre dinámicos

## TAREA 2: Sistema de productos avanzado + vencimientos + cálculo de precios

### Cambios requeridos en el schema de products

#### Nuevas columnas en products:
```sql
-- Fechas
fecha_inicio_compra date          -- desde cuándo se puede comprar/ofrecer
fecha_vencimiento date            -- vencimiento del lote actual

-- Cálculo de precio automático
costo_unitario decimal(10,2)      -- precio de costo
pct_iva decimal(5,2) default 21   -- % IVA (21% estándar AR, 10.5% reducido, 0% exento)
pct_impuestos decimal(5,2) default 0  -- otros impuestos (impuesto interno, etc)
pct_ganancia decimal(5,2) default 30  -- margen de ganancia deseado
precio_calculado decimal(10,2)    -- precio final calculado (read-only, se muestra como sugerencia)
-- Fórmula: precio = costo * (1 + pct_iva/100) * (1 + pct_impuestos/100) * (1 + pct_ganancia/100)
-- El admin puede aceptar el precio calculado o sobreescribirlo con precio manual

-- Marca
marca text                         -- ej: "Coca-Cola", "Águila", "Milka"
```

#### Rediseño completo de product_variants:
Las variantes ahora son el corazón del sistema de productos.
```sql
-- Agregar a product_variants:
presentacion text    -- 'unidad', 'pack', 'kg', 'gramos', 'lata', 'botella', 'caja', 'sobre', 'litro'
capacidad decimal(10,3)  -- 375 (ml), 1.25 (L), 6 (unidades en pack), 250 (gramos), etc
capacidad_unidad text    -- 'ml', 'L', 'g', 'kg', 'unid'
descripcion_completa text  -- auto-generada: "Coca-Cola Lata 375ml", "Coca-Cola Pack x6 500ml"
precio_variante decimal(10,2)  -- precio específico de esta variante (sobreescribe precio base)
costo_variante decimal(10,2)   -- costo de esta variante específica
fecha_vencimiento date         -- vencimiento puede ser por variante/lote
stock integer default 0
stock_minimo integer default 5
barcode text unique
activo boolean default true
```

#### Nueva tabla: stock_movements (movimientos de stock)
```sql
CREATE TABLE public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products,
  variant_id uuid references product_variants,
  tipo text check (tipo in ('entrada','salida','ajuste','vencimiento')),
  cantidad integer not null,  -- positivo=entrada, negativo=salida
  stock_anterior integer,
  stock_nuevo integer,
  motivo text,               -- 'compra', 'venta', 'ajuste manual', 'vencido'
  empleado_id uuid references profiles,
  created_at timestamptz default now()
);
```

### Lógica de actualización de stock (suma inteligente)
Cuando un empleado agrega stock:
- Input muestra stock actual: "Stock actual: 53 unidades"
- Input de entrada: "Agregar cantidad: [8]"
- Sistema suma: 53 + 8 = 61 (NO reemplaza, SUMA)
- Registra movement: tipo='entrada', cantidad=8, motivo='compra'
- Si hay fecha_vencimiento en el lote nuevo → actualiza fecha_vencimiento de la variante

### Sistema de vencimientos

#### Para empleados (app/(empleados)/inventario/page.tsx):
Filtros de búsqueda por vencimiento:
- "Vencidos" → fecha_vencimiento < hoy
- "Vencen hoy" → fecha_vencimiento = hoy
- "Próximos 7 días" → fecha_vencimiento entre hoy y hoy+7
- "Próximos 30 días" → fecha_vencimiento entre hoy y hoy+30
- "Este mes" → vencen en el mes actual
- "Por fecha" → ordenar todos de más próximo a más lejano
- Vista de tabla con: producto, variante, stock, fecha vencimiento, días restantes, estado (badge: Vencido/Crítico/Próximo/OK)

#### Para admin (alerta en dashboard):
- Widget siempre visible en el dashboard: "⚠️ Productos por vencer"
- Muestra productos que vencen en los próximos 7 días
- Badge con cantidad total de alertas en el navbar admin
- Click → va a inventario con filtro de vencimientos aplicado
- También alerta productos vencidos (fecha_vencimiento < hoy) para retirarlos

### Cálculo automático de precios
En el formulario de productos (admin):
- Campos: Costo unitario, % IVA (selector: 0%, 10.5%, 21%), % Otros impuestos, % Ganancia
- Preview en tiempo real: muestra desglose y precio final sugerido
- El admin puede aceptar el precio calculado → se guarda en precio
- O puede sobreescribir con precio manual
- Mostrar desglose:
  - Costo base: $100
  - + IVA 21%: $21
  - + Imp. internos 5%: $5
  - + Ganancia 30%: $37.80
  - = Precio final: $163.80

### Mejoras adicionales sugeridas para empleados y admin

#### Para empleados:
1. **Búsqueda rápida de producto** al crear venta: buscar por nombre/marca/código de barras mientras tipea (debounce 300ms)
2. **Historial de ventas del turno**: ver las ventas que hizo en su turno actual con totales
3. **Alerta de stock bajo al vender**: si el stock queda < stock_minimo después de una venta, mostrar toast de advertencia
4. **Inventario con filtros**: por categoría, por marca, por estado de stock (OK/bajo/sin stock/vencido), por vencimiento

#### Para admin:
1. **Alerta de vencimientos en dashboard** (arriba del todo, siempre visible)
2. **Gestión de lotes**: poder ver y editar lotes/vencimientos de cada variante
3. **Historial de movimientos de stock**: ver entradas y salidas con filtro de fecha y empleado
4. **Exportar reporte**: botón para exportar ventas del período a CSV
5. **Rentabilidad por producto**: si tiene costo cargado, mostrar margen real vs margen esperado
6. **Gestión de marcas**: campo marca en productos para poder filtrar y agrupar por marca

### Estructura de variantes para productos complejos (ejemplos)

#### Coca-Cola:
- Variante 1: Lata Original 375ml — precio: $850
- Variante 2: Botella 500ml — precio: $950
- Variante 3: Botella 1.25L — precio: $1.400
- Variante 4: Botella 2.25L — precio: $1.800
- Variante 5: Botella 3L — precio: $2.200
- Variante 6: Pack x6 Latas 375ml — precio: $4.500

#### Chocolate Milka:
- Variante 1: Barra 50g — precio: $320
- Variante 2: Barra 100g — precio: $580
- Variante 3: Barra 200g — precio: $1.100
- Variante 4: A granel (por kg) — precio: $8.500/kg

### SQL requerido (ejecutar en Supabase)
```sql
-- Agregar columnas a products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fecha_inicio_compra date;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fecha_vencimiento date;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS costo_unitario decimal(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pct_iva decimal(5,2) default 21;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pct_impuestos decimal(5,2) default 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pct_ganancia decimal(5,2) default 30;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS precio_calculado decimal(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS marca text;

-- Agregar columnas a product_variants
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS presentacion text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS capacidad decimal(10,3);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS capacidad_unidad text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS descripcion_completa text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS precio_variante decimal(10,2);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS costo_variante decimal(10,2);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS fecha_vencimiento date;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS stock_minimo integer default 5;

-- Nueva tabla stock_movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  tipo text not null check (tipo in ('entrada','salida','ajuste','vencimiento')),
  cantidad integer not null,
  stock_anterior integer,
  stock_nuevo integer,
  motivo text,
  empleado_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS para stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_lee_movements" ON public.stock_movements
  FOR SELECT USING (public.get_user_role() IN ('empleado','admin'));
CREATE POLICY "staff_inserta_movements" ON public.stock_movements
  FOR INSERT WITH CHECK (public.get_user_role() IN ('empleado','admin'));
CREATE POLICY "admin_gestiona_movements" ON public.stock_movements
  FOR ALL USING (public.get_user_role() = 'admin');

-- Realtime para stock_movements
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
```

### Orden de implementación
1. Ejecutar SQL en Supabase (migrations)
2. Actualizar types/index.ts con nuevos campos
3. Rehacer components/admin/ProductForm.tsx con:
   - Sección "Identificación": nombre, marca, categoría, emoji
   - Sección "Fechas": fecha_inicio_compra, fecha_vencimiento
   - Sección "Precios": costo, IVA, impuestos, ganancia, preview calculado
   - Sección "Variantes": tabla editable con presentacion/capacidad/precio/stock/vencimiento
   - Input de stock con suma inteligente (no reemplazo)
4. Nueva API /api/products/stock/route.ts para actualizar stock con registro de movimiento
5. Rehacer app/(empleados)/inventario/page.tsx con filtros de vencimiento
6. Nuevo componente components/admin/ExpiryAlerts.tsx para dashboard
7. Nuevo componente components/admin/StockMovements.tsx para historial
8. Actualizar app/(admin)/dashboard/page.tsx para incluir ExpiryAlerts arriba del todo
9. npm run build para verificar

## TAREA 3: Flujo completo de ventas empleado + cierre de caja + export CSV + login separado

### Estado actual
- Panel empleado existe pero el flujo de venta NO registra en DB todavía
- Cierre de caja muestra datos mock, no reales
- No hay página de login separada para empleado/admin
- No hay export CSV
- No hay historial de pedidos real para el cliente

### IMPLEMENTAR TODO EN ORDEN:

---

### 1. Login separado para empleado y admin

Actualmente empleado y admin usan el mismo login de cliente en /(public)/login.
Necesitan páginas propias con diseño distinto.

#### app/(empleados)/login/page.tsx
- Página de login SOLO para empleados
- Diseño diferente al cliente: más funcional, menos decorativo
- Al hacer login verifica que role === 'empleado' || role === 'admin'
- Si el role es 'cliente' → mostrar error "No tenés acceso al panel de empleados"
- Redirect a /empleados/ventas si OK
- URL: /empleados/login

#### app/(admin)/login/page.tsx  
- Página de login SOLO para admin
- Al hacer login verifica que role === 'admin'
- Si no es admin → error "Acceso restringido a administradores"
- Redirect a /admin/dashboard si OK
- URL: /admin/login

#### Actualizar proxy.ts
- Si usuario no logueado intenta acceder a /empleados/* → redirect a /empleados/login (no a /)
- Si usuario no logueado intenta acceder a /admin/* → redirect a /admin/login (no a /)

---

### 2. Flujo de venta completo del empleado

#### Problema actual
El panel de ventas del empleado (app/(empleados)/ventas/page.tsx) no registra ventas en la DB.

#### Requerido
Rehacer app/(empleados)/ventas/page.tsx como un POS (point of sale) funcional:

**Layout en dos columnas:**
- Izquierda: buscador de productos + grid de productos clickeables
- Derecha: carrito de la venta actual + resumen + botones de pago

**Flujo:**
1. Empleado busca producto por nombre (debounce 300ms) o escanea código
2. Click en producto → si tiene variantes abre selector, si no agrega directo
3. Carrito muestra items con qty, precio unitario, subtotal
4. Empleado elige método de pago: Efectivo o Mercado Pago
5. Si efectivo → input monto recibido → calcula vuelto → confirma
6. Al confirmar → POST /api/sales con todos los items → registra en DB
7. El trigger de Supabase descuenta el stock automáticamente
8. Mostrar receipt/recibo y limpiar carrito

**API /api/sales/route.ts (verificar/completar):**
```typescript
// POST body:
{
  items: Array<{
    product_id: string,
    variant_id?: string,
    cantidad: number,
    precio_unitario: number,
    subtotal: number
  }>,
  total: number,
  metodo_pago: 'efectivo' | 'mercadopago' | 'transferencia',
  cliente_id?: string, // opcional
  notas?: string
}
// El empleado_id se obtiene del JWT en el server
```

**Componentes a crear:**
- components/empleados/POSProductSearch.tsx — buscador con debounce + grid de resultados
- components/empleados/POSCart.tsx — carrito con qty controls
- components/empleados/POSPayment.tsx — selector método pago + efectivo con vuelto
- components/empleados/POSReceipt.tsx — recibo imprimible post-venta

---

### 3. Cierre de caja con datos reales

Rehacer app/(empleados)/caja/page.tsx:

**Resumen del turno actual:**
- Query: ventas donde empleado_id = usuario actual Y created_at >= inicio del turno (hoy 00:00 AR)
- Mostrar: total vendido, cantidad transacciones, desglose por método de pago
- Lista de últimas 10 ventas del turno con hora, items resumidos, total, método

**Abrir/cerrar caja:**
- Al entrar al turno → crear registro en cash_sessions con apertura=now()
- Al cerrar → actualizar cash_sessions con cierre=now(), totales calculados
- Si ya hay una sesión abierta del día → mostrar la sesión activa

**API /api/caja/route.ts:**
```typescript
// GET → sesión activa del empleado + resumen del turno
// POST → abrir nueva sesión de caja
// PUT → cerrar sesión con totales
```

---

### 4. Export CSV para admin

#### Endpoint: /api/export/route.ts
```typescript
// GET ?tipo=ventas&desde=ISO&hasta=ISO
// GET ?tipo=inventario
// Retorna CSV con Content-Disposition: attachment; filename="..."
```

**Export ventas:** fecha, hora, empleado, cliente, items (nombre+qty+precio), total, método pago, estado
**Export inventario:** nombre, marca, categoría, precio, costo, stock, stock_minimo, fecha_vencimiento, variantes

#### Botón en admin dashboard
- Botón "Exportar CSV" junto al DateRangePicker
- Usa el rango de fechas seleccionado
- Click → descarga el archivo

#### Botón en admin inventario
- Botón "Exportar inventario" en la parte superior

---

### 5. Historial de pedidos del cliente

Rehacer app/(public)/mis-pedidos/page.tsx:
- Si no está logueado → redirect a /login
- Si está logueado → mostrar sus ventas reales desde DB
- Cada pedido muestra: fecha, items, total, método pago, estado (badge)
- Estado de MP: si mp_status='approved' → Pagado, si 'pending' → Pendiente

---

### 6. Perfil editable del cliente

Nueva página app/(public)/perfil/page.tsx:
- Mostrar datos actuales: nombre, apellido, email, DNI, teléfono
- Form para editar: nombre, apellido, teléfono (email no editable)
- PATCH /api/profile/route.ts → actualiza profiles en Supabase
- Link al perfil desde la navbar del cliente (ícono usuario)

---

### APIs a crear/completar

```
app/api/sales/route.ts          ← verificar que POST funcione y registre sale_items
app/api/caja/route.ts           ← GET sesión activa, POST abrir, PUT cerrar
app/api/export/route.ts         ← GET CSV ventas e inventario
app/api/profile/route.ts        ← GET perfil, PATCH actualizar
```

---

### Orden de implementación
1. proxy.ts — redirect a login correcto por rol
2. app/(empleados)/login/page.tsx
3. app/(admin)/login/page.tsx
4. Verificar /api/sales POST funciona con items → corregir si no
5. app/(empleados)/ventas/page.tsx — POS completo
6. /api/caja/route.ts + app/(empleados)/caja/page.tsx
7. /api/export/route.ts + botones en dashboard e inventario admin
8. app/(public)/mis-pedidos/page.tsx con datos reales
9. app/(public)/perfil/page.tsx + /api/profile/route.ts
10. npm run build para verificar todo

### NO olvidar
- empleado_id en POST /api/sales viene del JWT (getUser() server-side), nunca del cliente
- Fechas siempre en timezone Argentina UTC-3
- Todos los números en Intl.NumberFormat('es-AR')
- Loading skeletons en todas las páginas que fetchen datos
- Empty states descriptivos cuando no hay datos

## TAREA 4: Dark mode global + mejoras UX admin/empleado + sección empleados avanzada

### 1. Dark mode global

Implementar dark mode completo en toda la app usando Tailwind dark: prefix.

#### Configuración
- Agregar darkMode: 'class' en tailwind.config (si no está)
- Botón toggle en navbar de las 3 vistas (cliente, empleado, admin)
- Guardar preferencia en localStorage bajo key 'kiosko-theme'
- Al cargar: respetar preferencia guardada, si no hay → usar prefers-color-scheme del sistema
- Aplicar clase 'dark' en el <html> tag

#### Componente ThemeToggle
- Crear components/ui/ThemeToggle.tsx
- Ícono sol (light) / luna (dark)
- Usar 'use client', leer/escribir localStorage
- Agregar a NavbarAdmin, NavbarEmpleado, NavbarTienda

#### Colores dark mode a aplicar en todos los layouts y componentes:
- Fondos: bg-gray-50 → dark:bg-gray-900, bg-white → dark:bg-gray-800
- Bordes: border-gray-200 → dark:border-gray-700
- Texto: text-gray-900 → dark:text-gray-100, text-gray-500 → dark:text-gray-400
- Cards: bg-white → dark:bg-gray-800
- Inputs: bg-white → dark:bg-gray-700, text oscuro → dark:text-gray-100
- Navbars: fondo claro → dark fondo oscuro
- Tablas: thead bg-gray-50 → dark:bg-gray-700/50, hover → dark:hover:bg-gray-700/30

### 2. Logout accesible en todos los paneles

#### NavbarAdmin y NavbarEmpleado
- Botón logout siempre visible en la navbar (no oculto en menú)
- Mostrar: avatar/iniciales del empleado + nombre + botón salir
- Llamar DELETE /api/auth/login y redirigir al login del rol

#### NavbarTienda
- Ya tiene logout, verificar que funcione bien
- Agregar link a /perfil si está logueado

### 3. Sección de empleados avanzada (solo admin)

Rehacer app/admin/(protected)/empleados/page.tsx completamente.

#### Vista general de empleados
Cards por empleado mostrando:
- Nombre, apellido, rol
- Estado: Activo hoy / Fuera de turno (basado en si tiene cash_session abierta hoy)
- Ventas del día: cantidad y monto total
- Última actividad

#### Sub-tabs dentro de la página:
- "Equipo" → lista de todos los empleados con sus stats
- "Horarios" → registro de entradas y salidas
- "Comentarios" → log de notas/incidentes

#### Nueva tabla: employee_logs
```sql
CREATE TABLE IF NOT EXISTS public.employee_logs (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','salida','comentario','incidente')),
  nota text,
  -- Link opcional a venta/transacción
  sale_id uuid references public.sales(id) on delete set null,
  -- Link opcional a producto
  product_id uuid references public.products(id) on delete set null,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
ALTER TABLE public.employee_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_gestiona_logs" ON public.employee_logs
  FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "empleado_ve_sus_logs" ON public.employee_logs
  FOR SELECT USING (auth.uid() = empleado_id);
```

#### Sistema de horarios
- Admin puede registrar entrada/salida manualmente para cada empleado
- Vista de horarios: tabla con empleado, fecha, entrada, salida, horas trabajadas
- Filtro por fecha (hoy / esta semana / este mes)
- Cálculo de horas totales del período

#### Sistema de comentarios/notas con ticket
- Admin puede agregar nota/comentario sobre cualquier empleado
- Tipos: comentario general, incidente, reconocimiento
- Puede linkear a una venta (sale_id) o producto (product_id) opcionalmente
- Si linkea a venta → mostrar resumen de la venta en el comentario
- Si linkea a producto → mostrar nombre/emoji del producto
- Filtro del historial por: empleado, tipo, fecha desde/hasta

#### Historial filtrable
- Tabla de logs con filtros: empleado (dropdown), tipo, fecha desde, fecha hasta
- Ordenado por created_at DESC
- Paginación: 20 registros por página con botón "cargar más"

#### APIs nuevas
```
/api/employee-logs/route.ts   GET (con filtros), POST (crear log)
/api/horarios/route.ts        GET (con filtros), POST (registrar entrada/salida)
```

### 4. Mejoras adicionales sugeridas

#### Para empleado — Mi turno
En NavbarEmpleado o página /empleados/ventas:
- Mostrar "Turno activo desde las HH:MM" si tiene cash_session abierta
- Contador de ventas del turno en tiempo real (pequeño badge)

#### Para admin — Alertas en tiempo real
- Badge en navbar con cantidad de alertas críticas (vencidos + sin stock)
- Se actualiza cada 5 minutos con Supabase Realtime

#### Para cliente — Mejoras
- En mis-pedidos: expandir fila para ver detalle de items del pedido
- En perfil: mostrar historial de compras resumido

### SQL a ejecutar en Supabase ANTES de implementar
```sql
CREATE TABLE IF NOT EXISTS public.employee_logs (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','salida','comentario','incidente','reconocimiento')),
  nota text,
  sale_id uuid references public.sales(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
ALTER TABLE public.employee_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_gestiona_logs" ON public.employee_logs
  FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "empleado_ve_sus_logs" ON public.employee_logs
  FOR SELECT USING (auth.uid() = empleado_id);
```

### Orden de implementación
1. SQL en Supabase (employee_logs)
2. tailwind.config → darkMode: 'class'
3. components/ui/ThemeToggle.tsx
4. Agregar ThemeToggle a las 3 navbars + dark: clases en layouts globales
5. Dark mode en todos los componentes principales (NavbarAdmin, NavbarEmpleado, NavbarTienda, Modal, cards, tablas)
6. Logout visible en NavbarAdmin y NavbarEmpleado con nombre del usuario
7. /api/employee-logs/route.ts
8. Rehacer app/admin/(protected)/empleados/page.tsx con tabs: Equipo | Horarios | Comentarios
9. npm run build y corregir errores

## TAREA 5: Variantes visibles en inventario + editar/eliminar comentarios + vista de productos mejorada

### 1. Editar y eliminar comentarios en TabComentarios

#### En app/admin/(protected)/empleados/page.tsx — TabComentarios:
- Al expandir un log (click en la fila) mostrar botones "Editar" y "Eliminar"
- **Eliminar**: modal de confirmación "¿Estás seguro que querés eliminar este registro?" con botón rojo confirmar
- **Editar**: inline dentro del log expandido — textarea con el texto actual, selector de tipo, botón guardar y cancelar
- Al confirmar eliminar → DELETE /api/employee-logs/[id]/route.ts
- Al guardar edición → PATCH /api/employee-logs/[id]/route.ts con { tipo, nota }

#### Nueva API: /api/employee-logs/[id]/route.ts
```typescript
// DELETE → solo admin puede eliminar, usar createServiceClient()
// PATCH → solo admin puede editar tipo y nota
```

### 2. Variantes visibles en inventario y productos

#### Problema actual
En inventario solo se ve "1 variante" como badge pero no se pueden ver los detalles de cada variante (nombre, precio, stock, vencimiento).

#### Requerido en componente InventarioTable (components/shared/InventarioTable.tsx):
- En la vista "todos" (filtro='todos'), agregar una fila expandible por producto
- Click en la fila del producto → muestra sub-tabla con sus variantes expandida debajo
- Sub-tabla de variantes muestra: nombre variante, presentación, capacidad, precio_variante (o precio base si no tiene), stock variante, stock_minimo, fecha_vencimiento, estado
- Si no tiene variantes → no mostrar botón de expandir
- Usar chevron down/up para indicar estado expandido/colapsado

#### En componente admin/InventoryTable.tsx:
- Mismo comportamiento: click en producto → expande sub-tabla de variantes
- En la sub-tabla de variantes para admin mostrar también: costo_variante, margen si tiene costo

#### En app/(public)/page.tsx — tienda del cliente:
- En ProductGrid, cuando un producto tiene variantes, mostrarlas como tabs o chips seleccionables
- El precio mostrado debe cambiar según la variante seleccionada (precio_variante o precio base + precio_extra)

### 3. Vista de productos por categoría con variantes (nueva vista en admin/inventario)

#### Nuevo tab en admin/inventario: "Por categoría"
Agregar un tercer tab a la vista de inventario admin: "Por categoría"

Vista jerárquica:
```
🥤 Bebidas (4 productos, 12 variantes)
  ├── Coca-Cola          | Original: $850/45u | Zero: $850/38u | Light: $850/22u
  ├── Fanta              | Naranja: $750/36u  | Limón: $750/18u
  └── Agua Mineral       | 500ml: $400/80u   | 1.5L: $600/25u | Con Gas: $450/15u
🍬 Golosinas (2 productos, 8 variantes)
  └── ...
```

Cada categoría es un acordeón colapsable.
Cada producto muestra sus variantes en línea como chips/pills con: nombre, precio, stock, estado (OK/bajo/sin stock).

#### API: /api/products/by-category/route.ts
```typescript
// GET → devuelve productos agrupados por categoría con sus variantes
// Incluye stock total por categoría, variantes con fecha_vencimiento
```

### 4. Variantes reflejadas en dashboard y analíticas

#### En /api/analytics/route.ts y dashboard/page.tsx:
- Al calcular "unidades vendidas" de un producto, separar por variante en el ranking
- En el ProductRanking, si un producto tiene variantes, mostrar la variante más vendida entre paréntesis
- Ejemplo: "Coca-Cola (Zero)" en vez de solo "Coca-Cola"

#### En mis-pedidos del cliente (app/(public)/mis-pedidos/page.tsx):
- En los items de cada pedido mostrar también el nombre de la variante si tiene
- Ejemplo: "Coca-Cola — Zero x2 — $1.700"

#### En /api/sales/route.ts GET:
- Incluir en el select de sale_items el join con product_variants para obtener el nombre de la variante
- ```sql
  sale_items(*, products(nombre, emoji), product_variants(nombre))
  ```

### 5. Orden de implementación
1. /api/employee-logs/[id]/route.ts — DELETE y PATCH
2. TabComentarios — botones editar/eliminar en rows expandidas con modal confirmación
3. InventarioTable (shared) — filas expandibles con sub-tabla de variantes
4. admin/InventoryTable — mismo con columnas extra de admin
5. /api/products/by-category/route.ts
6. Nuevo tab "Por categoría" en admin/inventario/page.tsx
7. Actualizar sale_items select en /api/sales para incluir variant name
8. Actualizar mis-pedidos para mostrar nombre de variante
9. npm run build verificar todo

### SQL verificar en Supabase
Verificar que product_variants tiene los campos necesarios:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'product_variants' 
ORDER BY ordinal_position;
```
