# OmniSeller DB Architecture V1

## Status

Draft v1  
Canonical architecture document for OmniSeller relational data design.

## Purpose

This document defines the canonical database architecture for OmniSeller. It exists to prevent schema drift as the platform expands from a single-marketplace eBay workflow into a multi-marketplace reseller operating system.

This document governs:

- core entity ownership
- relational boundaries
- lifecycle/state modeling
- external identity placement
- metadata usage rules
- future extension seams

This document does **not** define API contracts, UI contracts, or queue implementation details except where they materially affect data design.

---

## Design Principles

### 1. Database is the source of truth
Operational state must live in first-class relational fields wherever the state is queryable, user-visible, or used in automation.

### 2. External systems do not define the internal model
eBay, EasyPost, OpenAI, and future providers project into OmniSeller’s canonical entities. Their payloads may be stored, but their schemas do not own OmniSeller’s design.

### 3. AI is advisory, not authoritative
AI-generated suggestions, drafts, and recommendations are separate from inventory truth and operator-approved listing data.

### 4. Queryable state must not be buried in JSON
JSON is allowed for raw payload snapshots, provider-specific extras, and opaque future-safe blobs. JSON must not replace relational fields for commonly filtered, joined, or indexed data.

### 5. Lifecycle state should be explicit
Inventory, listing, order, shipment, and AI workflows must use explicit enums or clearly defined state fields instead of UI-derived logic.

### 6. Historical traces matter
Operationally important actions should preserve historical records or snapshot payloads where useful for support, audit, and future analytics.

### 7. Multi-marketplace is a first-class future constraint
Current eBay-first implementation must not hard-code external assumptions into core entities that will block Mercari, Poshmark, Facebook Marketplace, or future adapters.

---

## System Domains

The canonical data model is divided into the following domains:

- Auth and Users
- Marketplace Accounts
- Inventory
- Storage Locations / Bins
- Photos / Media
- AI Listing Suggestions
- Listing Drafts
- Listings
- Orders
- Order Items
- Shipments
- Carrier / Pricing History
- Jobs / Automation State
- Future Analytics / Recommendation Layers

---

## Canonical Entity Model

## Users and Auth

### `User`
Represents an application user/operator.

**Owns**
- identity
- profile
- app-level ownership of created records where needed

**Should not own**
- marketplace credential details directly
- operational aggregates

### `Account`
Auth provider link record.

### `Session`
Auth/session persistence.

These are implementation-support tables and are not domain drivers.

---

## Marketplace Accounts

### `MarketplaceAccount`
Represents one connected marketplace account.

**Examples**
- eBay seller account
- future Mercari account
- future Poshmark account

**Owns**
- marketplace identity
- OAuth/access linkage
- account-level configuration for a marketplace

**Key fields**
- `id`
- `userId`
- `marketplace`
- `externalAccountId` if provider exposes one
- `status`
- token/credential references as needed
- account metadata

**Rules**
- All marketplace-specific listing/order sync operations must route through `MarketplaceAccount`
- External account identity belongs here, not scattered across orders/listings

---

## Inventory Domain

### `InventoryItem`
Represents the canonical internal record for a sellable item.

This is the root entity for the seller’s item truth.

**Owns**
- canonical SKU
- title / working title
- category / internal category if present
- condition
- cost basis
- quantity if relevant
- acquisition metadata
- physical/storage readiness
- listing readiness
- sale lifecycle state
- bin assignment linkage
- barcode / UPC / scan-code fields
- core item metadata

**Should not own**
- provider-specific listing state
- shipment state
- raw marketplace order data

**Key fields**
- `id`
- `sku`
- `title`
- `description` if manually maintained internal description exists
- `condition`
- `costBasis`
- `inventoryStatus`
- `listingReadiness`
- `saleStatus`
- `binId`
- `upc`
- `barcode`
- `brand`
- `category`
- `metadata`
- timestamps

**Notes**
- `InventoryItem` is the canonical parent of photos, AI suggestions, listing drafts, and listings
- readiness fields may be recalculated from dependent state, but the DB should store the resulting queryable state

---

## Storage Locations / Bins

### `Bin`
Represents a physical storage location.

**Examples**
- `A12`
- `BIN-B03`
- `SHELF-C21`

**Owns**
- unique location code
- optional location metadata
- optional active/inactive state

**Should not own**
- item state
- item-level workflow logic

**Rules**
- `InventoryItem.binId` links item to location
- bin code must be unique
- future warehouse/location hierarchy can extend this model without replacing it

---

## Photo / Media Domain

### `Photo`
Represents an inventory-linked image/media record.

**Owns**
- storage path/key
- display URL or delivery reference
- ordering
- primary flag
- upload lifecycle state
- role/type
- soft delete state
- file metadata
- future processing metadata

**Key fields**
- `id`
- `inventoryItemId`
- `storageBucket`
- `storageKey`
- `url` or delivery reference
- `position`
- `isPrimary`
- `uploadStatus`
- `photoRole`
- `mimeType`
- `fileName`
- `fileSizeBytes`
- `width`
- `height`
- `deletedAt`
- `processingMetadata`
- `metadata`

**Rules**
- one inventory item can have many photos
- only one active primary photo should exist per inventory item
- ordering must be explicit and queryable
- storage path should be deterministic

**Allowed metadata**
- transform outputs
- raw provider/storage response
- future background-removal/compression results

---

## AI Listing Domain

### `AiListingSuggestion`
Represents one AI generation attempt/result for an inventory item or listing context.

**Owns**
- AI suggestion output
- provider/model reference
- prompt/input snapshot if retained
- success/failure status
- raw AI response snapshot if needed
- structured output payload
- failure details

**Should not own**
- final publishable listing truth
- authoritative inventory fields

**Key fields**
- `id`
- `inventoryItemId`
- `listingId` optional
- `provider`
- `model`
- `status`
- `suggestedTitle`
- `suggestedDescription`
- `suggestedCategory`
- `suggestedPrice`
- `suggestedItemSpecifics`
- `rawResponse`
- `error`
- timestamps

**Rules**
- multiple suggestions may exist historically
- suggestions are immutable historical attempts unless there is a very good reason otherwise
- operator application into draft is a separate action

---

## Listing Draft Domain

### `ListingDraft`
Represents operator-controlled draft listing data for a future or current listing.

**Owns**
- draft title
- draft description
- draft category
- draft price
- draft specifics/attributes
- operator-edited values
- AI-applied fields if selected
- draft completeness state

**Should not own**
- external marketplace publish lifecycle
- final marketplace sync state

**Key fields**
- `id`
- `inventoryItemId`
- `marketplaceAccountId` optional if draft is marketplace-specific
- `title`
- `description`
- `category`
- `price`
- `currency`
- `itemSpecifics`
- `draftStatus`
- `source`
- timestamps

**Rules**
- draft is the bridge between suggestion and publish
- AI can populate draft fields only through explicit operator action or explicit business rule
- draft may later become marketplace-specific if needed

---

## Listings Domain

### `Listing`
Represents a published or publish-attempt listing on a marketplace.

**Owns**
- marketplace linkage
- external listing ID
- listing lifecycle state
- publish/revise/end status
- canonical price/quantity snapshot for that listing
- provider response metadata

**Key fields**
- `id`
- `inventoryItemId`
- `marketplaceAccountId`
- `marketplace`
- `externalListingId`
- `status`
- `price`
- `currency`
- `quantity`
- `publishedAt`
- `endedAt`
- `metadata`
- timestamps

**Rules**
- listing is not the same thing as draft
- listing belongs to a specific marketplace account
- future multi-marketplace support should create multiple listing records for one inventory item when appropriate

---

## Orders Domain

### `Order`
Represents a marketplace-originated order imported into OmniSeller.

**Owns**
- external order identity
- order-level buyer/shipping snapshot
- order lifecycle state
- fulfillment readiness
- tracking sync state
- marketplace/source linkage
- operational flags and recoverable failure state

**Key fields**
- `id`
- `marketplaceAccountId`
- `marketplace`
- `externalOrderId`
- `orderStatus`
- `fulfillmentReadiness`
- `trackingSyncStatus`
- `buyerName`
- shipping snapshot fields
- `orderedAt`
- `paidAt`
- `fulfilledAt`
- `metadata`
- timestamps

**Rules**
- repeated imports must reconcile idempotently
- order-level shipping destination fields should remain snapshotted even if other entities change later
- fulfillment workflow should be queryable directly from relational fields

---

## Order Items Domain

### `OrderItem`
Represents an individual line item within an order.

**Owns**
- order linkage
- external line item identity
- item quantity
- sold price snapshot
- linkage to listing/inventory where resolvable

**Key fields**
- `id`
- `orderId`
- `externalLineItemId`
- `listingId` optional
- `inventoryItemId` optional if resolvable
- `titleSnapshot`
- `quantity`
- `unitPrice`
- `metadata`

**Rules**
- one order has many order items
- line item identity belongs here, not the parent order
- linkage back to inventory/listing should be preserved where possible but may be nullable for imported edge cases

---

## Shipment Domain

### `Shipment`
Represents a shipment attempt/purchase/fulfillment record associated with an order.

**Owns**
- carrier/provider shipment identity
- shipment lifecycle state
- selected rate snapshot
- parcel dimensions/weight snapshot
- label information
- tracking information
- marketplace sync outcome
- recoverable failure state
- void/refund state

**Key fields**
- `id`
- `orderId`
- `provider`
- `status`
- `providerShipmentId`
- `providerRateId`
- `providerTrackerId`
- `carrier`
- `service`
- `trackingCode`
- `trackingStatus`
- `labelUrl`
- `labelFormat`
- `rateAmount`
- `rateCurrency`
- parcel dimension fields
- `purchasedAt`
- `syncedToMarketplaceAt`
- `voidedAt`
- `metadata`
- timestamps

**Rules**
- shipment is the source of truth for purchased label/tracking lifecycle
- marketplace fulfillment sync should be represented here or via tightly linked derived state
- failed marketplace sync must not destroy the fact that a valid label exists

---

## Carrier Rate / Price History Domain

### `CarrierRate` (recommended current/future table)
Represents a quoted carrier rate snapshot prior to purchase.

**Owns**
- provider quote identity if present
- order/shipment context
- carrier/service/rate snapshot
- delivery estimate snapshot

**Reason**
Useful if rate history needs to be preserved, compared, or audited independently of final purchased shipments.

### `PriceHistory`
Represents listing price changes over time.

**Owns**
- item/listing price history snapshots
- rule-driven repricing history later

**Rules**
- this is historical/log data, not authoritative current state

---

## Jobs / Automation Domain

### `Job`
Represents app-level automation or background task state if retained in DB.

**Owns**
- task name/type
- status
- payload snapshot if intentionally retained
- error details
- execution timestamps

**Notes**
BullMQ is runtime infrastructure; DB persistence should store only product-relevant automation state, not blindly duplicate queue internals.

### Future `DomainEvent` / Outbox (recommended)
Not required immediately, but recommended for growth.

Potential fields:
- `id`
- `eventType`
- `aggregateType`
- `aggregateId`
- `payload`
- `status`
- `attempts`
- `processedAt`
- `error`
- timestamps

This should be used if/when automation and integrations become complex enough to justify a transactional outbox pattern.

---

## Recommended Lifecycle / State Model

## Inventory States

### `inventoryStatus`
Represents physical/control state of the item.

Recommended values:
- `DRAFT`
- `INTAKED`
- `READY`
- `ARCHIVED`

### `listingReadiness`
Represents whether the item is operationally ready for listing generation/publish workflow.

Recommended values:
- `NOT_READY`
- `PHOTO_PENDING`
- `DRAFT_PENDING`
- `READY_TO_LIST`
- `LISTED`

### `saleStatus`
Represents commercial sale lifecycle.

Recommended values:
- `AVAILABLE`
- `LISTED`
- `RESERVED`
- `SOLD`
- `SHIPPED`
- `CANCELLED`
- `RETURNED`
- `ARCHIVED`

---

## Photo States

### `uploadStatus`
Recommended values:
- `PENDING`
- `UPLOADING`
- `UPLOADED`
- `FAILED`
- `DELETED`

### `photoRole`
Recommended values:
- `ORIGINAL`
- `PROCESSED`
- `THUMBNAIL`

---

## AI Suggestion States

### `AiListingSuggestion.status`
Recommended values:
- `PENDING`
- `SUCCEEDED`
- `FAILED`

---

## Draft States

### `ListingDraft.draftStatus`
Recommended values:
- `DRAFT`
- `READY`
- `ARCHIVED`

---

## Listing States

### `Listing.status`
Recommended values:
- `DRAFT`
- `PUBLISHING`
- `ACTIVE`
- `ENDED`
- `FAILED`

---

## Order States

### `orderStatus`
Recommended values:
- `IMPORTED`
- `READY_TO_FULFILL`
- `FULFILLMENT_BLOCKED`
- `LABEL_PENDING`
- `LABEL_PURCHASED`
- `FULFILLED`
- `CANCELLED`
- `ERROR`

### `fulfillmentReadiness`
Recommended values:
- `READY`
- `BLOCKED`
- `SHIPPED`

### `trackingSyncStatus`
Recommended values:
- `NOT_REQUIRED`
- `PENDING`
- `SYNCED`
- `FAILED`

---

## Shipment States

### `Shipment.status`
Recommended values:
- `PENDING`
- `LABEL_PURCHASED`
- `SYNC_QUEUED`
- `SYNCED_TO_MARKETPLACE`
- `VOIDED`
- `ERROR`

Note: `ERROR` must be used carefully. Errors should preserve whether a valid label/tracking object still exists.

---

## External Identity Strategy

External IDs must be stored only on the entities that actually own those relationships.

### Marketplace account external IDs
Store on `MarketplaceAccount`

### External listing IDs
Store on `Listing.externalListingId`

### External order IDs
Store on `Order.externalOrderId`

### External order line item IDs
Store on `OrderItem.externalLineItemId`

### Provider shipment/rate/tracker IDs
Store on `Shipment.providerShipmentId`, `Shipment.providerRateId`, `Shipment.providerTrackerId`

### Rule
Do not duplicate external IDs across unrelated tables unless there is a strong performance or audit reason.

---

## Metadata Policy

## Allowed use of JSON / metadata fields

JSON is allowed for:

- raw provider payload snapshots
- raw marketplace payload snapshots
- AI raw responses
- opaque future-safe provider extras
- structured error blobs
- transform/processing metadata
- historical snapshots where full normalization is not justified

## Not allowed use of JSON

JSON must not replace relational fields for:

- lifecycle/status values
- foreign keys
- frequently filtered fields
- common sorting/grouping fields
- fields shown in main operator tables
- readiness/automation decision fields

---

## Table Classification

Each table should be thought of as one of the following:

### Transactional truth
Current canonical state used by the application.

Examples:
- `InventoryItem`
- `Bin`
- `Photo`
- `ListingDraft`
- `Listing`
- `Order`
- `OrderItem`
- `Shipment`
- `MarketplaceAccount`

### Historical/supporting records
Useful history, snapshots, or log-like records.

Examples:
- `AiListingSuggestion`
- `PriceHistory`
- `CarrierRate`
- future `DomainEvent`

### Infrastructure support
Implementation tables not central to business domain design.

Examples:
- `User`
- `Account`
- `Session`
- `Job` depending on implementation details

---

## Key Relationships

## Required / primary relations

- `User` 1:N `MarketplaceAccount`
- `InventoryItem` N:1 `Bin` (optional)
- `InventoryItem` 1:N `Photo`
- `InventoryItem` 1:N `AiListingSuggestion`
- `InventoryItem` 1:N `ListingDraft`
- `InventoryItem` 1:N `Listing`
- `MarketplaceAccount` 1:N `Listing`
- `MarketplaceAccount` 1:N `Order`
- `Order` 1:N `OrderItem`
- `Order` 1:N `Shipment`

## Optional but preferred relations
- `OrderItem` N:1 `Listing`
- `OrderItem` N:1 `InventoryItem`
- `AiListingSuggestion` N:1 `Listing` if suggestions are later attached to a specific draft/listing context

---

## Indexing Strategy

The following indexes are recommended at minimum.

## InventoryItem
- unique index on `sku`
- index on `binId`
- index on `inventoryStatus`
- index on `listingReadiness`
- index on `saleStatus`
- index on `upc`
- index on `barcode`
- searchable index strategy for title/SKU if full-text or trigram is added later

## Bin
- unique index on `code`

## Photo
- index on `inventoryItemId`
- composite index on `(inventoryItemId, deletedAt, position)`
- partial or logical uniqueness for active primary photo if supported through DB/application logic

## AiListingSuggestion
- index on `inventoryItemId`
- index on `status`
- index on `createdAt`

## ListingDraft
- index on `inventoryItemId`
- index on `draftStatus`

## Listing
- unique or constrained index on `(marketplaceAccountId, externalListingId)` where appropriate
- index on `inventoryItemId`
- index on `status`
- index on `marketplace`

## Order
- unique or constrained index on `(marketplaceAccountId, externalOrderId)`
- index on `orderStatus`
- index on `fulfillmentReadiness`
- index on `trackingSyncStatus`
- index on `orderedAt`

## OrderItem
- index on `orderId`
- unique or constrained index on `(orderId, externalLineItemId)` where appropriate
- index on `inventoryItemId`
- index on `listingId`

## Shipment
- unique index on `providerShipmentId` when provider guarantees uniqueness
- index on `orderId`
- index on `status`
- index on `trackingCode`

---

## Current V1 Boundary Decisions

## Included now
- eBay-first marketplace support through generic marketplace-account/listing/order boundaries
- EasyPost-first shipment provider support through generic shipment provider fields
- Supabase Storage-compatible photo model
- AI suggestion/draft split
- bin-based physical inventory management
- readiness and sale-state modeling

## Explicitly deferred
- full transactional outbox/event bus
- warehouse hierarchy beyond flat bins
- scanner/mobile application implementation
- full repricing policy schema
- deep analytics schema/materialized views
- return/claims/refund workflow depth
- full marketplace-specific category/spec normalization tables

---

## Future Extension Seams

## Repricing
Likely additions:
- `PricingRule`
- `PricingDecision`
- `CompetitorSnapshot`
- expanded `PriceHistory`

## Analytics
Likely additions:
- materialized reporting views
- rollup tables by category, SKU, source, turn rate, profit

## Marketplace expansion
Likely additions:
- richer marketplace-specific policy tables
- category mapping tables
- item-specific schema tables if normalization becomes justified

## Media pipeline
Likely additions:
- `PhotoVariant`
- background-removal/compression job records
- derived image artifact tracking

## Automation / notifications
Likely additions:
- `DomainEvent`
- `Notification`
- `ReminderRule`
- `ReminderExecution`

---

## Canonical Rules

1. `InventoryItem` is the root truth for sellable item identity.
2. `ListingDraft` is the operator-controlled listing composition layer.
3. `AiListingSuggestion` is historical/advisory output only.
4. `Listing` is the marketplace publication record.
5. `Order` and `OrderItem` are imported marketplace sales records.
6. `Shipment` is the fulfillment/tracking truth record.
7. Queryable operational state must be relational.
8. JSON is supplemental, not primary truth.
9. External provider structure must not reshape canonical internal ownership.
10. Future migrations must be checked against this document before major schema additions.

---

## Open Questions

These are intentionally left open for later ratification if needed:

- Should `ListingDraft` be strictly one active draft per inventory item, or allow multiple drafts by marketplace/account?
- Should `CarrierRate` become first-class now, or wait until richer shipping comparison/history is needed?
- Should photo delivery remain public URL-based, or move to signed delivery later?
- Should sale-state transitions become more event-driven once order automation deepens?
- At what point does `DomainEvent` / outbox become mandatory rather than optional?
- Should category mapping become a first-class normalized domain before marketplace expansion?

---

## Immediate Next Actions

1. Compare current Prisma schema against this document.
2. Identify any drift or missing first-class fields.
3. Decide whether a schema reconciliation sprint is needed before deeper automation work.
4. Keep future Prisma changes aligned to this document.
5. Update this document when a domain boundary materially changes.

---

## Change Control

Any of the following require an update to this document before or during implementation:

- new core table creation
- lifecycle enum changes
- relocation of external IDs
- JSON metadata replacing relational fields
- new domain crossing between inventory, listings, orders, shipments, or AI

---

## Summary

OmniSeller’s canonical DB architecture is centered on:

- `InventoryItem` as item truth
- `Photo` as media truth
- `AiListingSuggestion` as advisory history
- `ListingDraft` as operator-controlled composition
- `Listing` as marketplace publication truth
- `Order` / `OrderItem` as imported sale truth
- `Shipment` as fulfillment truth
- `MarketplaceAccount` as marketplace integration root

This model is intentionally designed to support:

- current eBay-first workflows
- high-volume seller operations
- future marketplace expansion
- AI assistance without surrendering control
- automation and analytics growth without a schema rewrite