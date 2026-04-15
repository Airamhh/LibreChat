# Multi-Banner System - User Guide

## Overview

The Multi-Banner System allows administrators to create and manage multiple announcement banners with advanced targeting capabilities. Banners can be displayed to all users, or targeted to specific roles, groups, or individual users.

## Features

- **Multiple Concurrent Banners**: Display several banners simultaneously with automatic rotation
- **Audience Targeting**: Control who sees each banner (global, role-based, group-based, or user-specific)
- **Priority Management**: Set banner priority (0-100) to control display order
- **Scheduling**: Set start and end dates for banner display
- **Persistent Banners**: Mark banners as non-dismissible for critical announcements
- **Analytics**: Track view and dismiss counts for each banner

## Creating a Banner

### Via Admin Panel

1. Navigate to **Settings** > **Banners** (admin only)
2. Click **Create Banner**
3. Fill in the banner details:
   - **Message**: The banner content (HTML supported)
   - **Audience**: Choose who can see the banner
   - **Priority**: Higher priority banners display first (0-100, default: 50)
   - **Display Dates**: Optional start/end dates
   - **Active**: Toggle to enable/disable the banner
   - **Persistable**: If checked, users cannot dismiss the banner

4. Click **Save**

### Via npm Script

```bash
# Update a banner
npm run update-banner -- --id YOUR_BANNER_ID --message "New message" --priority 80

# Delete a banner
npm run delete-banner -- --id YOUR_BANNER_ID
```

## Audience Targeting

### Global
Displayed to all users (default behavior, backward compatible with old system)

### Role-Based
Target specific roles (e.g., ADMIN, MODERATOR)

Example: "System maintenance scheduled" → Show only to ADMIN role

### Group-Based
Target specific user groups

Example: "Team meeting reminder" → Show only to Engineering group

### User-Specific
Target individual users by user ID

Example: "Welcome message" → Show only to new user

## Priority System

Banners are displayed based on:
1. **Priority** (0-100, higher first)
2. **Order** (manual ordering, lower first)
3. **Display From** (newest first)

Example priority levels:
- **90-100**: Critical system alerts
- **70-89**: Important announcements
- **50-69**: Regular updates (default)
- **30-49**: Optional information
- **0-29**: Low priority notices

## Scheduling

Set `displayFrom` and `displayTo` dates to control when banners appear:

- **displayFrom**: Banner starts showing from this date
- **displayTo**: Banner stops showing after this date
- Both fields are optional

Example:
```
displayFrom: 2026-04-20 09:00
displayTo: 2026-04-27 17:00
```

## Best Practices

### Message Formatting
- Keep messages concise (1-2 lines)
- Use HTML for formatting: `<strong>`, `<a>`, `<em>`
- Include links with `<a href="...">text</a>`
- Test message appearance in both light/dark modes

### Priority Guidelines
- Reserve 90+ for true emergencies only
- Use 70-89 for important but non-urgent information
- Default to 50 for most announcements
- Use 30-49 for optional information

### Targeting
- Start with global banners and add targeting as needed
- Test targeted banners with affected users before making them active
- Document which roles/groups each banner targets

### Scheduling
- Set displayTo dates for time-sensitive announcements
- Remove old banners instead of just deactivating them
- Review active banners weekly

## Troubleshooting

### Banner not showing
1. Check if banner is **Active**
2. Verify date range (displayFrom/displayTo)
3. Confirm audience targeting is correct
4. Check priority (lower priority banners may be hidden)

### Banner showing to wrong users
1. Review **audienceMode** setting
2. Verify role/group/user IDs are correct
3. Check for conflicting global banners

### Too many banners
The system limits display to 10 banners at once. Adjust priorities or remove old banners.

## API Access

### Get Active Banners (Public)
```bash
# Get first active banner (legacy)
GET /api/banner

# Get all active banners for current user
GET /api/banner/list?limit=10
```

### Admin Endpoints (Requires ACCESS_ADMIN capability)
```bash
# List all banners
GET /api/admin/banners?page=1&limit=20

# Create banner
POST /api/admin/banners
{
  "message": "Maintenance scheduled",
  "audienceMode": "global",
  "priority": 80,
  "isActive": true
}

# Update banner
PUT /api/admin/banners/:bannerId
{
  "message": "Updated message",
  "priority": 90
}

# Delete banner
DELETE /api/admin/banners/:bannerId

# Toggle active status
PATCH /api/admin/banners/:bannerId/toggle
```

## Migration from Old System

Existing single banners are automatically converted to the new system:
- `audienceMode` defaults to `'global'`
- `priority` defaults to `50`
- `isActive` defaults to `true`
- All functionality remains backward compatible

No manual migration required.
