# IndParkDocs API Reference

Base URL: `/api`

All endpoints (except `/auth/login`, `/auth/refresh`, `/health`) require `Authorization: Bearer <token>`.

---

## Auth — `/api/auth`

### POST `/auth/login`
Login and receive tokens.
- **Body:** `{ username: string, password: string }`
- **Response 200:** `{ accessToken, refreshToken, user: { id, username, role, display_name } }`
- **Response 401:** Invalid credentials

### POST `/auth/refresh`
Refresh access token.
- **Body:** `{ refreshToken: string }`
- **Response 200:** `{ accessToken: string }`

### POST `/auth/logout`
Invalidate refresh token. **Auth required.**
- **Body:** `{ refreshToken: string }`
- **Response 200:** `{ ok: true }`

### POST `/auth/register`
Create new user. **Admin only.**
- **Body:** `{ username, password, role?: "admin"|"editor"|"viewer", display_name? }`
- **Response 201:** `{ id, username, role, display_name }`

### POST `/auth/change-password`
Change own password. **Auth required.**
- **Body:** `{ old_password, new_password }`
- **Response 200:** `{ ok: true }`

### GET `/auth/me`
Get current user info. **Auth required.**
- **Response 200:** `{ id, username, role, display_name }`

### GET `/auth/users`
List all users. **Admin only.**
- **Response 200:** `[{ id, username, role, display_name, created_at }]`

---

## Entities — `/api/entities`

### GET `/entities`
List entities with optional filters.
- **Query:** `type`, `parent_id`, `search`, `is_own` (true/false), `limit` (default 50, max 200), `offset`
- **Response 200:** Array of entity objects

### GET `/entities/:id`
Get entity with children, relations, ancestry, and field definitions.
- **Response 200:** `{ ...entity, children, relations, parent, ancestry, fields }`
- **Response 404:** Not found

### POST `/entities`
Create entity. **Admin/Editor.**
- **Body:** `{ entity_type_id, name, properties?: {}, parent_id? }`
- **Response 201:** Created entity
- **Response 409:** `{ error: "duplicate", existing: { id, name } }`

### PUT `/entities/:id`
Full update. **Admin/Editor.**
- **Body:** `{ name?, properties?, parent_id? }`
- **Response 200:** Updated entity

### PATCH `/entities/:id`
Partial update. **Admin/Editor.** Same as PUT.

### DELETE `/entities/:id`
Soft-delete entity. **Admin/Editor.**
- **Response 200:** `{ ok: true }`

---

## Entity Types — `/api/entity-types`

### GET `/entity-types`
List all entity types.
- **Response 200:** `[{ id, name, name_ru, icon, color }]`

### POST `/entity-types`
Create entity type. **Admin only.**
- **Body:** `{ name, name_ru, icon?, color? }`

### PUT `/entity-types/:id`
Update entity type. **Admin only.**
- **Body:** `{ name_ru?, icon?, color? }`

### GET `/entity-types/:typeId/fields`
List field definitions for a type.

### POST `/entity-types/:typeId/fields`
Add field definition. **Admin only.**
- **Body:** `{ name, name_ru, field_type, options?, sort_order? }`

### DELETE `/entity-types/fields/:id`
Delete field definition. **Admin only.**

### GET `/entity-types/settings/lists`
Get all list-type field definitions with their options.

### PATCH `/entity-types/settings/lists/:fieldId`
Update list options. **Admin only.**
- **Body:** `{ options: string[] }`

---

## Relations — `/api/relations`

### GET `/relations/types`
List relation types.

### POST `/relations/types`
Create relation type. **Admin only.**
- **Body:** `{ name, name_ru, color? }`

### POST `/relations`
Create relation. **Admin/Editor.**
- **Body:** `{ from_entity_id, to_entity_id, relation_type }`

### DELETE `/relations/:id`
Delete relation. **Admin/Editor.**

---

## Reports — `/api/reports`

### GET `/reports/pivot`
Pivot report — entities grouped by a property.
- **Query:** `groupBy` (required), `filterType?`, `search?`
- **Response 200:** `{ groupBy, groups: [{ value, entities }], totalEntities }`

### GET `/reports/fields`
List all available property field names for pivot selection.

### GET `/reports/linked`
Linked report — equipment by location or tenant.
- **Query:** `type` = `equipment_by_location` | `equipment_by_tenant`

### GET `/reports/aggregate`
Equipment costs grouped by contracts + acts.
- **Query:** `contract_types` (pipe-separated, required), `metric?`, `date_from?`, `date_to?`, `contractor_id?`, `limit?`, `offset?`
- **Response (with limit):** `{ total, rows: [...] }`
- **Response (without limit):** `[...rows]`

### GET `/reports/rent-analysis`
Flat rows from rental contracts, expanded from rent_objects. Uses latest supplement if available.
- **Query:** `limit?`, `offset?`
- **Response (with limit):** `{ total, rows: [...] }`
- **Response (without limit):** `[...rows]`

### GET `/reports/work-history`
Equipment × act work descriptions matrix.
- **Query:** `category?`, `building_id?`, `date_from?`, `date_to?`

### GET `/reports/broken-equipment`
IDs of equipment marked broken in their latest act.
- **Response 200:** `[id, id, ...]`

### GET `/reports/contract-card/:id`
Full card for any contract type — includes rent rows, equipment, supplements history.
- **Response 200:** Full contract card object

---

## Stats — `/api/stats`

### GET `/stats`
Dashboard statistics (entity counts by type).

---

## Health — `/api/health`

### GET `/health`
Health check. No auth required.
- **Response 200:** `{ status: "ok", timestamp }`
