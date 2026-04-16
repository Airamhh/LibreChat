# 🔍 Debug Multi-Banner System - Guía para el Usuario

## Problema: Solo veo 1 banner en lugar de múltiples

### Paso 1: Verificar localStorage (CRÍTICO)

Abre la **consola del navegador** (F12) y ejecuta:

```javascript
// Ver qué banners están dismissed
const hidden = JSON.parse(localStorage.getItem('hideBannerHint') || '[]');
console.log('🔒 Banners dismissed:', hidden.length);
console.log(hidden);

// LIMPIAR TODOS los banners dismissed
localStorage.removeItem('hideBannerHint');
console.log('✅ Cleared hideBannerHint');

// Recargar página
location.reload();
```

Si tenías banners dismissed, después de limpiar deberías ver **múltiples banners con navegación**.

---

### Paso 2: Verificar que el backend esté corriendo

```bash
# En terminal del servidor
ps aux | grep "node.*backend"

# Si no está corriendo, iniciarlo:
npm run backend:dev
```

---

### Paso 3: Verificar respuesta de la API

Desde la **consola del navegador** (F12), ejecuta:

```javascript
// Obtener banners desde la API
fetch('/api/banner/list')
  .then(r => r.json())
  .then(data => {
    console.log('📊 Total banners recibidos:', data.length);
    console.table(data.map(b => ({
      message: b.message.substring(0, 50),
      priority: b.priority,
      audience: b.audienceMode,
      persistable: b.persistable
    })));
  });
```

**Resultado esperado**: Deberías ver entre 9-12 banners (dependiendo de tu rol).

Si ves `0` banners:
- El backend no está corriendo
- No estás autenticado
- Los banners no están en la BD

---

### Paso 4: Verificar estado de React Query

Desde la **consola del navegador**, ejecuta:

```javascript
// Ver caché de React Query
const cache = window.__REACT_QUERY_DEVTOOLS__;
console.log('React Query cache:', cache);

// O inspeccionar directamente
console.log('Recoil state:', window.__RECOIL_DEVTOOLS_GLOBAL_HOOK__);
```

---

### Paso 5: Debugging avanzado

Ejecuta este script completo en la consola del navegador:

```javascript
(async function debugBanners() {
  console.log('🔍 === BANNER DEBUGGING ===\n');
  
  // 1. localStorage
  const hiddenBanners = JSON.parse(localStorage.getItem('hideBannerHint') || '[]');
  console.log('1️⃣ Dismissed banners in localStorage:', hiddenBanners.length);
  if (hiddenBanners.length > 0) {
    console.log('   ⚠️  You have dismissed banners! They will be hidden.');
    console.log('   Banner IDs:', hiddenBanners);
  }
  
  // 2. API call
  try {
    const response = await fetch('/api/banner/list');
    const banners = await response.json();
    console.log('\n2️⃣ Banners from API:', banners.length);
    
    if (banners.length === 0) {
      console.log('   ❌ No banners received from backend!');
      console.log('   Possible causes:');
      console.log('   - Backend not running');
      console.log('   - Not authenticated');
      console.log('   - No banners in database');
    } else {
      console.log('   ✅ Banners received from backend');
      console.table(banners.map(b => ({
        message: b.message.substring(0, 40) + '...',
        priority: b.priority || 50,
        audience: b.audienceMode || 'legacy',
        persistable: b.persistable || false,
        bannerId: b.bannerId
      })));
    }
    
    // 3. Filter simulation
    const visibleBanners = banners.filter(b => 
      !b.bannerId || b.persistable || !hiddenBanners.includes(b.bannerId)
    );
    
    console.log('\n3️⃣ Visible banners after filter:', visibleBanners.length);
    if (visibleBanners.length < banners.length) {
      const hiddenCount = banners.length - visibleBanners.length;
      console.log(`   ⚠️  ${hiddenCount} banners are hidden because you dismissed them`);
    }
    
    // 4. Navigation check
    const showNavigation = visibleBanners.length > 1;
    console.log('\n4️⃣ Should show navigation (arrows/dots)?', showNavigation);
    console.log('   Visible banners:', visibleBanners.length);
    
    if (!showNavigation && banners.length > 1) {
      console.log('   ❌ PROBLEM: You have multiple banners but they are dismissed!');
      console.log('   SOLUTION: Run localStorage.removeItem("hideBannerHint") and reload');
    }
    
    // 5. Summary
    console.log('\n📊 === SUMMARY ===');
    console.log(`Total banners in DB: ${banners.length}`);
    console.log(`Dismissed by you: ${hiddenBanners.length}`);
    console.log(`Currently visible: ${visibleBanners.length}`);
    console.log(`Navigation shown: ${showNavigation ? 'YES ✅' : 'NO ❌'}`);
    
    if (visibleBanners.length === 1 && banners.length > 1) {
      console.log('\n⚠️  === FIX REQUIRED ===');
      console.log('You only see 1 banner because the others are dismissed.');
      console.log('Run this to fix:');
      console.log('  localStorage.removeItem("hideBannerHint");');
      console.log('  location.reload();');
    }
    
  } catch (error) {
    console.error('❌ Error fetching banners:', error);
  }
})();
```

---

### Paso 6: Verificar en MongoDB (lado servidor)

```bash
# Contar banners de prueba activos
node config/debug-banners.js

# O ver estadísticas
npm run test-banners stats
```

---

## ✅ Solución Definitiva

Si después de todos los pasos anteriores solo ves 1 banner:

```javascript
// EN LA CONSOLA DEL NAVEGADOR (F12):

// 1. Limpiar dismissed banners
localStorage.removeItem('hideBannerHint');

// 2. Limpiar caché de React Query (opcional)
localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');

// 3. Recargar
location.reload();
```

---

## 🎯 Resultado Esperado

Después de limpiar localStorage deberías ver:

```
┌─────────────────────────────────────────┐
│ ◀  🚨 Banner de prueba...             ▶ │  ← Flechas navegación
│              ● ○ ● ● ● ● ●              │  ← Puntos (7 banners)
└─────────────────────────────────────────┘
```

- **Flechas** ◀ ▶ a los lados
- **Puntos** debajo del mensaje
- **Rotación automática** cada 8 segundos
- **Hover** pausa la rotación

---

## 📞 Contacto

Si aún tienes problemas después de seguir TODOS los pasos, comparte:

1. Salida del script de debugging (Paso 5)
2. `npm run test-banners stats`
3. Tu rol de usuario (ADMIN, USER, etc.)
4. Screenshot del navegador
