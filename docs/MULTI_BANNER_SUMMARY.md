# Resumen Ejecutivo: Sistema Multi-Banner

## ✅ Compatibilidad 100% Garantizada

**No hay breaking changes.** El sistema actual seguirá funcionando exactamente igual.

---

## 📋 Resumen de Cambios

### Backend

#### Schema Evolution (Additive Only)
```typescript
// Campos NUEVOS (todos opcionales)
interface IBanner {
  // ... campos existentes ...
  
  audienceMode?: 'global' | 'role' | 'group' | 'user';
  targetRoleIds?: string[];
  targetGroupIds?: string[];
  targetUserIds?: string[];
  priority?: number;
  isActive?: boolean;
  order?: number;
}
```

#### Nuevos Métodos
- `getActiveBanners(user)` → Retorna array de banners para el usuario
- `createBanner(data)` → Crea banner con validación de audiencia
- `updateBanner(id, updates)` → Actualiza banner
- `deleteBanner(id)` → Elimina banner
- `listBanners(options)` → Lista paginada
- `toggleBanner(id)` → Activa/desactiva

#### Métodos Existentes (Sin Cambios)
- `getBanner(user)` → Ahora es wrapper de `getActiveBanners()`

#### Nuevas Rutas Admin
```
POST   /api/admin/banners          → Crear
GET    /api/admin/banners          → Listar
GET    /api/admin/banners/:id      → Obtener
PUT    /api/admin/banners/:id      → Actualizar
DELETE /api/admin/banners/:id      → Eliminar
PATCH  /api/admin/banners/:id/toggle → Toggle
```

### Frontend

#### Nuevo Componente
- `<BannerCarousel />` → Muestra múltiples banners con navegación

#### Nuevo Hook
- `useGetActiveBannersQuery()` → Obtiene array de banners activos

#### Componente Existente
- `<Banner />` → Mantener o redireccionar a carousel (decisión de implementación)

### Scripts NPM

#### Sin Cambios Funcionales
- `npm run update-banner` → Crea banner global (como siempre)
- `npm run delete-banner` → Elimina banner activo (como siempre)

---

## 🎯 Decisiones Clave de Diseño

### 1. Audiencia: Reutilizar Sistema de Principals

LibreChat ya tiene un sistema robusto de permisos con:
- **Roles** (ADMIN, USER, custom)
- **Grupos** (local o Entra ID)
- **Método `getUserPrincipals()`**

**Decisión:** Usar esta infraestructura existente en lugar de crear una nueva.

**Beneficios:**
- ✅ Consistencia con resto del sistema
- ✅ No duplicar lógica
- ✅ Soporte nativo para multi-tenancy
- ✅ Validación de roles/grupos ya implementada

### 2. Schema: Evolución en Lugar de Reescritura

**Opción A (Elegida):** Añadir campos opcionales al schema actual
**Opción B (Rechazada):** Crear tabla separada `BannerAudience`

**Justificación:**
- Banners legacy sin `audienceMode` → comportamiento global
- Migración trivial (solo añadir campos)
- Queries más simples (sin JOINs)

### 3. Frontend: Carousel con Navegación Manual

**Opción A (Elegida):** Flechas izquierda/derecha + indicadores
**Opción B (Rechazada):** Auto-rotación con timer

**Justificación:**
- El usuario controla qué banner ve
- No distrae con animaciones automáticas
- Más accesible

### 4. Persistencia: localStorage (Sin Backend)

**Opción A (Elegida):** Guardar banners cerrados en localStorage
**Opción B (Rechazada):** Nueva colección `BannerDismissals`

**Justificación:**
- No aumentar carga en BD
- localStorage suficiente para esta funcionalidad
- Si usuario cambia de dispositivo, verá banners de nuevo (OK)

---

## 🔍 Validaciones Críticas

### Al Crear/Editar Banner

```typescript
// 1. Validar que roles existen
if (audienceMode === 'role') {
  const existingRoles = await Role.find({ name: { $in: targetRoleIds }});
  if (existingRoles.length !== targetRoleIds.length) {
    throw new Error('Algunos roles no existen');
  }
}

// 2. Validar que grupos existen
if (audienceMode === 'group') {
  const existingGroups = await Group.find({ _id: { $in: targetGroupIds }});
  if (existingGroups.length !== targetGroupIds.length) {
    throw new Error('Algunos grupos no existen');
  }
}

// 3. Validar fechas
if (displayTo && displayFrom > displayTo) {
  throw new Error('displayFrom debe ser antes que displayTo');
}

// 4. Validar mensaje no vacío
if (!message?.trim()) {
  throw new Error('El mensaje no puede estar vacío');
}
```

---

## ⚡ Optimizaciones de Performance

### 1. Índices MongoDB

```typescript
bannerSchema.index({ displayFrom: 1, displayTo: 1, isActive: 1 });
bannerSchema.index({ audienceMode: 1, isActive: 1 });
bannerSchema.index({ targetRoleIds: 1 }, { sparse: true });
bannerSchema.index({ targetGroupIds: 1 }, { sparse: true });
```

### 2. Query Optimizado

En lugar de:
```typescript
// ❌ N queries (1 por cada role/group del usuario)
for (const principal of principals) {
  const banner = await Banner.findOne({ targetRoleIds: principal.id });
}
```

Hacer:
```typescript
// ✅ 1 query con $or
const banners = await Banner.find({
  $or: [
    { audienceMode: 'global' },
    { audienceMode: 'role', targetRoleIds: { $in: userRoleIds }},
    { audienceMode: 'group', targetGroupIds: { $in: userGroupIds }},
  ]
});
```

### 3. Caché

```typescript
// Redis: Cachear resultado por userId (TTL: 5 min)
const cacheKey = `banners:user:${userId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const banners = await getActiveBanners(user);
await redis.set(cacheKey, JSON.stringify(banners), 'EX', 300);
return banners;
```

```typescript
// React Query: staleTime de 5 minutos
export const useGetActiveBannersQuery = () => {
  return useQuery(
    [QueryKeys.banners],
    () => dataService.getActiveBanners(),
    { staleTime: 5 * 60 * 1000 }
  );
};
```

---

## 🛡️ Seguridad

### 1. Sanitización de HTML

```typescript
import DOMPurify from 'isomorphic-dompurify';

async function createBanner(data: Partial<IBanner>) {
  // Sanitizar mensaje para prevenir XSS
  const cleanMessage = DOMPurify.sanitize(data.message, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
  });
  
  return Banner.create({
    ...data,
    message: cleanMessage,
  });
}
```

### 2. Permisos Admin

```typescript
// Solo administradores pueden gestionar banners
router.use('/api/admin/banners', requireJwtAuth, requireRole(['ADMIN']));
```

### 3. Multi-Tenancy Automático

```typescript
// El plugin applyTenantIsolation maneja esto
applyTenantIsolation(bannerSchema);

// Todas las queries automáticamente incluyen tenantId
const banners = await Banner.find({ ... });
// → WHERE ... AND tenantId = req.user.tenantId
```

---

## 📊 Diagramas

### Flujo de Datos: Multi-Banner

```
┌──────────────────────────────────────────────────────────┐
│                      ADMIN CREA BANNER                   │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Panel Admin          │
         │  POST /admin/banners  │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  createBanner()       │
         │  - Validar audiencia  │
         │  - Generar bannerId   │
         │  - Guardar en BD      │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  MongoDB              │
         │  banners collection   │
         │  (múltiples docs)     │
         └───────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   USUARIO VE BANNERS                     │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  <BannerCarousel />   │
         │  useGetActiveBanners  │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  GET /api/banners     │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  getActiveBanners()   │
         │  1. getUserPrincipals │
         │  2. Query banners     │
         │  3. Filtrar audiencia │
         │  4. Ordenar/limitar   │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Return Array<Banner> │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  React renderiza      │
         │  - Banner actual      │
         │  - Flechas nav        │
         │  - Indicadores        │
         └───────────────────────┘
```

### Lógica de Audiencia

```
Usuario hace login
       ↓
getUserPrincipals()
       ↓
┌──────────────────────┐
│ Principals:          │
│ - USER (ObjectId)    │
│ - ROLE (admin)       │
│ - GROUP (group_123)  │
│ - GROUP (group_456)  │
│ - PUBLIC             │
└──────────┬───────────┘
           ↓
Query MongoDB:
{
  displayFrom: { $lte: now },
  displayTo: { $gte: now } OR null,
  isActive: true,
  $or: [
    { audienceMode: null },           // Legacy
    { audienceMode: 'global' },
    { isPublic: true },
    { audienceMode: 'user', targetUserIds: ObjectId },
    { audienceMode: 'role', targetRoleIds: 'admin' },
    { audienceMode: 'group', targetGroupIds: { $in: [group_123, group_456] }},
  ]
}
       ↓
Banners filtrados
       ↓
Sort: priority DESC, order ASC, displayFrom DESC
       ↓
Limit: 10
       ↓
Return to Frontend
```

---

## 📦 Estimación de Esfuerzo

### Por Componente

| Componente | Complejidad | Días | Riesgo |
|------------|-------------|------|--------|
| Schema Evolution | Baja | 0.5 | Bajo |
| `getActiveBanners()` | Media | 1 | Bajo |
| Métodos CRUD | Media | 2 | Medio |
| Rutas Admin | Media | 2 | Bajo |
| `<BannerCarousel />` | Media | 2 | Medio |
| Panel Admin | Alta | 4 | Medio |
| Tests E2E | Media | 2 | Bajo |
| Migración | Baja | 1 | Bajo |
| Documentación | Baja | 1 | Bajo |

**Total:** 15.5 días (~3 semanas)

### Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Performance con muchos banners | Baja | Medio | Índices + caché |
| UX confusa con muchos banners activos | Media | Bajo | Limit 10, prioridad |
| Seguridad XSS en mensajes | Media | Alto | DOMPurify sanitization |
| Complejidad del panel admin | Media | Medio | Prototipar primero |

---

## ✅ Checklist de Implementación

### Backend
- [ ] Actualizar schema Banner con campos opcionales
- [ ] Crear índices en MongoDB
- [ ] Implementar `getActiveBanners()`
- [ ] Implementar métodos CRUD
- [ ] Crear rutas `/api/admin/banners`
- [ ] Middleware de validación
- [ ] Tests unitarios de métodos
- [ ] Tests de integración de rutas

### Frontend
- [ ] Hook `useGetActiveBannersQuery()`
- [ ] Componente `<BannerCarousel />`
- [ ] Estado Recoil para banners ocultos
- [ ] Página `/admin/banners` (lista)
- [ ] Página `/admin/banners/new` (crear)
- [ ] Página `/admin/banners/:id/edit` (editar)
- [ ] Componentes auxiliares (RoleSelector, GroupSelector)
- [ ] Tests de componentes
- [ ] Tests E2E

### Scripts y Migración
- [ ] Actualizar `update-banner.js`
- [ ] Actualizar `delete-banner.js`
- [ ] Crear `migrate-banners.js`
- [ ] Tests de compatibilidad

### Documentación
- [ ] README actualizado
- [ ] CHANGELOG
- [ ] Docs de usuario (`docs/admin/banners.md`)
- [ ] Docs técnicas (`docs/development/banners-architecture.md`)
- [ ] Deployment checklist

---

## 🚀 Siguiente Paso Recomendado

**Empezar por Fase 2:** Backend - Schema y Métodos

**Razón:** Es el núcleo del sistema y no tiene dependencias de UI. Una vez funcionando, frontend puede desarrollarse en paralelo.

```bash
# 1. Crear rama de feature
git checkout -b feat/multi-banner-system

# 2. Empezar con schema
cd packages/data-schemas/src/schema
vi banner.ts

# 3. Implementar métodos
cd ../methods
vi banner.ts

# 4. Tests
npm run test:api -- banner
```

---

**¿Alguna pregunta o aclaración sobre el plan?**
