# Plan Técnico: Sistema Multi-Banner con Soporte de Roles y Grupos

**Proyecto:** LibreChat  
**Funcionalidad:** Mejora del sistema de banners  
**Autor:** Desarrollador Senior  
**Fecha:** 15 de Abril, 2026  
**Versión:** 1.0

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Análisis del Sistema Actual](#análisis-del-sistema-actual)
3. [Arquitectura Propuesta](#arquitectura-propuesta)
4. [Plan de Implementación por Fases](#plan-de-implementación-por-fases)
5. [Breaking Changes y Mitigación](#breaking-changes-y-mitigación)
6. [Consideraciones Técnicas](#consideraciones-técnicas)
7. [Cronograma Estimado](#cronograma-estimado)

---

## Resumen Ejecutivo

Este documento describe el plan técnico para evolucionar el sistema de banners actual de LibreChat (un solo banner global) hacia un sistema multi-banner con soporte para:

- **Múltiples banners activos simultáneamente**
- **Reglas basadas en roles y grupos** (reutilizando la infraestructura ACL existente)
- **Programación temporal** con fechas de inicio/fin
- **Rotación/carrusel** en el frontend para múltiples banners
- **Panel de administración** con rutas `/admin` para gestión

**Prioridad:** Mantener 100% de compatibilidad hacia atrás. El sistema actual debe seguir funcionando sin cambios.

---

## Análisis del Sistema Actual

### 2.1. Arquitectura Actual de Banners

#### **Base de Datos (Schema)**

**Ubicación:** `packages/data-schemas/src/schema/banner.ts`

```typescript
interface IBanner {
  bannerId: string;          // UUID v5 generado del mensaje
  message: string;           // Contenido HTML del banner
  displayFrom: Date;         // Fecha inicio
  displayTo?: Date;          // Fecha fin (opcional)
  type: 'banner' | 'popup';  // Tipo (actualmente solo 'banner')
  isPublic: boolean;         // Si es público (visible sin login)
  persistable: boolean;      // Si no puede cerrarse
  tenantId?: string;         // Multi-tenancy
}
```

**Modelo:** `packages/data-schemas/src/models/banner.ts`
```typescript
mongoose.model<IBanner>('Banner', bannerSchema)
```

#### **Backend - Lógica de Negocio**

**Método de consulta:** `packages/data-schemas/src/methods/banner.ts`

```typescript
async function getBanner(user?: IUser | null): Promise<IBanner | null> {
  const now = new Date();
  const banner = await Banner.findOne({
    displayFrom: { $lte: now },
    $or: [{ displayTo: { $gte: now } }, { displayTo: null }],
    type: 'banner',
  }).lean();

  // Lógica de seguridad: banner público O usuario autenticado
  if (!banner || banner.isPublic || user != null) {
    return banner;
  }
  return null;
}
```

**Ruta API:** `api/server/routes/banner.js`

```javascript
router.get('/', optionalJwtAuth, async (req, res) => {
  res.status(200).send(await getBanner(req.user));
});
```

#### **Scripts NPM de Gestión**

**Ubicación:** `config/`

1. **`update-banner.js`**: Crea o actualiza el banner único
   - Siempre busca `Banner.findOne()` → upsert en ese documento
   - Genera `bannerId` usando UUID v5 del mensaje
   - Acepta parámetros: `displayFrom`, `displayTo`, `message`, `isPublic`, `persistable`

2. **`delete-banner.js`**: Elimina el banner activo actual
   - Busca banner activo y lo elimina por `_id`

**Limitación clave:** Solo puede existir **UN** documento Banner en la BD a la vez.

#### **Frontend - Renderizado**

**Componente:** `client/src/components/Banners/Banner.tsx`

```typescript
export const Banner = ({ onHeightChange }: Props) => {
  const { data: banner } = useGetBannerQuery();
  const [hideBannerHint, setHideBannerHint] = useRecoilState(store.hideBannerHint);

  // Ocultar si usuario ya lo cerró (localStorage)
  if (banner?.bannerId && !banner.persistable && 
      hideBannerHint.includes(banner.bannerId)) {
    return null;
  }

  return (
    <div className="banner-container">
      <div dangerouslySetInnerHTML={{ __html: banner.message }} />
      {!banner.persistable && <Button onClick={onClick}>X</Button>}
    </div>
  );
};
```

**Data Provider:** `client/src/data-provider/Misc/queries.ts`

```typescript
export const useGetBannerQuery = () => {
  return useQuery<TBannerResponse>(
    [QueryKeys.banner], 
    () => dataService.getBanner(),
    { enabled: true }
  );
};
```

**Estado local:** El usuario puede "cerrar" el banner (si no es `persistable`), guardando el `bannerId` en localStorage (`hideBannerHint` array).

---

### 2.2. Sistema de Roles y Grupos Existente

LibreChat ya tiene una infraestructura robusta de permisos:

#### **Modelos Principales**

1. **User** (`packages/data-schemas/src/schema/user.ts`)
   - Campo `role: string` (ej: 'admin', 'USER', custom)
   - Campo `idOnTheSource: string` (para mapeo con proveedores externos)

2. **Group** (`packages/data-schemas/src/schema/group.ts`)
   ```typescript
   interface IGroup {
     name: string;
     description?: string;
     memberIds: string[];        // IDs de usuarios
     source: 'local' | 'entra';
     idOnTheSource?: string;     // ID externo
     tenantId?: string;
   }
   ```

3. **Role** (`packages/data-schemas/src/schema/role.ts`)
   ```typescript
   interface IRole {
     name: string;
     description: string;
     permissions: IRolePermissions;
     tenantId?: string;
   }
   ```

#### **Sistema de Principals**

**Método clave:** `packages/data-schemas/src/methods/userGroup.ts`

```typescript
async function getUserPrincipals(params: {
  userId: string | Types.ObjectId;
  role?: string | null;
}): Promise<Array<{ 
  principalType: PrincipalType; 
  principalId?: string | Types.ObjectId 
}>> {
  const principals = [
    { principalType: PrincipalType.USER, principalId: userObjectId },
  ];
  
  // Añadir rol si existe
  if (userRole?.trim()) {
    principals.push({ principalType: PrincipalType.ROLE, principalId: userRole });
  }
  
  // Añadir grupos del usuario
  const userGroups = await getUserGroups(userId);
  userGroups.forEach(group => {
    principals.push({ principalType: PrincipalType.GROUP, principalId: group._id });
  });
  
  // Siempre añadir PUBLIC
  principals.push({ principalType: PrincipalType.PUBLIC });
  
  return principals;
}
```

**PrincipalType enum:**
- `USER`: Usuario específico
- `ROLE`: Rol del usuario
- `GROUP`: Grupos a los que pertenece
- `PUBLIC`: Todos los usuarios

Este sistema ya se usa en LibreChat para ACL de Agents, Prompts, MCP Servers, etc.

---

### 2.3. Flujo de Datos Actual

```
┌─────────────────┐
│   NPM Script    │
│ update-banner   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   MongoDB       │
│  Banner (1 doc) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Route      │
│  GET /api/      │
│     banner      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React Query    │
│ useGetBanner    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  <Banner />     │
│  Component      │
└─────────────────┘
```

---

## Arquitectura Propuesta

### 3.1. Principios de Diseño

1. **Zero Breaking Changes**: El sistema actual sigue funcionando igual
2. **Reutilización**: Aprovechar infraestructura de Roles/Grupos/Principals
3. **Backward-Compatible Schema**: Evolución aditiva del schema
4. **Encapsulación**: Queries y métodos agrupados en módulos coherentes
5. **Multi-Tenancy**: Soporte nativo para `tenantId`
6. **Extensibilidad**: Preparado para futuros tipos de notificaciones

---

### 3.2. Cambios en el Schema

#### **Opción A: Evolución del Schema Actual (RECOMENDADO)**

Añadir campos opcionales al schema existente sin romper compatibilidad:

```typescript
interface IBanner {
  // Campos existentes
  bannerId: string;
  message: string;
  displayFrom: Date;
  displayTo?: Date;
  type: 'banner' | 'popup';
  isPublic: boolean;
  persistable: boolean;
  tenantId?: string;
  
  // NUEVOS CAMPOS (opcionales para compatibilidad)
  
  // Modo de audiencia
  audienceMode?: 'global' | 'role' | 'group' | 'user';
  
  // IDs de audiencia (según audienceMode)
  targetRoleIds?: string[];      // Nombres de roles
  targetGroupIds?: string[];     // ObjectIds de grupos
  targetUserIds?: string[];      // ObjectIds de usuarios
  
  // Prioridad de visualización (0-100, default: 50)
  priority?: number;
  
  // Estado activo (para pausar sin borrar)
  isActive?: boolean;
  
  // Metadatos para tracking
  viewCount?: number;
  dismissCount?: number;
  
  // Ordenamiento en rotación
  order?: number;
}
```

**Migración:** Banners existentes funcionan sin cambios (todos los nuevos campos son opcionales). Si `audienceMode` no está definido, se comporta como `global`.

#### **Índices Propuestos**

```typescript
bannerSchema.index({ displayFrom: 1, displayTo: 1, isActive: 1 });
bannerSchema.index({ audienceMode: 1, isActive: 1 });
bannerSchema.index({ targetRoleIds: 1 }, { sparse: true });
bannerSchema.index({ targetGroupIds: 1 }, { sparse: true });
bannerSchema.index({ targetUserIds: 1 }, { sparse: true });
bannerSchema.index({ tenantId: 1, isActive: 1 });
```

---

### 3.3. Lógica de Backend

#### **Nuevo Método: `getActiveBanners()`**

```typescript
/**
 * Obtiene todos los banners activos para un usuario específico
 * Reemplaza al método getBanner() pero mantiene compatibilidad
 */
async function getActiveBanners(
  user?: IUser | null,
  options?: { limit?: number; session?: ClientSession }
): Promise<IBanner[]> {
  const Banner = mongoose.models.Banner as Model<IBanner>;
  const now = new Date();
  
  // Query base: banners activos en el rango de fechas
  const baseQuery: FilterQuery<IBanner> = {
    displayFrom: { $lte: now },
    $or: [{ displayTo: { $gte: now } }, { displayTo: null }],
    type: 'banner',
    isActive: { $ne: false }, // Si no está definido o es true
  };
  
  // Si no hay usuario, solo retornar banners públicos
  if (!user) {
    return Banner.find({ ...baseQuery, isPublic: true })
      .sort({ priority: -1, order: 1, displayFrom: -1 })
      .limit(options?.limit || 10)
      .lean();
  }
  
  // Obtener principals del usuario
  const principals = await getUserPrincipals({
    userId: user._id,
    role: user.role,
  }, options?.session);
  
  // Construir query de audiencia
  const audienceQuery = {
    $or: [
      { audienceMode: { $exists: false } },  // Legacy banners
      { audienceMode: 'global' },
      { isPublic: true },
      { 
        audienceMode: 'user',
        targetUserIds: user._id.toString(),
      },
      {
        audienceMode: 'role',
        targetRoleIds: { 
          $in: principals
            .filter(p => p.principalType === PrincipalType.ROLE)
            .map(p => p.principalId)
        }
      },
      {
        audienceMode: 'group',
        targetGroupIds: { 
          $in: principals
            .filter(p => p.principalType === PrincipalType.GROUP)
            .map(p => p.principalId)
        }
      },
    ]
  };
  
  const banners = await Banner.find({ 
    ...baseQuery, 
    ...audienceQuery 
  })
    .sort({ priority: -1, order: 1, displayFrom: -1 })
    .limit(options?.limit || 10)
    .lean();
  
  return banners;
}
```

#### **Compatibilidad: Mantener `getBanner()` como Wrapper**

```typescript
async function getBanner(user?: IUser | null): Promise<IBanner | null> {
  const banners = await getActiveBanners(user, { limit: 1 });
  return banners[0] || null;
}
```

Así, las rutas existentes siguen funcionando sin cambios.

---

### 3.4. Rutas API

#### **Rutas Existentes (sin cambios)**

```
GET /api/banner → getBanner() → retorna el primer banner activo
```

#### **Nuevas Rutas (Gestión Admin)**

```
Admin Routes (requiere autenticación + permisos de admin):

POST   /api/admin/banners                    → Crear banner
GET    /api/admin/banners                    → Listar todos los banners
GET    /api/admin/banners/:id                → Obtener banner específico
PUT    /api/admin/banners/:id                → Actualizar banner
DELETE /api/admin/banners/:id                → Eliminar banner
PATCH  /api/admin/banners/:id/toggle         → Activar/Desactivar banner
GET    /api/admin/banners/:id/stats          → Estadísticas (views, dismissals)

User Routes (para múltiples banners):

GET    /api/banners                           → getActiveBanners() → array de banners
POST   /api/banners/:bannerId/view           → Track view
POST   /api/banners/:bannerId/dismiss        → Track dismiss (localStorage)
```

---

### 3.5. Frontend: Múltiples Banners

#### **Nuevo Componente: `<BannerCarousel />`**

```typescript
export const BannerCarousel = ({ onHeightChange }: Props) => {
  const { data: banners = [] } = useGetActiveBannersQuery();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hiddenBannerIds, setHiddenBannerIds] = useRecoilState(
    store.hiddenBannerIds
  );
  
  // Filtrar banners que el usuario ya cerró
  const visibleBanners = banners.filter(
    b => !b.persistable ? !hiddenBannerIds.includes(b.bannerId) : true
  );
  
  if (visibleBanners.length === 0) return null;
  
  const currentBanner = visibleBanners[currentIndex];
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
  };
  
  const handlePrev = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? visibleBanners.length - 1 : prev - 1
    );
  };
  
  const handleDismiss = () => {
    if (!currentBanner.persistable) {
      setHiddenBannerIds([...hiddenBannerIds, currentBanner.bannerId]);
      
      // Si era el último, cerrar carousel
      if (visibleBanners.length === 1) {
        onHeightChange?.(0);
      }
    }
  };
  
  return (
    <div className="banner-carousel">
      {visibleBanners.length > 1 && (
        <Button onClick={handlePrev} aria-label="Previous banner">
          <ChevronLeftIcon />
        </Button>
      )}
      
      <div 
        className="banner-content"
        dangerouslySetInnerHTML={{ __html: currentBanner.message }}
      />
      
      {visibleBanners.length > 1 && (
        <>
          <Button onClick={handleNext} aria-label="Next banner">
            <ChevronRightIcon />
          </Button>
          <div className="banner-indicators">
            {visibleBanners.map((_, idx) => (
              <span 
                key={idx}
                className={idx === currentIndex ? 'active' : ''}
              />
            ))}
          </div>
        </>
      )}
      
      {!currentBanner.persistable && (
        <Button onClick={handleDismiss} aria-label="Dismiss banner">
          <XIcon />
        </Button>
      )}
    </div>
  );
};
```

#### **Nuevo Query Hook**

```typescript
export const useGetActiveBannersQuery = () => {
  return useQuery<TBannerResponse[]>(
    [QueryKeys.banners],
    () => dataService.getActiveBanners(),
    { 
      enabled: true,
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );
};
```

#### **Compatibilidad: Mantener `<Banner />` Original**

Opción 1: Redireccionar internamente a `<BannerCarousel />`
Opción 2: Mantener ambos componentes, permitir configuración

---

### 3.6. Panel de Administración

#### **Nuevo Controlador: `api/server/controllers/admin/banners.js`**

```javascript
const { requireJwtAuth, requireRole } = require('~/server/middleware');
const { 
  createBanner, 
  updateBanner, 
  deleteBanner,
  listBanners,
  getBannerById,
  toggleBanner,
  getBannerStats,
} = require('~/models');

// Middleware de validación
const validateBannerCreation = require('~/server/middleware/validators/banner');

router.use(requireJwtAuth);
router.use(requireRole(['ADMIN']));

router.post('/', validateBannerCreation, async (req, res) => {
  try {
    const banner = await createBanner({
      ...req.body,
      tenantId: req.user.tenantId,
    });
    res.status(201).json(banner);
  } catch (error) {
    logger.error('[createBanner] Error:', error);
    res.status(500).json({ message: 'Error creating banner' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, audienceMode, isActive } = req.query;
    const banners = await listBanners({
      page: parseInt(page),
      limit: parseInt(limit),
      filter: { audienceMode, isActive },
      tenantId: req.user.tenantId,
    });
    res.json(banners);
  } catch (error) {
    logger.error('[listBanners] Error:', error);
    res.status(500).json({ message: 'Error listing banners' });
  }
});

// ... más rutas
```

#### **Nuevos Métodos en `packages/data-schemas/src/methods/banner.ts`**

```typescript
export function createBannerMethods(mongoose: typeof import('mongoose')) {
  
  async function createBanner(data: Partial<IBanner>): Promise<IBanner> {
    const Banner = mongoose.models.Banner as Model<IBanner>;
    
    // Generar bannerId
    const bannerId = uuidv5(data.message!, NAMESPACE);
    
    // Validar audiencia
    if (data.audienceMode === 'role' && data.targetRoleIds?.length) {
      await validateRolesExist(data.targetRoleIds);
    }
    if (data.audienceMode === 'group' && data.targetGroupIds?.length) {
      await validateGroupsExist(data.targetGroupIds);
    }
    
    const banner = await Banner.create({
      ...data,
      bannerId,
      isActive: data.isActive ?? true,
    });
    
    return banner;
  }
  
  async function updateBanner(
    bannerId: string, 
    updates: Partial<IBanner>
  ): Promise<IBanner | null> {
    const Banner = mongoose.models.Banner as Model<IBanner>;
    
    // Validar audiencia si se actualiza
    if (updates.audienceMode === 'role' && updates.targetRoleIds?.length) {
      await validateRolesExist(updates.targetRoleIds);
    }
    if (updates.audienceMode === 'group' && updates.targetGroupIds?.length) {
      await validateGroupsExist(updates.targetGroupIds);
    }
    
    return Banner.findOneAndUpdate(
      { bannerId },
      { $set: updates },
      { new: true }
    );
  }
  
  async function deleteBanner(bannerId: string): Promise<boolean> {
    const Banner = mongoose.models.Banner as Model<IBanner>;
    const result = await Banner.deleteOne({ bannerId });
    return result.deletedCount > 0;
  }
  
  async function listBanners(options: {
    page: number;
    limit: number;
    filter?: Partial<IBanner>;
    tenantId?: string;
  }): Promise<{ banners: IBanner[]; total: number }> {
    const Banner = mongoose.models.Banner as Model<IBanner>;
    const { page, limit, filter = {}, tenantId } = options;
    
    const query = { ...filter };
    if (tenantId) {
      query.tenantId = tenantId;
    }
    
    const [banners, total] = await Promise.all([
      Banner.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Banner.countDocuments(query),
    ]);
    
    return { banners, total };
  }
  
  async function toggleBanner(bannerId: string): Promise<IBanner | null> {
    const Banner = mongoose.models.Banner as Model<IBanner>;
    const banner = await Banner.findOne({ bannerId });
    if (!banner) return null;
    
    banner.isActive = !banner.isActive;
    await banner.save();
    return banner;
  }
  
  // Helpers de validación
  async function validateRolesExist(roleIds: string[]): Promise<void> {
    const Role = mongoose.models.Role as Model<IRole>;
    const existingRoles = await Role.find({ 
      name: { $in: roleIds } 
    }).select('name');
    
    const existingNames = existingRoles.map(r => r.name);
    const missing = roleIds.filter(id => !existingNames.includes(id));
    
    if (missing.length > 0) {
      throw new Error(`Roles no encontrados: ${missing.join(', ')}`);
    }
  }
  
  async function validateGroupsExist(groupIds: string[]): Promise<void> {
    const Group = mongoose.models.Group as Model<IGroup>;
    const objectIds = groupIds.map(id => new Types.ObjectId(id));
    const existingGroups = await Group.find({ 
      _id: { $in: objectIds } 
    }).select('_id');
    
    if (existingGroups.length !== groupIds.length) {
      throw new Error('Algunos grupos no existen');
    }
  }
  
  return {
    getBanner,
    getActiveBanners,
    createBanner,
    updateBanner,
    deleteBanner,
    listBanners,
    toggleBanner,
    validateRolesExist,
    validateGroupsExist,
  };
}
```

---

### 3.7. Scripts NPM (Compatibilidad)

#### **Mantener Scripts Existentes**

Los scripts `update-banner` y `delete-banner` seguirán funcionando:

**Modificación mínima en `update-banner.js`:**

```javascript
// En lugar de hacer upsert en el ÚNICO banner,
// crear uno nuevo con audienceMode: 'global'

const result = await Banner.create({
  displayFrom,
  displayTo,
  message,
  bannerId,
  isPublic,
  persistable,
  audienceMode: 'global',  // Nuevo campo
  isActive: true,           // Nuevo campo
});
```

**Modificación mínima en `delete-banner.js`:**

```javascript
// En lugar de buscar el único banner activo,
// buscar el banner global más reciente

const banner = await Banner.findOne({
  displayFrom: { $lte: now },
  $or: [{ displayTo: { $gte: now } }, { displayTo: null }],
  audienceMode: { $in: ['global', undefined, null] },
})
  .sort({ createdAt: -1 });
```

---

## Plan de Implementación por Fases

### Fase 0: Preparación (✅ Completada)

- [x] Revisar CONTRIBUTING.md
- [x] Analizar sistema actual de banners
- [x] Documentar roles/grupos existentes
- [x] Identificar puntos de extensión

---

### Fase 1: Análisis y Documentación (1-2 días)

#### **Tareas:**

1. **Documentar flujo actual completo**
   - Diagrama de secuencia
   - Casos de uso existentes
   - Tests actuales de banners

2. **Validar infraestructura ACL**
   - Tests de `getUserPrincipals()`
   - Verificar multi-tenancy
   - Probar queries de grupos/roles

3. **Crear plan de tests**
   - Unit tests para nuevos métodos
   - Integration tests para rutas admin
   - E2E tests para carousel

#### **Entregables:**
- Documento de arquitectura actual (este documento)
- Plan de tests detallado
- Diagramas de flujo

---

### Fase 2: Backend - Schema y Métodos (3-4 días)

#### **Tareas:**

1. **Evolucionar schema de Banner**
   ```bash
   # Archivos a modificar:
   packages/data-schemas/src/schema/banner.ts
   packages/data-schemas/src/types/index.ts
   packages/data-provider/src/schemas.ts
   ```
   - Añadir nuevos campos opcionales
   - Crear índices
   - Generar tipos TypeScript

2. **Implementar `getActiveBanners()`**
   ```bash
   packages/data-schemas/src/methods/banner.ts
   ```
   - Lógica de audiencia con principals
   - Filtrado por fechas
   - Ordenamiento por prioridad
   - Tests unitarios

3. **Implementar métodos CRUD**
   ```bash
   packages/data-schemas/src/methods/banner.ts
   ```
   - `createBanner()` con validación de audiencia
   - `updateBanner()` con validación
   - `deleteBanner()`
   - `listBanners()` con paginación
   - `toggleBanner()`
   - Tests unitarios para cada método

4. **Mantener compatibilidad de `getBanner()`**
   - Wrapper sobre `getActiveBanners()`
   - Tests de regresión

#### **Tests:**
```bash
npm run test:api -- banner
```

#### **Entregables:**
- Schema actualizado con migración
- Métodos implementados y testeados
- 100% compatibilidad con sistema anterior

---

### Fase 3: Backend - Rutas Admin (2-3 días)

#### **Tareas:**

1. **Crear controlador admin**
   ```bash
   api/server/controllers/admin/banners.js
   ```
   - POST crear banner
   - GET listar banners
   - GET obtener banner por ID
   - PUT actualizar banner
   - DELETE eliminar banner
   - PATCH toggle activo/inactivo

2. **Middleware de validación**
   ```bash
   api/server/middleware/validators/banner.js
   ```
   - Validar campos requeridos
   - Validar fechas (displayFrom < displayTo)
   - Validar audienceMode y targets
   - Validar permisos (solo ADMIN)

3. **Registrar rutas**
   ```bash
   api/server/routes/index.js
   ```
   ```javascript
   app.use('/api/admin/banners', require('./routes/admin/banners'));
   ```

4. **Ruta pública mejorada**
   ```bash
   api/server/routes/banner.js
   ```
   - Añadir `GET /api/banners` → array de banners
   - Mantener `GET /api/banner` → primer banner

#### **Tests:**
```bash
# Integration tests
npm run test:api -- routes/admin/banners
```

#### **Entregables:**
- API admin funcional
- Validaciones robustas
- Tests de integración

---

### Fase 4: Frontend - Multi-Banner UX (3-4 días)

#### **Tareas:**

1. **Nuevo query hook**
   ```bash
   client/src/data-provider/Misc/queries.ts
   ```
   ```typescript
   export const useGetActiveBannersQuery = () => { ... }
   ```

2. **Componente `<BannerCarousel />`**
   ```bash
   client/src/components/Banners/BannerCarousel.tsx
   ```
   - Rotación con flechas
   - Indicadores de posición
   - Botón dismiss
   - Animaciones CSS
   - Responsive design

3. **Lógica de persistencia**
   ```bash
   client/src/store/banners.ts
   ```
   - Recoil state para banners ocultos
   - Sync con localStorage
   - Hook `useHiddenBanners()`

4. **Integrar en layout principal**
   ```bash
   client/src/components/Layout/MainLayout.tsx
   ```
   - Reemplazar `<Banner />` por `<BannerCarousel />`
   - Ajuste de altura dinámica
   - Sticky positioning

5. **Estilos**
   ```bash
   client/src/components/Banners/BannerCarousel.module.css
   ```
   - Transiciones suaves
   - Flechas de navegación
   - Indicadores
   - Dark mode support

#### **Tests:**
```bash
npm run test:client -- BannerCarousel
```

#### **Entregables:**
- Carousel funcional
- UX pulida
- Tests del componente

---

### Fase 5: Frontend - Panel Admin (4-5 días)

#### **Tareas:**

1. **Rutas admin**
   ```bash
   client/src/routes/AdminRoutes.tsx
   ```
   ```typescript
   <Route path="/admin/banners" element={<BannersAdminPage />} />
   <Route path="/admin/banners/new" element={<BannerEditorPage />} />
   <Route path="/admin/banners/:id/edit" element={<BannerEditorPage />} />
   ```

2. **Página lista de banners**
   ```bash
   client/src/components/Admin/Banners/BannersListPage.tsx
   ```
   - Tabla con banners existentes
   - Columnas: mensaje, audiencia, fechas, estado, acciones
   - Paginación
   - Filtros (audienceMode, isActive)
   - Botones: crear, editar, eliminar, toggle

3. **Formulario crear/editar banner**
   ```bash
   client/src/components/Admin/Banners/BannerEditorPage.tsx
   ```
   - Campo `message` (rich text editor o textarea)
   - Selector `audienceMode` (global, role, group, user)
   - Multi-select roles (si mode=role)
   - Multi-select groups (si mode=group)
   - User picker (si mode=user)
   - Date pickers para displayFrom/displayTo
   - Checkbox `isPublic`, `persistable`, `isActive`
   - Slider de prioridad
   - Vista previa del banner

4. **Hooks y queries**
   ```bash
   client/src/data-provider/Admin/banners.ts
   ```
   ```typescript
   export const useListBannersQuery = (params) => { ... }
   export const useCreateBannerMutation = () => { ... }
   export const useUpdateBannerMutation = () => { ... }
   export const useDeleteBannerMutation = () => { ... }
   export const useToggleBannerMutation = () => { ... }
   ```

5. **Componentes auxiliares**
   ```bash
   client/src/components/Admin/Banners/
   ```
   - `RoleSelector.tsx`
   - `GroupSelector.tsx`
   - `UserPicker.tsx`
   - `BannerPreview.tsx`

6. **Navegación admin**
   ```bash
   client/src/components/Admin/AdminSidebar.tsx
   ```
   - Añadir enlace "Banners" en sidebar

#### **Tests:**
```bash
npm run test:client -- Admin/Banners
```

#### **Entregables:**
- Panel admin completo
- UX intuitiva
- Tests de componentes

---

### Fase 6: Migración y Retrocompatibilidad (1-2 días)

#### **Tareas:**

1. **Script de migración**
   ```bash
   config/migrate-banners.js
   ```
   ```javascript
   // Convertir banners legacy a formato nuevo
   async function migrateLegacyBanners() {
     const Banner = mongoose.models.Banner;
     
     // Buscar banners sin audienceMode
     const legacyBanners = await Banner.find({
       audienceMode: { $exists: false }
     });
     
     for (const banner of legacyBanners) {
       await Banner.updateOne(
         { _id: banner._id },
         { 
           $set: { 
             audienceMode: 'global',
             isActive: true,
             priority: 50,
           }
         }
       );
     }
     
     console.log(`Migrated ${legacyBanners.length} banners`);
   }
   ```

2. **Actualizar scripts NPM**
   ```bash
   config/update-banner.js
   config/delete-banner.js
   ```
   - Añadir campo `audienceMode: 'global'`
   - Actualizar documentación inline

3. **Tests de compatibilidad**
   ```bash
   api/test/banner-compatibility.spec.js
   ```
   - Crear banner con script legacy
   - Verificar que se obtiene con `getBanner()`
   - Verificar que aparece en `getActiveBanners()`
   - Eliminar con script legacy

#### **Entregables:**
- Script de migración testeado
- Scripts NPM actualizados
- Tests de regresión pasando

---

### Fase 7: Testing End-to-End (2-3 días)

#### **Tareas:**

1. **Tests E2E - Banner público**
   ```bash
   e2e/specs/banner-public.spec.ts
   ```
   - Banner global visible sin login
   - Banner con audienceMode=role no visible sin login
   - Cerrar banner no persistable

2. **Tests E2E - Banner por roles**
   ```bash
   e2e/specs/banner-roles.spec.ts
   ```
   - Usuario con role ADMIN ve banner para ADMIN
   - Usuario con role USER no ve banner para ADMIN
   - Usuario ve banner global + banner de su rol

3. **Tests E2E - Banner por grupos**
   ```bash
   e2e/specs/banner-groups.spec.ts
   ```
   - Usuario en grupo "Developers" ve banner del grupo
   - Usuario fuera del grupo no lo ve

4. **Tests E2E - Carousel**
   ```bash
   e2e/specs/banner-carousel.spec.ts
   ```
   - Múltiples banners activos
   - Navegación con flechas
   - Indicadores de posición
   - Cierre de banner individual
   - Persistencia en localStorage

5. **Tests E2E - Panel Admin**
   ```bash
   e2e/specs/admin-banners.spec.ts
   ```
   - Admin crea banner global
   - Admin crea banner para rol específico
   - Admin edita banner existente
   - Admin elimina banner
   - Admin toggle activo/inactivo

#### **Comando:**
```bash
npm run e2e -- --spec=banner
```

#### **Entregables:**
- Suite completa de tests E2E
- Coverage > 80%
- Todos los tests pasando

---

### Fase 8: Documentación y Deployment (1-2 días)

#### **Tareas:**

1. **Documentación de usuario**
   ```bash
   docs/admin/banners.md
   ```
   - Cómo crear un banner
   - Tipos de audiencia
   - Mejores prácticas
   - Ejemplos de uso

2. **Documentación técnica**
   ```bash
   docs/development/banners-architecture.md
   ```
   - Arquitectura del sistema
   - Flujo de datos
   - Decisiones de diseño
   - Extensibilidad futura

3. **Actualizar README**
   ```bash
   README.md
   ```
   - Añadir sección "Multi-Banner System"
   - Capturas de pantalla
   - Enlace a documentación

4. **CHANGELOG**
   ```bash
   CHANGELOG.md
   ```
   ```markdown
   ## [v0.9.0] - 2026-04-XX
   
   ### Added
   - Multi-banner system with role/group targeting
   - Banner management admin panel at /admin/banners
   - Banner carousel for multiple active banners
   - Audience modes: global, role, group, user
   
   ### Changed
   - Banner schema extended with optional fields (backward compatible)
   - `getBanner()` now returns first active banner (legacy support)
   - NPM scripts preserved with minimal changes
   
   ### Deprecated
   - None (full backward compatibility)
   
   ### Migration
   - Run `npm run migrate-banners` to update legacy banners
   ```

5. **Deployment checklist**
   ```bash
   docs/deployment/multi-banner-deployment.md
   ```
   - Pre-deployment checks
   - Migración de datos
   - Rollback plan
   - Monitoring

#### **Entregables:**
- Documentación completa
- CHANGELOG actualizado
- Deployment checklist

---

## Breaking Changes y Mitigación

### 5.1. Cambios Potencialmente Rompientes

#### **❌ NO HAY BREAKING CHANGES**

La implementación propuesta es **100% compatible hacia atrás**:

1. **Schema:** Todos los campos nuevos son opcionales
2. **API:** Rutas existentes no cambian comportamiento
3. **Scripts NPM:** Siguen funcionando igual
4. **Frontend:** `<Banner />` sigue mostrando un solo banner

### 5.2. Plan de Migración

Aunque no hay breaking changes, los pasos recomendados:

1. **Desplegar backend y schema** → banners legacy siguen funcionando
2. **Ejecutar script de migración** → añade campos opcionales
3. **Desplegar frontend** → nuevo carousel es opt-in
4. **Actualizar documentación** → informar a admins del nuevo panel
5. **Migrar banners a multi-banner** → gradual, sin prisa

### 5.3. Rollback Plan

Si algo sale mal:

1. **DB:** Los campos nuevos son opcionales → no rompen nada
2. **Backend:** Revertir a commit anterior
3. **Frontend:** Revertir a commit anterior
4. **Scripts NPM:** Ya funcionaban antes

No se necesita migración de datos para rollback.

---

## Consideraciones Técnicas

### 6.1. Performance

#### **Optimizaciones de Queries**

```typescript
// En lugar de N queries (1 por principal)
// Hacer 1 query con $or

const audienceQuery = {
  $or: [
    { audienceMode: 'global' },
    { audienceMode: 'role', targetRoleIds: { $in: userRoleIds } },
    { audienceMode: 'group', targetGroupIds: { $in: userGroupIds } },
  ]
};
```

#### **Caché**

- **Redis:** Cachear resultado de `getActiveBanners()` por userId (TTL: 5 min)
- **React Query:** `staleTime: 5 * 60 * 1000` (5 minutos)

#### **Índices**

Todos los índices propuestos en sección 3.2 son críticos para performance.

---

### 6.2. Seguridad

#### **Validación de Audiencia**

```typescript
// Al crear/editar banner, validar que roles/grupos existan
async function validateAudience(banner: Partial<IBanner>) {
  if (banner.audienceMode === 'role') {
    const Role = mongoose.models.Role;
    const existingRoles = await Role.find({ 
      name: { $in: banner.targetRoleIds }
    });
    if (existingRoles.length !== banner.targetRoleIds.length) {
      throw new Error('Some roles do not exist');
    }
  }
  // Similar para grupos y usuarios
}
```

#### **XSS Prevention**

- **Backend:** Sanitizar HTML del mensaje con DOMPurify
- **Frontend:** Usar `dangerouslySetInnerHTML` con precaución
- Considerar usar Markdown en lugar de HTML directo

#### **Permisos Admin**

```typescript
// Middleware para rutas /admin/banners
router.use(requireJwtAuth);
router.use(requireRole(['ADMIN']));
```

---

### 6.3. Multi-Tenancy

Todos los modelos ya tienen soporte para `tenantId`:

```typescript
const query = {
  ...baseQuery,
  tenantId: req.user.tenantId,
};
```

El plugin `applyTenantIsolation` de Mongoose maneja esto automáticamente.

---

### 6.4. Escalabilidad

#### **Límites Recomendados**

- **Banners activos simultáneos:** 10 por usuario (configurable)
- **Tamaño del mensaje:** 5000 caracteres
- **Banners totales en BD:** sin límite (con índices eficientes)

#### **Paginación**

```typescript
// En panel admin
const { page, limit } = req.query;
const skip = (page - 1) * limit;
const banners = await Banner.find(query).skip(skip).limit(limit);
```

---

### 6.5. Extensibilidad Futura

#### **Tipos de Notificaciones**

El campo `type` ya existe:
```typescript
type: 'banner' | 'popup' | 'toast' | 'notification'
```

Fácil añadir:
- `'popup'`: Modal que aparece al login
- `'toast'`: Notificación temporal
- `'notification'`: Centro de notificaciones

#### **Scheduling Avanzado**

Añadir campos:
```typescript
interface IBanner {
  // ...
  schedule?: {
    daysOfWeek?: number[];  // 0-6 (domingo-sábado)
    hoursOfDay?: number[];  // 0-23
    timezone?: string;
  };
}
```

#### **A/B Testing**

Añadir campos:
```typescript
interface IBanner {
  // ...
  variant?: 'A' | 'B';
  splitPercentage?: number;  // 0-100
}
```

---

## Cronograma Estimado

### 7.1. Resumen por Fase

| Fase | Descripción | Duración | Dependencias |
|------|-------------|----------|--------------|
| 0 | Preparación | ✅ | Ninguna |
| 1 | Análisis y Documentación | 1-2 días | Fase 0 |
| 2 | Backend - Schema y Métodos | 3-4 días | Fase 1 |
| 3 | Backend - Rutas Admin | 2-3 días | Fase 2 |
| 4 | Frontend - Multi-Banner UX | 3-4 días | Fase 2, 3 |
| 5 | Frontend - Panel Admin | 4-5 días | Fase 3, 4 |
| 6 | Migración y Retrocompatibilidad | 1-2 días | Fase 2, 3 |
| 7 | Testing End-to-End | 2-3 días | Todas |
| 8 | Documentación y Deployment | 1-2 días | Todas |

**Total estimado:** 17-25 días (~3-5 semanas)

---

### 7.2. Cronograma Detallado (Sprint de 2 semanas)

#### **Sprint 1 (Días 1-10)**

**Semana 1:**
- Día 1-2: Fase 1 (Análisis)
- Día 3-6: Fase 2 (Backend - Schema y Métodos)
- Día 7-8: Fase 3 (Backend - Rutas Admin) - Inicio

**Semana 2:**
- Día 9-10: Fase 3 (Backend - Rutas Admin) - Finalización
- Tests de integración backend

#### **Sprint 2 (Días 11-20)**

**Semana 3:**
- Día 11-14: Fase 4 (Frontend - Multi-Banner UX)
- Día 15-17: Fase 5 (Frontend - Panel Admin) - Inicio

**Semana 4:**
- Día 18-20: Fase 5 (Frontend - Panel Admin) - Finalización

#### **Sprint 3 (Días 21-25)**

**Semana 5:**
- Día 21-22: Fase 6 (Migración)
- Día 23-24: Fase 7 (E2E Testing)
- Día 25: Fase 8 (Documentación)

---

### 7.3. Hitos Críticos

✅ **Milestone 1:** Backend funcional (fin Sprint 1)
- Schema migrado
- Métodos CRUD testeados
- Rutas admin funcionando

✅ **Milestone 2:** Frontend funcional (fin Sprint 2)
- Carousel operativo
- Panel admin usable
- Integración completa

✅ **Milestone 3:** Deployment ready (fin Sprint 3)
- Todos los tests pasando
- Documentación completa
- Migración validada

---

## Apéndices

### A. Glosario

- **Principal:** Entidad que puede tener permisos (USER, ROLE, GROUP, PUBLIC)
- **Audience Mode:** Tipo de audiencia del banner (global, role, group, user)
- **Banner ID:** UUID v5 generado del mensaje del banner
- **Persistable:** Banner que no puede ser cerrado por el usuario
- **Tenant:** Instancia multi-tenant de LibreChat

### B. Referencias

- [CONTRIBUTING.md](/.github/CONTRIBUTING.md)
- [ACL System Docs](https://github.com/danny-avila/LibreChat/discussions/XXXX)
- [MongoDB Schema Design](https://www.mongodb.com/docs/manual/core/data-model-design/)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/best-practices)

### C. Contacto

Para preguntas sobre este plan:
- Equipo de desarrollo: [Discord LibreChat](https://discord.librechat.ai)
- Issues: [GitHub Issues](https://github.com/danny-avila/LibreChat/issues)

---

**Fin del Documento**
