# 📡 Multi-Banner API Endpoints - Documentación

## ⚠️ IMPORTANTE: Hay 2 Endpoints Diferentes

LibreChat tiene **DOS endpoints** para banners con propósitos diferentes:

---

## 1️⃣ `/api/banner` - Legacy (Single Banner)

**Propósito**: Compatibilidad con código antiguo  
**Devuelve**: Un solo banner (objeto JSON)  
**Uso**: Solo para código legacy que espera 1 banner

### Ejemplo de Respuesta

```json
{
  "_id": "69e0bbdf356bd69d2dee25d5",
  "bannerId": "test-banner-1776335838999-13",
  "message": "[TEST] 🚨 Banner...",
  "priority": 100,
  "isActive": true,
  ...
}
```

### ⚠️ Esto es CORRECTO

Este endpoint está **diseñado** para devolver solo 1 banner. No es un bug.

### Código Backend

```javascript
// api/server/routes/banner.js
router.get('/', optionalJwtAuth, async (req, res) => {
  try {
    res.status(200).send(await getBanner(req.user)); // Solo 1 banner
  } catch (error) {
    logger.error('[getBanner] Error getting banner', error);
    res.status(500).json({ message: 'Error getting banner' });
  }
});
```

---

## 2️⃣ `/api/banner/list` - Multi-Banner (Array)

**Propósito**: Sistema multi-banner con carrusel  
**Devuelve**: Array de banners (hasta 10 por defecto)  
**Uso**: Frontend (BannerCarousel) para mostrar múltiples banners

### Ejemplo de Respuesta

```json
[
  {
    "_id": "...",
    "message": "[TEST] 🚨 Banner P100...",
    "priority": 100,
    ...
  },
  {
    "_id": "...",
    "message": "[TEST] ⚠️ Banner P95...",
    "priority": 95,
    ...
  },
  {
    "_id": "...",
    "message": "[TEST] Mantenimiento P85...",
    "priority": 85,
    ...
  },
  // ... hasta 10 banners
]
```

### ✅ Esto es lo que el frontend usa

### Código Backend

```javascript
// api/server/routes/banner.js
router.get('/list', optionalJwtAuth, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const banners = await getActiveBanners(req.user, { limit }); // Array
    res.status(200).json(banners);
  } catch (error) {
    logger.error('[getActiveBanners] Error getting banners', error);
    res.status(500).json({ message: 'Error getting banners' });
  }
});
```

---

## 🧪 Testing

### Probar endpoint LEGACY (1 banner)

```bash
# Sin autenticación
curl http://localhost:3080/api/banner

# Con autenticación
curl http://localhost:3080/api/banner \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Resultado esperado**: 1 objeto JSON (no array)

---

### Probar endpoint MULTI-BANNER (array)

```bash
# Sin autenticación (solo banners públicos)
curl http://localhost:3080/api/banner/list

# Con autenticación (incluye banners privados)
curl http://localhost:3080/api/banner/list \
  -H "Authorization: Bearer YOUR_TOKEN"

# Con límite personalizado
curl http://localhost:3080/api/banner/list?limit=20
```

**Resultado esperado**: Array JSON con múltiples banners

---

### Verificar en el navegador

#### Opción 1: Network Tab

1. Abre DevTools (F12)
2. Ve a la pestaña **Network**
3. Filtra por "banner"
4. Recarga la página
5. Deberías ver: `banner/list` con status 200
6. Click en la request → Preview → Verás el array de banners

#### Opción 2: Console

```javascript
// Ejecutar en la consola del navegador (F12)
fetch('/api/banner/list')
  .then(r => r.json())
  .then(banners => {
    console.log(`Total banners: ${banners.length}`);
    console.table(banners.map(b => ({
      priority: b.priority,
      message: b.message.substring(0, 50),
      audience: b.audienceMode,
      persistable: b.persistable
    })));
  });
```

**Resultado esperado**: 7-12 banners dependiendo de autenticación

---

## 🎯 ¿Qué Endpoint Usa el Frontend?

### BannerCarousel.tsx

```typescript
// client/src/components/Banners/BannerCarousel.tsx
export const BannerCarousel = ({ ... }) => {
    const { data: banners = [] } = useBannersQuery();
    // ↑ Usa el hook useBannersQuery
    ...
}
```

### useBannersQuery.ts

```typescript
// client/src/data-provider/Banners/useBannersQuery.ts
export default function useBannersQuery(...) {
  return useQuery<TBanner[]>(
    [QueryKeys.banners],
    () => dataService.getActiveBanners(), // ← Llama a getActiveBanners
    { ... }
  );
}
```

### data-service.ts

```typescript
// packages/data-provider/src/data-service.ts
export function getActiveBanners(): Promise<s.TBanner[]> {
  return request.get(endpoints.banners()); // ← Usa endpoints.banners()
}
```

### api-endpoints.ts

```typescript
// packages/data-provider/src/api-endpoints.ts
export const banners = () => `${BASE_URL}/api/banner/list`; // ← /list
//                                                    ^^^^
//                                                    CORRECTO!
```

**Conclusión**: El frontend usa `/api/banner/list` ✅

---

## 🐛 Troubleshooting

### "Solo veo 1 banner en /api/banner"

✅ **Esto es CORRECTO**. El endpoint `/api/banner` está diseñado para devolver solo 1 banner.

🔍 **Prueba el endpoint correcto**: `/api/banner/list`

---

### "Solo veo 1 banner en el navegador"

❌ **Problema de localStorage**. Los banners dismissed están guardados.

**Solución**:
```javascript
// En consola del navegador (F12)
localStorage.removeItem('hideBannerHint');
location.reload();
```

---

### "/api/banner/list devuelve array vacío []"

**Causas posibles**:

1. **No hay banners públicos** (sin autenticación)
   - Solución: Añadir `isPublic: true` a banners globales
   - O autenticarse en la aplicación

2. **Banners fuera de rango de fechas**
   - Verificar `displayFrom` y `displayTo`

3. **Banners inactivos**
   - Verificar `isActive: true`

**Verificar en MongoDB**:
```bash
npm run test-banners stats
```

---

### "/api/banner/list devuelve banners pero el navegador solo muestra 1"

**Problema**: localStorage tiene banners dismissed

**Solución**:
```javascript
localStorage.removeItem('hideBannerHint');
location.reload();
```

**Verificar**:
```javascript
const hidden = JSON.parse(localStorage.getItem('hideBannerHint') || '[]');
console.log('Dismissed:', hidden.length, hidden);
```

---

## 📊 Comparación Rápida

| Característica | `/api/banner` | `/api/banner/list` |
|----------------|---------------|-------------------|
| **Propósito** | Legacy | Multi-banner |
| **Devuelve** | 1 objeto | Array de objetos |
| **Tipo** | `TBanner \| null` | `TBanner[]` |
| **Límite** | 1 (fijo) | 10 (configurable) |
| **Frontend** | ❌ No usado | ✅ Usado (BannerCarousel) |
| **Ordenamiento** | Por prioridad | Por prioridad |
| **Query params** | Ninguno | `?limit=N` |

---

## 🎬 Resumen

### Si estás probando manualmente:

- **Usa** `/api/banner/list` para ver múltiples banners
- **Ignora** `/api/banner` (solo para legacy)

### Si el navegador solo muestra 1 banner:

1. Verifica que `/api/banner/list` devuelva múltiples (debería)
2. Limpia localStorage: `localStorage.removeItem('hideBannerHint')`
3. Recarga la página
4. Deberías ver flechas y puntos de navegación

### Orden de debugging:

```bash
# 1. Verificar banners en BD
npm run test-banners stats

# 2. Probar API directamente
curl http://localhost:3080/api/banner/list | jq 'length'

# 3. Limpiar localStorage en navegador
# (F12 → Console → localStorage.removeItem('hideBannerHint') → location.reload())

# 4. Verificar Network tab en DevTools
# (Debería hacer request a /api/banner/list)
```

---

## 📚 Documentos Relacionados

- [BANNER_EXAMPLES.md](BANNER_EXAMPLES.md) - Ejemplos de creación de banners
- [TROUBLESHOOTING_BANNERS.md](TROUBLESHOOTING_BANNERS.md) - Guía de problemas comunes
- [MULTI_BANNER_IMPLEMENTATION.md](MULTI_BANNER_IMPLEMENTATION.md) - Implementación técnica

---

**¿Aún tienes dudas?** Usa la herramienta de debug:
```
http://localhost:3080/debug-banners.html
```
