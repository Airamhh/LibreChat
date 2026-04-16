const path = require('path');
const mongoose = require('mongoose');
const { Banner, User, Group } = require('@librechat/data-schemas').createModels(mongoose);
require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const { silentExit } = require('./helpers');
const connect = require('./connect');

const TEST_PREFIX = '[TEST]';

/**
 * Create example banners of all types for testing
 */
async function createTestBanners() {
    console.purple('----------------------------------');
    console.purple('Creating test banners...');
    console.purple('----------------------------------');

    // Get some real IDs for targeting examples (if available)
    const sampleUser = await User.findOne().lean();
    const sampleGroup = await Group.findOne().lean();

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const timestamp = Date.now();

    const testBanners = [
        // 1. Banner Global Simple
        {
            bannerId: `test-banner-${timestamp}-1`,
            message: `${TEST_PREFIX} ¡Bienvenido a LibreChat! Este es un banner de prueba global. 🎉`,
            audienceMode: 'global',
            isPublic: true,
            priority: 50,
            isActive: true,
            persistable: false,
        },

        // 2. Banner Global con Fechas Programadas
        {
            bannerId: `test-banner-${timestamp}-2`,
            message: `${TEST_PREFIX} <strong>Mantenimiento Programado</strong>: Sistema no disponible mañana 02:00-04:00 AM`,
            audienceMode: 'global',
            isPublic: true,
            priority: 85,
            isActive: true,
            persistable: false,
            displayFrom: now,
            displayTo: nextWeek,
        },

        // 3. Banner por Rol (ADMIN)
        {
            bannerId: `test-banner-${timestamp}-3`,
            message: `${TEST_PREFIX} 🔧 <strong>Solo Admins</strong>: Nueva función de análisis disponible en configuración`,
            audienceMode: 'role',
            targetRoleIds: ['ADMIN'],
            priority: 70,
            isActive: true,
            persistable: false,
        },

        // 4. Banner por Rol (ADMIN + USER)
        {
            bannerId: `test-banner-${timestamp}-4`,
            message: `${TEST_PREFIX} 🎯 Recordatorio importante para administradores y usuarios regulares`,
            audienceMode: 'role',
            targetRoleIds: ['ADMIN', 'USER'],
            priority: 60,
            isActive: true,
            persistable: false,
        },

        // 5. Banner por Grupo (si existe)
        ...(sampleGroup
            ? [
                {
                    bannerId: `test-banner-${timestamp}-5`,
                    message: `${TEST_PREFIX} 📅 Reunión de equipo mañana a las 10:00 AM - <a href="https://meet.example.com" target="_blank">Unirse</a>`,
                    audienceMode: 'group',
                    targetGroupIds: [sampleGroup._id.toString()],
                    priority: 65,
                    isActive: true,
                    persistable: false,
                    displayFrom: now,
                    displayTo: tomorrow,
                },
            ]
            : []),

        // 6. Banner por Usuario Específico (si existe)
        ...(sampleUser
            ? [
                {
                    bannerId: `test-banner-${timestamp}-6`,
                    message: `${TEST_PREFIX} 👋 ¡Hola! Este es un mensaje personalizado. Completa tu <a href="/settings">perfil</a>`,
                    audienceMode: 'user',
                    targetUserIds: [sampleUser._id.toString()],
                    priority: 55,
                    isActive: true,
                    persistable: false,
                },
            ]
            : []),

        // 7. Banner Persistente (No Dismissible) - Alta Prioridad
        {
            bannerId: `test-banner-${timestamp}-7`,
            message: `${TEST_PREFIX} ⚠️ <strong>IMPORTANTE</strong>: Este banner no puede ser cerrado. Solo para pruebas críticas.`,
            audienceMode: 'global',
            isPublic: true,
            priority: 95,
            isActive: true,
            persistable: true,
            displayFrom: now,
        },

        // 8. Banner con HTML Rico
        {
            bannerId: `test-banner-${timestamp}-8`,
            message: `${TEST_PREFIX} <div><p><strong>🎉 ¡Nuevas Funciones de Prueba!</strong></p><ul><li>✨ Feature A</li><li>🚀 Feature B</li><li>🎨 Feature C</li></ul><p>Ver <a href="/changelog">changelog</a></p></div>`,
            audienceMode: 'global',
            isPublic: true,
            priority: 65,
            isActive: true,
            persistable: false,
        },

        // 9. Banner con Baja Prioridad (Tip)
        {
            bannerId: `test-banner-${timestamp}-9`,
            message: `${TEST_PREFIX} 💡 <em>Tip del día</em>: Usa atajos de teclado para navegar más rápido. <a href="/help">Ver lista</a>`,
            audienceMode: 'global',
            isPublic: true,
            priority: 25,
            isActive: true,
            persistable: false,
        },

        // 10. Banner Inactivo (para testing de toggle)
        {
            bannerId: `test-banner-${timestamp}-10`,
            message: `${TEST_PREFIX} ⏸️ Este banner está inactivo y no debería mostrarse`,
            audienceMode: 'global',
            isPublic: true,
            priority: 50,
            isActive: false,
            persistable: false,
        },

        // 11. Banner Programado Futuro (aún no visible)
        {
            bannerId: `test-banner-${timestamp}-11`,
            message: `${TEST_PREFIX} 🔮 Este banner solo será visible mañana`,
            audienceMode: 'global',
            isPublic: true,
            priority: 60,
            isActive: true,
            persistable: false,
            displayFrom: tomorrow,
            displayTo: nextWeek,
        },

        // 12. Banner Expirado (ya pasó)
        {
            bannerId: `test-banner-${timestamp}-12`,
            message: `${TEST_PREFIX} ⏰ Este banner ya expiró y no debería mostrarse`,
            audienceMode: 'global',
            isPublic: true,
            priority: 50,
            isActive: true,
            persistable: false,
            displayFrom: yesterday,
            displayTo: yesterday,
        },

        // 13. Banner de Emergencia (Máxima Prioridad)
        {
            bannerId: `test-banner-${timestamp}-13`,
            message: `${TEST_PREFIX} 🚨 <strong>ALERTA DE PRUEBA</strong>: Banner con máxima prioridad`,
            audienceMode: 'global',
            isPublic: true,
            priority: 100,
            isActive: true,
            persistable: true,
        },

        // 14. Banner Multi-Rol con Fechas
        {
            bannerId: `test-banner-${timestamp}-14`,
            message: `${TEST_PREFIX} ⏰ <strong>Para Admins y Moderadores</strong>: Acción requerida antes de fin de semana`,
            audienceMode: 'role',
            targetRoleIds: ['ADMIN', 'MODERATOR'],
            priority: 80,
            isActive: true,
            persistable: true,
            displayFrom: now,
            displayTo: nextWeek,
        },

        // 15. Banner Informativo Sin Fechas
        {
            bannerId: `test-banner-${timestamp}-15`,
            message: `${TEST_PREFIX} ℹ️ Información general: Este banner permanece indefinidamente hasta ser desactivado`,
            audienceMode: 'global',
            isPublic: true,
            priority: 45,
            isActive: true,
            persistable: false,
        },
    ];

    let created = 0;
    let failed = 0;

    for (const bannerData of testBanners) {
        try {
            const banner = await Banner.create(bannerData);
            console.green(`✓ Created: ${banner.message.substring(0, 60)}...`);
            created++;
        } catch (error) {
            console.red(`✗ Failed: ${bannerData.message.substring(0, 60)}...`);
            console.red(`  Error: ${error.message}`);
            failed++;
        }
    }

    console.purple('----------------------------------');
    console.green(`✓ Successfully created: ${created} banners`);
    if (failed > 0) {
        console.orange(`⚠ Failed to create: ${failed} banners`);
    }
    if (!sampleUser) {
        console.orange('⚠ No users found - user-specific banner not created');
    }
    if (!sampleGroup) {
        console.orange('⚠ No groups found - group-specific banner not created');
    }
    console.purple('----------------------------------');

    // Show summary of created banners
    const allTestBanners = await Banner.find({
        message: { $regex: `^\\${TEST_PREFIX}` },
    }).lean();

    console.purple('\nCreated test banners summary:');
    console.purple('----------------------------------');
    allTestBanners.forEach((banner, index) => {
        const status = banner.isActive ? '🟢 Active' : '🔴 Inactive';
        const persistent = banner.persistable ? '📌 Persistent' : '❌ Dismissible';
        const audience = banner.audienceMode.toUpperCase();
        const priority = `P${banner.priority}`;
        console.log(
            `${index + 1}. ${status} | ${persistent} | ${audience} | ${priority} | ${banner.message.substring(TEST_PREFIX.length, 50).trim()}...`,
        );
    });
    console.purple('----------------------------------');
}

/**
 * Delete all test banners
 */
async function deleteTestBanners() {
    console.purple('----------------------------------');
    console.purple('Deleting test banners...');
    console.purple('----------------------------------');

    const testBanners = await Banner.find({
        message: { $regex: `^\\${TEST_PREFIX}` },
    }).lean();

    if (testBanners.length === 0) {
        console.orange('No test banners found to delete.');
        console.purple('----------------------------------');
        return;
    }

    console.orange(`Found ${testBanners.length} test banners to delete:`);
    testBanners.forEach((banner, index) => {
        console.log(`${index + 1}. ${banner.message.substring(0, 60)}...`);
    });
    console.purple('----------------------------------');

    const result = await Banner.deleteMany({
        message: { $regex: `^\\${TEST_PREFIX}` },
    });

    console.green(`✓ Successfully deleted: ${result.deletedCount} test banners`);
    console.purple('----------------------------------');
}

/**
 * Show statistics of test banners
 */
async function showStats() {
    console.purple('----------------------------------');
    console.purple('Test Banners Statistics');
    console.purple('----------------------------------');

    const testBanners = await Banner.find({
        message: { $regex: `^\\${TEST_PREFIX}` },
    }).lean();

    if (testBanners.length === 0) {
        console.orange('No test banners found.');
        console.purple('----------------------------------');
        return;
    }

    const stats = {
        total: testBanners.length,
        active: testBanners.filter((b) => b.isActive).length,
        inactive: testBanners.filter((b) => !b.isActive).length,
        persistent: testBanners.filter((b) => b.persistable).length,
        dismissible: testBanners.filter((b) => !b.persistable).length,
        byAudience: {
            global: testBanners.filter((b) => b.audienceMode === 'global').length,
            role: testBanners.filter((b) => b.audienceMode === 'role').length,
            group: testBanners.filter((b) => b.audienceMode === 'group').length,
            user: testBanners.filter((b) => b.audienceMode === 'user').length,
        },
        withDates: testBanners.filter((b) => b.displayFrom || b.displayTo).length,
    };

    console.log(`Total test banners: ${stats.total}`);
    console.log(`  Active: ${stats.active}`);
    console.log(`  Inactive: ${stats.inactive}`);
    console.log(`  Persistent: ${stats.persistent}`);
    console.log(`  Dismissible: ${stats.dismissible}`);
    console.log(`  With scheduled dates: ${stats.withDates}`);
    console.purple('----------------------------------');
    console.log('By audience type:');
    console.log(`  Global: ${stats.byAudience.global}`);
    console.log(`  Role: ${stats.byAudience.role}`);
    console.log(`  Group: ${stats.byAudience.group}`);
    console.log(`  User: ${stats.byAudience.user}`);
    console.purple('----------------------------------');

    // Priority distribution
    const priorityGroups = {
        critical: testBanners.filter((b) => b.priority >= 90).length,
        high: testBanners.filter((b) => b.priority >= 70 && b.priority < 90).length,
        normal: testBanners.filter((b) => b.priority >= 50 && b.priority < 70).length,
        low: testBanners.filter((b) => b.priority < 50).length,
    };

    console.log('By priority:');
    console.log(`  Critical (90-100): ${priorityGroups.critical}`);
    console.log(`  High (70-89): ${priorityGroups.high}`);
    console.log(`  Normal (50-69): ${priorityGroups.normal}`);
    console.log(`  Low (0-49): ${priorityGroups.low}`);
    console.purple('----------------------------------');
}

/**
 * Main execution
 */
(async () => {
    await connect();

    const action = process.argv[2];

    if (!action || !['create', 'delete', 'clean', 'stats', 'status'].includes(action)) {
        console.purple('----------------------------------');
        console.purple('LibreChat Test Banners Manager');
        console.purple('----------------------------------');
        console.orange('Usage: npm run test-banners <action>');
        console.orange('');
        console.orange('Actions:');
        console.orange('  create  - Create test banners of all types');
        console.orange('  delete  - Delete all test banners');
        console.orange('  clean   - Alias for delete');
        console.orange('  stats   - Show test banners statistics');
        console.orange('  status  - Alias for stats');
        console.orange('');
        console.orange('Examples:');
        console.orange('  npm run test-banners create');
        console.orange('  npm run test-banners delete');
        console.orange('  npm run test-banners stats');
        console.purple('----------------------------------');
        console.yellow('⚠️  IMPORTANT: Browser LocalStorage');
        console.yellow('');
        console.yellow('If you dismissed banners before, they are cached');
        console.yellow('in your browser localStorage. To see all banners:');
        console.yellow('');
        console.yellow('1. Open browser console (F12)');
        console.yellow('2. Run: localStorage.removeItem("hideBannerHint")');
        console.yellow('3. Reload page (Ctrl+R or Cmd+R)');
        console.yellow('');
        console.yellow('Or clear all site data in browser settings.');
        console.purple('----------------------------------');
        silentExit(0);
    }

    try {
        switch (action) {
            case 'create':
                await createTestBanners();
                break;
            case 'delete':
            case 'clean':
                await deleteTestBanners();
                break;
            case 'stats':
            case 'status':
                await showStats();
                break;
        }

        console.green('\n✓ Operation completed successfully!');
        silentExit(0);
    } catch (error) {
        console.red('\n✗ Error:', error.message);
        console.error(error);
        silentExit(1);
    }
})();
