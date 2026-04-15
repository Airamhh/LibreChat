# Índice: Documentación Sistema Multi-Banner

Bienvenido a la documentación del sistema multi-banner para LibreChat. Esta funcionalidad extiende el sistema actual de banners para soportar múltiples banners activos con reglas basadas en roles y grupos.

---

## 📚 Documentos Disponibles

### 1. [MULTI_BANNER_PLAN.md](./MULTI_BANNER_PLAN.md) - Plan Técnico Completo
**Documento principal** con toda la información técnica detallada.

**Contenido:**
- ✅ Resumen Ejecutivo
- ✅ Análisis del Sistema Actual (schema, backend, frontend, scripts)
- ✅ Sistema de Roles/Grupos Existente
- ✅ Arquitectura Propuesta (schema evolution, métodos, rutas)
- ✅ Plan de Implementación por Fases (8 fases, 17-25 días)
- ✅ Breaking Changes y Mitigación (NINGUNO)
- ✅ Consideraciones Técnicas (performance, seguridad, multi-tenancy)
- ✅ Cronograma Estimado

**📖 Lectura recomendada:** ~30 minutos  
**Audiencia:** Desarrolladores, arquitectos, project managers

---

### 2. [MULTI_BANNER_SUMMARY.md](./MULTI_BANNER_SUMMARY.md) - Resumen Ejecutivo
**Documento condensado** con las decisiones clave y resumen rápido.

**Contenido:**
- ⚡ Garantía de compatibilidad 100%
- 📋 Resumen de cambios (backend, frontend, scripts)
- 🎯 Decisiones clave de diseño (4 principales)
- 🔍 Validaciones críticas
- ⚡ Optimizaciones de performance
- 🛡️ Seguridad
- 📊 Diagramas de flujo
- ✅ Checklist de implementación

**📖 Lectura recomendada:** ~10 minutos  
**Audiencia:** Stakeholders, lead developers, reviewers

---

### 3. [MULTI_BANNER_EXAMPLES.md](./MULTI_BANNER_EXAMPLES.md) - Ejemplos de Código
**Código listo para usar** con pseudocódigo detallado.

**Contenido:**
1. **Schema Migration** (banner.ts, types)
2. **Backend Methods** (`getActiveBanners`, CRUD, validaciones)
3. **Backend Routes** (admin routes, public routes)
4. **Frontend Components** (`BannerCarousel`, data provider, Recoil state)
5. **Admin Panel** (lista de banners, formularios)
6. **Migration Script** (`migrate-banners.js`)
7. **Tests** (unit tests, integration tests)

**📖 Lectura recomendada:** Por sección según necesidad  
**Audiencia:** Desarrolladores implementando el código

---

## 🚀 Inicio Rápido

### Para Entender el Contexto
1. Leer **Sección 2** de `MULTI_BANNER_PLAN.md` (Análisis del Sistema Actual)
2. Leer **Garantía de Compatibilidad** de `MULTI_BANNER_SUMMARY.md`

### Para Implementar
1. Revisar **Fase 2** de `MULTI_BANNER_PLAN.md` (Backend - Schema y Métodos)
2. Copiar código de **Sección 1-2** de `MULTI_BANNER_EXAMPLES.md`
3. Ejecutar tests según **Sección 7** de `MULTI_BANNER_EXAMPLES.md`

### Para Aprobar/Revisar
1. Leer `MULTI_BANNER_SUMMARY.md` completo (~10 min)
2. Revisar **Sección 5** de `MULTI_BANNER_PLAN.md` (Breaking Changes)

---

## 🎯 Resumen de 1 Minuto

**Qué hace:** Permite múltiples banners activos con reglas de audiencia (global, role, group, user).

**Breaking changes:** NINGUNO. Sistema actual sigue funcionando igual.

**Estrategia:** Evolución aditiva del schema + reutilización de infraestructura ACL existente.

**Tiempo estimado:** 3-5 semanas (17-25 días de desarrollo).

**Riesgos:** Bajos. Todo es opcional y backward-compatible.

---

## 📋 Decisiones Clave

### 1. Schema: Evolución en Lugar de Nueva Tabla
✅ **Elegido:** Añadir campos opcionales al schema `Banner` existente  
❌ **Rechazado:** Crear tabla separada `BannerAudience`

**Por qué:** Banners sin `audienceMode` → comportamiento legacy (global). Migración trivial.

---

### 2. Audiencia: Reutilizar Sistema de Principals
✅ **Elegido:** Usar `getUserPrincipals()` existente (USER, ROLE, GROUP, PUBLIC)  
❌ **Rechazado:** Crear nuevo sistema de permisos

**Por qué:** Consistencia con Agents/Prompts/MCP. Soporte multi-tenancy nativo.

---

### 3. UX: Rotación Manual con Flechas
✅ **Elegido:** Flechas izquierda/derecha + indicadores  
❌ **Rechazado:** Auto-rotación con timer

**Por qué:** Usuario controla qué ve. Más accesible. No distrae.

---

### 4. Persistencia: localStorage en Lugar de BD
✅ **Elegido:** Guardar banners cerrados en `localStorage`  
❌ **Rechazado:** Nueva colección `BannerDismissals`

**Por qué:** No aumentar carga BD. Suficiente para esta funcionalidad.

---

## 📐 Arquitectura en 3 Niveles

```
┌─────────────────────────────────────────────┐
│            ADMIN PANEL                      │
│         /admin/banners                      │
│  - Crear/editar/eliminar banners           │
│  - Seleccionar audiencia (role/group)      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│          BACKEND (API)                      │
│  - getActiveBanners(user)                   │
│    → Obtiene principals del usuario         │
│    → Query con $or para audiencias          │
│    → Ordena por prioridad                   │
│  - CRUD methods con validaciones            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│          FRONTEND                           │
│  <BannerCarousel />                         │
│  - Muestra array de banners activos        │
│  - Navegación con flechas                  │
│  - Dismiss individual                      │
│  - Persist en localStorage                 │
└─────────────────────────────────────────────┘
```

---

## ⚡ Optimizaciones Clave

### 1. Índices MongoDB
```typescript
bannerSchema.index({ displayFrom: 1, displayTo: 1, isActive: 1 });
bannerSchema.index({ targetRoleIds: 1 }, { sparse: true });
bannerSchema.index({ targetGroupIds: 1 }, { sparse: true });
```

### 2. Query Único (No N Queries)
```typescript
// ❌ MAL: N queries
for (const principal of principals) {
  await Banner.findOne({ targetRoleIds: principal.id });
}

// ✅ BIEN: 1 query con $or
await Banner.find({
  $or: [
    { audienceMode: 'global' },
    { audienceMode: 'role', targetRoleIds: { $in: roleIds }},
    { audienceMode: 'group', targetGroupIds: { $in: groupIds }},
  ]
});
```

### 3. Caché (Redis + React Query)
```typescript
// Backend: TTL 5 minutos
await redis.set(`banners:${userId}`, JSON.stringify(banners), 'EX', 300);

// Frontend: staleTime 5 minutos
useQuery([QueryKeys.banners], getBanners, { staleTime: 5 * 60 * 1000 });
```

---

## 🛡️ Seguridad

### 1. Sanitización HTML
```typescript
import DOMPurify from 'isomorphic-dompurify';

const cleanMessage = DOMPurify.sanitize(data.message, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
  ALLOWED_ATTR: ['href', 'target'],
});
```

### 2. Validación de Audiencia
```typescript
// Verificar que roles/grupos existen antes de crear banner
if (audienceMode === 'role') {
  await validateRolesExist(targetRoleIds);
}
if (audienceMode === 'group') {
  await validateGroupsExist(targetGroupIds);
}
```

### 3. Permisos Admin-Only
```typescript
router.use('/api/admin/banners', requireJwtAuth, requireRole(['ADMIN']));
```

---

## 📊 Flujo de Visualización

```
Usuario hace login
       ↓
1. getUserPrincipals() → [USER, ROLE, GROUPs, PUBLIC]
       ↓
2. Query MongoDB con $or
   - audienceMode = 'global'
   - audienceMode = 'role' AND targetRoleIds in userRoles
   - audienceMode = 'group' AND targetGroupIds in userGroups
   - isPublic = true
       ↓
3. Filtrar por fecha (displayFrom, displayTo)
       ↓
4. Filtrar por isActive = true
       ↓
5. Ordenar por priority DESC, order ASC
       ↓
6. Limit 10
       ↓
7. Return Array<Banner>
       ↓
8. Frontend renderiza <BannerCarousel />
```

---

## ✅ Checklist de Alto Nivel

### Fase 1: Backend
- [ ] Actualizar schema con campos opcionales
- [ ] Implementar `getActiveBanners()`
- [ ] Implementar métodos CRUD
- [ ] Crear rutas `/api/admin/banners`
- [ ] Tests unitarios + integración

### Fase 2: Frontend
- [ ] Componente `<BannerCarousel />`
- [ ] Hook `useGetActiveBannersQuery()`
- [ ] Panel admin `/admin/banners`
- [ ] Tests de componentes

### Fase 3: Migración y Tests
- [ ] Script `migrate-banners.js`
- [ ] Actualizar scripts NPM
- [ ] Tests E2E completos
- [ ] Documentación de usuario

---

## 🎓 Recursos Adicionales

### Guías del Proyecto
- [CONTRIBUTING.md](../.github/CONTRIBUTING.md)
- [AGENTS.md](../AGENTS.md)

### Sistema Existente
- Roles: `packages/data-schemas/src/methods/role.ts`
- Grupos: `packages/data-schemas/src/methods/userGroup.ts`
- Principals: `getUserPrincipals()` en `userGroup.ts`
- ACL: Sistema usado en Agents, Prompts, MCP Servers

### Referencias Externas
- [MongoDB Schema Design](https://www.mongodb.com/docs/manual/core/data-model-design/)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/best-practices)
- [DOMPurify](https://github.com/cure53/DOMPurify)

---

## 📞 Contacto y Soporte

**Discord:** [LibreChat Community](https://discord.librechat.ai)  
**GitHub Issues:** [danny-avila/LibreChat/issues](https://github.com/danny-avila/LibreChat/issues)  
**Discussions:** [Feature Requests & Suggestions](https://github.com/danny-avila/LibreChat/discussions/new?category=feature-requests-suggestions)

---

## 📝 Notas de Versión

**Versión del Plan:** 1.0  
**Fecha:** 15 de Abril, 2026  
**Autor:** Desarrollador Senior  
**Estado:** Fase 0 Completada ✅

**Próximo Paso:** Iniciar Fase 1 (Análisis y Documentación)

---

**¿Listo para empezar?** 🚀

Lee `MULTI_BANNER_SUMMARY.md` para una visión rápida o `MULTI_BANNER_PLAN.md` para el plan completo.
