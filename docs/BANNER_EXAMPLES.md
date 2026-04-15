# Ejemplos Prácticos - Sistema Multi-Banner

Guía completa con ejemplos reales para crear banners de todos los tipos en LibreChat.

---

## 📋 Tabla de Contenidos

1. [Carrusel Multi-Banner - Cómo Funciona](#0-carrusel-multi-banner---cómo-funciona) ⭐
2. [Banner Global Simple](#1-banner-global-simple)
3. [Banner con Fechas Programadas](#2-banner-con-fechas-programadas)
4. [Banner por Rol](#3-banner-por-rol)
5. [Banner por Grupo](#4-banner-por-grupo)
6. [Banner para Usuarios Específicos](#5-banner-para-usuarios-específicos)
7. [Banner Persistente (No Dismissible)](#6-banner-persistente-no-dismissible)
8. [Banner con Prioridad Alta](#7-banner-con-prioridad-alta)
9. [Banner con HTML Formateado](#8-banner-con-html-formateado)
10. [Combinaciones Avanzadas](#9-combinaciones-avanzadas)
11. [Usando la API Directamente](#10-usando-la-api-directamente)
12. [Testing con Script Automático](#11-testing-con-script-automático) 🚀

---

## 0. Carrusel Multi-Banner - Cómo Funciona

### 🎠 Funcionamiento del Carrusel

Cuando hay **múltiples banners activos**, LibreChat muestra un **carrusel automático** con las siguientes características:

#### Características Principales

✅ **Rotación Automática**
- Los banners cambian automáticamente cada **8 segundos**
- La rotación se pausa al pasar el mouse sobre el banner
- Se reanuda al quitar el mouse

✅ **Navegación Manual**
- **Flechas izquierda/derecha** (◀ ▶) para navegar manualmente
- **Puntos de paginación** (● ● ●) debajo del mensaje
- Click en cualquier punto para ir directamente a ese banner

✅ **Banners Persistentes**
- Los banners con `persistable: true` **NO bloquean** la navegación
- **Sí puedes navegar** entre banners aunque uno sea persistente
- El botón de cerrar (✕) solo desaparece en banners persistentes
- Las flechas y puntos **siempre funcionan** si hay múltiples banners

#### Visualización

```
Si hay 1 banner:
┌────────────────────────────────────────────────┐
│  📢 Mensaje del banner...                   ✕ │
└────────────────────────────────────────────────┘
(Sin flechas, sin puntos)

Si hay múltiples banners:
┌────────────────────────────────────────────────┐
│ ◀  📢 Mensaje del banner...                 ✕ ▶│
│              ● ● ○ ● ●                         │
└────────────────────────────────────────────────┘
(Con flechas, puntos de navegación)

Banner persistente con otros banners:
┌────────────────────────────────────────────────┐
│ ◀  ⚠️ Mensaje importante...                   ▶│
│              ○ ● ● ●                           │
└────────────────────────────────────────────────┘
(Con flechas, sin botón ✕)
```

#### Límites y Ordenamiento

- **Máximo 10 banners** simultáneos (configurable en backend)
- Ordenamiento automático por:
  1. **Prioridad** (descendente 100→0)
  2. **Order** (ascendente 0→∞)
  3. **Fecha** (más reciente primero)

#### Filtrado de Audience

Solo se muestran banners que cumplan **al menos una** de estas condiciones:
- `audienceMode: 'global'` → Todos los usuarios
- `audienceMode: 'role'` → Solo usuarios con ese rol
- `audienceMode: 'group'` → Solo miembros del grupo
- `audienceMode: 'user'` → Solo ese usuario específico
- `isPublic: true` → Visible para no autenticados

---

## 1. Banner Global Simple

**Caso de uso**: Mensaje de bienvenida visible para todos los usuarios.

### Via Admin Panel (UI)

1. Navega a **Settings** → **Banners**
2. Click en **Create Banner**
3. Completa el formulario:

```yaml
Message: ¡Bienvenido a LibreChat! 🎉
Audience: Global (All Users)
Priority: 50
Active: ✓ Checked
Persistable: ☐ Unchecked
Display From: (vacío)
Display Until: (vacío)
```

4. Click **Save**

### Via API

```bash
curl -X POST http://localhost:3080/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "¡Bienvenido a LibreChat! 🎉",
    "audienceMode": "global",
    "priority": 50,
    "isActive": true,
    "persistable": false
  }'
```

### Resultado
✅ Visible para **todos los usuarios** (autenticados y no autenticados)  
✅ Los usuarios pueden descartar el banner  
✅ Prioridad normal (50)

---

## 2. Banner con Fechas Programadas

**Caso de uso**: Anuncio de mantenimiento programado para un día específico.

### Via Admin Panel

```yaml
Message: <strong>Mantenimiento programado</strong>: El sistema no estará disponible el 20/04/2026 de 02:00 a 04:00 AM
Audience: Global (All Users)
Priority: 80
Active: ✓ Checked
Persistable: ☐ Unchecked
Display From: 2026-04-15T00:00
Display Until: 2026-04-20T23:59
```

### Via API

```bash
curl -X POST http://localhost:3080/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "<strong>Mantenimiento programado</strong>: El sistema no estará disponible el 20/04/2026 de 02:00 a 04:00 AM",
    "audienceMode": "global",
    "priority": 80,
    "isActive": true,
    "persistable": false,
    "displayFrom": "2026-04-15T00:00:00Z",
    "displayTo": "2026-04-20T23:59:59Z"
  }'
```

### Resultado
✅ Visible solo entre 15/04 y 20/04  
✅ Prioridad alta (80) - aparece antes que otros banners  
✅ Se oculta automáticamente después del 20/04

---

## 3. Banner por Rol

**Caso de uso**: Mensaje exclusivo para administradores sobre nuevas funciones.

### Via Admin Panel

```yaml
Message: 🔧 <strong>Nuevo para Admins</strong>: Panel de análisis disponible en <a href="/admin/analytics">Configuración</a>
Audience: Specific Roles
Role Names: ADMIN, MODERATOR
Priority: 70
Active: ✓ Checked
Persistable: ☐ Unchecked
```

### Via API

```bash
curl -X POST http://localhost:3080/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "🔧 <strong>Nuevo para Admins</strong>: Panel de análisis disponible en <a href=\"/admin/analytics\">Configuración</a>",
    "audienceMode": "role",
    "targetRoleIds": ["ADMIN", "MODERATOR"],
    "priority": 70,
    "isActive": true,
    "persistable": false
  }'
```

### Resultado
✅ Solo visible para usuarios con rol **ADMIN** o **MODERATOR**  
✅ Usuarios normales no lo ven  
✅ Links funcionan en el mensaje

---

## 4. Banner por Grupo

**Caso de uso**: Recordatorio de reunión para un equipo específico.

### Via Admin Panel

```yaml
Message: 📅 Reunión del equipo de Ingeniería mañana a las 10:00 AM - <a href="https://meet.example.com/eng" target="_blank">Unirse</a>
Audience: Specific Groups
Group IDs: 507f1f77bcf86cd799439011, 507f1f77bcf86cd799439012
Priority: 60
Active: ✓ Checked
Persistable: ☐ Unchecked
Display From: 2026-04-15T00:00
Display Until: 2026-04-16T23:59
```

### Via API

```bash
curl -X POST http://localhost:3080/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "📅 Reunión del equipo de Ingeniería mañana a las 10:00 AM - <a href=\"https://meet.example.com/eng\" target=\"_blank\">Unirse</a>",
    "audienceMode": "group",
    "targetGroupIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
    "priority": 60,
    "isActive": true,
    "persistable": false,
    "displayFrom": "2026-04-15T00:00:00Z",
    "displayTo": "2026-04-16T23:59:59Z"
  }'
```

### Cómo obtener Group IDs

```bash
# Listar todos los grupos
curl http://localhost:3080/api/admin/groups \
  -H "Authorization: Bearer YOUR_TOKEN"

# O buscar por nombre
mongo librechat --eval 'db.groups.find({name: /Engineering/i}, {_id: 1, name: 1})'
```

### Resultado
✅ Solo miembros de los grupos especificados lo ven  
✅ Se muestra solo durante el rango de fechas  
✅ Link externo se abre en nueva pestaña

---

## 5. Banner para Usuarios Específicos

**Caso de uso**: Mensaje de bienvenida personalizado para nuevos usuarios.

### Via Admin Panel

```yaml
Message: 👋 ¡Hola! Completa tu <a href="/settings">perfil</a> para personalizar tu experiencia
Audience: Specific Users
User IDs: 507f1f77bcf86cd799439099, 507f1f77bcf86cd799439100
Priority: 55
Active: ✓ Checked
Persistable: ☐ Unchecked
```

### Via API

```bash
curl -X POST http://localhost:3080/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "👋 ¡Hola! Completa tu <a href=\"/settings\">perfil</a> para personalizar tu experiencia",
    "audienceMode": "user",
    "targetUserIds": ["507f1f77bcf86cd799439099", "507f1f77bcf86cd799439100"],
    "priority": 55,
    "isActive": true,
    "persistable": false
  }'
```

### Cómo obtener User IDs

```bash
# Buscar usuario por email
mongo librechat --eval 'db.users.findOne({email: "user@example.com"}, {_id: 1, email: 1, username: 1})'

# O via API
curl http://localhost:3080/api/admin/users?email=user@example.com \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Resultado
✅ Solo los usuarios especificados ven el banner  
✅ Útil para onboarding o mensajes personalizados  
✅ No afecta a otros usuarios

---

## 6. Banner Persistente (No Dismissible)

**Caso de uso**: Aviso crítico de seguridad que todos deben leer.

### Via Admin Panel

```yaml
Message: ⚠️ <strong>IMPORTANTE</strong>: Nueva política de seguridad en vigor. Lea los <a href="/terms">términos actualizados</a>
Audience: Global (All Users)
Priority: 95
Active: ✓ Checked
Persistable: ✓ Checked  ← IMPORTANTE
Display From: 2026-04-15T00:00
```

### Via API

```bash
curl -X POST http://localhost:3080/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "⚠️ <strong>IMPORTANTE</strong>: Nueva política de seguridad en vigor. Lea los <a href=\"/terms\">términos actualizados</a>",
    "audienceMode": "global",
    "priority": 95,
    "isActive": true,
    "persistable": true,
    "displayFrom": "2026-04-15T00:00:00Z"
  }'
```

### Resultado
✅ **No puede ser descartado** por los usuarios  
✅ Permanece visible hasta que el admin lo desactive  
✅ Prioridad muy alta (95)  
✅ Sin botón de cerrar (X)

---

## 7. Banner con Prioridad Alta

**Caso de uso**: Alerta de emergencia que debe aparecer primero.

### Niveles de Prioridad Recomendados

```yaml
0-29:   Información opcional
30-49:  Avisos no críticos
50-69:  Anuncios normales (DEFAULT: 50)
70-89:  Información importante
90-100: CRÍTICO/EMERGENCIA
```

### Ejemplo: Alerta de Emergencia

```yaml
Message: 🚨 <strong>ALERTA</strong>: Detectada actividad sospechosa. Cambie su contraseña inmediatamente
Audience: Global (All Users)
Priority: 100  ← MÁXIMA PRIORIDAD
Active: ✓ Checked
Persistable: ✓ Checked
```

### Via API

```bash
curl -X POST http://localhost:3080/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "🚨 <strong>ALERTA</strong>: Detectada actividad sospechosa. Cambie su contraseña inmediatamente",
    "audienceMode": "global",
    "priority": 100,
    "isActive": true,
    "persistable": true
  }'
```

### Resultado
✅ Aparece **primero** antes que cualquier otro banner  
✅ Prioridad máxima garantiza visibilidad  
✅ Combinado con `persistable` para máximo impacto

---

## 8. Banner con HTML Formateado

**Caso de uso**: Anuncio visualmente atractivo con formato rico.

### HTML Permitido

```html
Etiquetas: <p>, <br>, <strong>, <em>, <a>, <span>, <div>, <ul>, <ol>, <li>
Atributos: href, target, class
```

### Ejemplo: Banner Enriquecido

```yaml
Message: |
  <div>
    <p><strong>🎉 ¡Nuevas Funciones!</strong></p>
    <ul>
      <li>✨ Editor de código mejorado</li>
      <li>🚀 Respuestas 2x más rápidas</li>
      <li>🎨 Nuevos temas de color</li>
    </ul>
    <p>Ver <a href="/changelog">changelog completo</a></p>
  </div>
Audience: Global (All Users)
Priority: 65
Active: ✓ Checked
```

### Via API

```bash
curl -X POST http://localhost:3080/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "<div><p><strong>🎉 ¡Nuevas Funciones!</strong></p><ul><li>✨ Editor de código mejorado</li><li>🚀 Respuestas 2x más rápidas</li><li>🎨 Nuevos temas de color</li></ul><p>Ver <a href=\"/changelog\">changelog completo</a></p></div>",
    "audienceMode": "global",
    "priority": 65,
    "isActive": true,
    "persistable": false
  }'
```

### Resultado
✅ Formato de lista con viñetas  
✅ Negritas y enlaces funcionales  
✅ Estructura visual clara

---

## 9. Combinaciones Avanzadas

### 9.1 Banner Multi-Rol con Fecha Límite

**Caso de uso**: Recordatorio de actualización para admins y moderadores.

```bash
curl -X POST http://localhost:3080/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "⏰ <strong>Acción Requerida</strong>: Actualizar permisos antes del 30/04",
    "audienceMode": "role",
    "targetRoleIds": ["ADMIN", "MODERATOR"],
    "priority": 85,
    "isActive": true,
    "persistable": true,
    "displayFrom": "2026-04-15T00:00:00Z",
    "displayTo": "2026-04-30T23:59:59Z"
  }'
```

**Características**:
- Solo roles ADMIN y MODERATOR
- No dismissible (persistable)
- Auto-desaparece después del 30/04
- Prioridad alta

---

### 9.2 Banner Informativo con Baja Prioridad

**Caso de uso**: Tip opcional que no debe interrumpir.

```bash
curl -X POST http://localhost:3080/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "💡 <em>Tip</em>: Usa atajos de teclado para navegar más rápido. <a href=\"/help/shortcuts\">Ver lista</a>",
    "audienceMode": "global",
    "priority": 25,
    "isActive": true,
    "persistable": false
  }'
```

**Características**:
- Prioridad baja (25) - aparece último
- Dismissible
- Formato cursiva para suavizar el mensaje

---

### 9.3 Banner de Bienvenida por Grupo con Onboarding

**Caso de uso**: Mensaje de bienvenida para nuevos empleados de un departamento.

```bash
curl -X POST http://localhost:3080/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "<div><p><strong>¡Bienvenido al equipo de Marketing! 👋</strong></p><p>Recursos útiles:</p><ul><li><a href=\"/docs/marketing-guide\">Guía de Marketing</a></li><li><a href=\"/tools/brand-kit\">Brand Kit</a></li><li><a href=\"/contact/marketing-lead\">Contactar líder</a></li></ul></div>",
    "audienceMode": "group",
    "targetGroupIds": ["507f1f77bcf86cd799439011"],
    "priority": 60,
    "isActive": true,
    "persistable": false,
    "displayFrom": "2026-04-15T00:00:00Z",
    "displayTo": "2026-05-15T23:59:59Z"
  }'
```

**Características**:
- Solo miembros del grupo Marketing
- Lista de recursos útiles
- Se muestra durante 1 mes
- Dismissible después de leer

---

## 10. Usando la API Directamente

### 10.1 Crear Banner (POST)

```bash
curl -X POST http://localhost:3080/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "Tu mensaje aquí",
    "audienceMode": "global",
    "priority": 50,
    "isActive": true
  }'
```

### 10.2 Listar Banners (GET)

```bash
# Listar todos
curl http://localhost:3080/api/admin/banners \
  -H "Authorization: Bearer YOUR_TOKEN"

# Con filtros
curl "http://localhost:3080/api/admin/banners?page=1&limit=10&isActive=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 10.3 Actualizar Banner (PUT)

```bash
curl -X PUT http://localhost:3080/api/admin/banners/BANNER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "Mensaje actualizado",
    "priority": 75
  }'
```

### 10.4 Toggle Active/Inactive (PATCH)

```bash
curl -X PATCH http://localhost:3080/api/admin/banners/BANNER_ID/toggle \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 10.5 Eliminar Banner (DELETE)

```bash
curl -X DELETE http://localhost:3080/api/admin/banners/BANNER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Tabla Comparativa de Tipos

| Tipo | Audiencia | Uso Principal | Ejemplo |
|------|-----------|---------------|---------|
| **Global** | Todos | Anuncios generales | Bienvenida, mantenimiento |
| **Role** | Por rol | Funciones específicas | Admin-only features |
| **Group** | Por grupo | Comunicación de equipo | Reuniones, proyectos |
| **User** | Usuarios específicos | Personalizado | Onboarding, recordatorios |

---

## ⚡ Tips y Mejores Prácticas

### ✅ DO (Hacer)

1. **Usar prioridades apropiadas**
   - 90-100: Solo emergencias reales
   - 70-89: Información importante
   - 50-69: Anuncios normales
   - 30-49: Información opcional

2. **Programar fechas**
   - Eventos específicos siempre con `displayTo`
   - Mantenimientos programados con rango de fechas

3. **Usar HTML con moderación**
   - Mantener mensajes concisos
   - No más de 2-3 líneas visibles

4. **Testear antes de publicar**
   - Crear con `isActive: false`
   - Verificar formato y enlaces
   - Activar con PATCH toggle

### ❌ DON'T (Evitar)

1. **No abusar de prioridad alta**
   - Reservar 90+ para emergencias
   - Si todo es prioritario, nada lo es

2. **No dejar banners obsoletos**
   - Limpiar regularmente
   - Usar `displayTo` para auto-expiración

3. **No crear demasiados banners**
   - Límite recomendado: 3-5 activos simultáneos
   - Más banners = menor impacto

4. **No usar persistable sin razón**
   - Solo para críticos
   - Puede frustrar a usuarios

---

## 🎯 Casos de Uso Comunes

### 1. Mantenimiento Programado

```javascript
{
  "message": "🔧 Mantenimiento: 20/04 02:00-04:00 AM",
  "audienceMode": "global",
  "priority": 85,
  "persistable": true,
  "displayFrom": "2026-04-18T00:00:00Z",
  "displayTo": "2026-04-21T00:00:00Z"
}
```

### 2. Nueva Feature para Beta Testers

```javascript
{
  "message": "🎉 Prueba la nueva función X",
  "audienceMode": "group",
  "targetGroupIds": ["BETA_TESTERS_GROUP_ID"],
  "priority": 65
}
```

### 3. Recordatorio de Seguridad

```javascript
{
  "message": "🔒 Actualiza tu contraseña cada 90 días",
  "audienceMode": "global",
  "priority": 60,
  "displayFrom": "2026-04-01T00:00:00Z",
  "displayTo": "2026-04-07T23:59:59Z"
}
```

### 4. Onboarding Nuevos Usuarios

```javascript
{
  "message": "👋 ¡Bienvenido! Completa tu perfil",
  "audienceMode": "user",
  "targetUserIds": ["NEW_USER_ID"],
  "priority": 55
}
```

---

## 🔍 Troubleshooting

### Banner no se muestra

1. ✅ Verificar `isActive = true`
2. ✅ Verificar fechas (displayFrom <= hoy <= displayTo)
3. ✅ Verificar audiencia correcta
4. ✅ Verificar que no fue dismissed (si no es persistable)

### Banner se muestra a usuarios incorrectos

1. ✅ Revisar `audienceMode`
2. ✅ Verificar IDs correctos (roles/groups/users)
3. ✅ Comprobar que usuarios tienen los roles/grupos asignados

### Banner no desaparece

1. ✅ Verificar `displayTo` está configurado
2. ✅ Verificar `isActive = true` (desactivar para ocultar)
3. ✅ Usar DELETE para eliminar permanentemente

---

## 11. Testing con Script Automático

LibreChat incluye un script para crear, probar y limpiar banners de ejemplo automáticamente.

### Comandos Disponibles

```bash
# Crear 15 banners de ejemplo de todos los tipos
npm run test-banners create

# Ver estadísticas de banners de prueba
npm run test-banners stats

# Eliminar todos los banners de prueba
npm run test-banners delete
# O el alias:
npm run test-banners clean
```

### Banners Creados Automáticamente

El script crea **15 banners de prueba** con el prefijo `[TEST]`:

1. **Global simple** - Bienvenida básica
2. **Global con fechas** - Mantenimiento programado
3. **Por rol ADMIN** - Solo administradores
4. **Multi-rol ADMIN+USER** - Varios roles
5. **Por grupo** - Equipo específico (si existe)
6. **Por usuario** - Personalizado (si existe)
7. **Persistente** - No dismissible, prioridad alta
8. **HTML rico** - Con formato y listas
9. **Baja prioridad** - Tip del día
10. **Inactivo** - Para probar toggle
11. **Futuro** - Programado para mañana
12. **Expirado** - Ya pasó la fecha
13. **Emergencia** - Prioridad máxima (100)
14. **Multi-rol con fechas** - Admins+Moderators
15. **Informativo** - Sin fecha de expiración

### Ejemplo de Uso

```bash
# 1. Crear banners de prueba
npm run test-banners create

# Output:
# ✓ Successfully created: 15 banners
# 
# Created test banners summary:
# 1. 🟢 Active | ❌ Dismissible | GLOBAL | P50 | ¡Bienvenido...
# 2. 🟢 Active | ❌ Dismissible | GLOBAL | P85 | Mantenimiento...
# 3. 🟢 Active | ❌ Dismissible | ROLE | P70 | Solo Admins...
# ...

# 2. Ver estadísticas
npm run test-banners stats

# Output:
# Total test banners: 15
#   Active: 14
#   Inactive: 1
#   Persistent: 3
#   Dismissible: 12
# By audience type:
#   Global: 10
#   Role: 3
#   Group: 1
#   User: 1

# 3. Probar en el frontend
# Abre http://localhost:3080 y verás el carrusel con flechas

# 4. Limpiar después de probar
npm run test-banners delete

# Output:
# ✓ Successfully deleted: 15 test banners
```

### Características del Script

✅ **IDs únicos**: Cada ejecución genera bannerIds con timestamp  
✅ **Seguro**: Solo elimina banners con prefijo `[TEST]`  
✅ **Flexible**: Adapta banners según usuarios/grupos disponibles  
✅ **Informativo**: Muestra resumen visual con emojis  
✅ **Estadísticas**: Distribución por audience, prioridad, estado

### Testing Workflow Recomendado

```bash
# 1. Crear banners de prueba
npm run test-banners create

# 2. Verificar en la UI que aparecen:
#    - Carrusel con flechas (◀ ▶)
#    - Puntos de navegación (● ● ●)
#    - Rotación automática cada 8 segundos
#    - Banners persistentes sin botón ✕

# 3. Probar funcionalidades:
#    - Login como ADMIN → deberías ver banners de rol
#    - Navegar con flechas y puntos
#    - Dismiss banners normales (desaparecen)
#    - Intentar dismiss persistentes (no se puede)
#    - Pasar mouse → pausa rotación

# 4. Ver logs del backend:
cat api/logs/combined.log | grep "getActiveBanners"
# Debería mostrar: "Found N banners for user X"

# 5. Limpiar
npm run test-banners delete
```

### Troubleshooting con el Script

**Problema**: "No test banners found"
```bash
# Verificar en MongoDB
mongo librechat --eval 'db.banners.find({message: /^\[TEST\]/}).count()'
```

**Problema**: Solo veo 1 banner de 15
```bash
# 1. Verificar que el backend devuelve múltiples
curl http://localhost:3080/api/banner/list \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Ver estadísticas
npm run test-banners stats

# 3. Verificar logs
tail -f api/logs/combined.log | grep banner
```

**Problema**: Banners no visibles por audienceMode
```bash
# Ver tu rol de usuario
mongo librechat --eval 'db.users.findOne({email: "tu@email.com"}, {role: 1})'

# Los banners con targetRoleIds debe incluir tu rol
```

---

## 📚 Recursos Adicionales

- [USER_GUIDE_BANNERS.md](USER_GUIDE_BANNERS.md) - Guía completa de usuario
- [MULTI_BANNER_PLAN.md](MULTI_BANNER_PLAN.md) - Plan técnico detallado
- [MULTI_BANNER_IMPLEMENTATION.md](MULTI_BANNER_IMPLEMENTATION.md) - Documentación de implementación

---

**¿Necesitas más ayuda?** Consulta la [documentación completa](README_MULTI_BANNER.md) o contacta al equipo de desarrollo.
