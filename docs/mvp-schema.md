# MVP Schema

This schema defines the first build target for Core Capture. It keeps event setup, registrations, attendees, answers, counts, QR/check-in placeholders, and external sync placeholders separate from the start.

The MVP can use SQLite locally and remain Postgres-ready. Field names below use application-friendly names rather than database-specific casing.

## Design Rules

- One registration can contain many attendees.
- Attendees, registrations, and orders are separate records.
- Counts are generated from structured answers and system states, not raw text.
- Public registration can be guest-friendly.
- Staff users and event-day devices may record activity into the same shared event area.
- Destination-specific integration details stay behind generic external sync labels in the product UI.

## Status Values

### Event Status

- `draft`: event exists but is not open for registration.
- `open`: public or private registration is available.
- `closed`: registration is no longer available, but staff can still review.
- `archived`: event is hidden from normal active views.

### Registration Status

- `draft`: registration started but not submitted.
- `submitted`: registration was submitted but may still need validation.
- `complete`: registration is valid and countable.
- `incomplete`: missing required data or failed validation.
- `canceled`: intentionally removed from active counts.

### Attendee Status

- `active`: attendee should be counted.
- `canceled`: attendee should not be counted.
- `waitlisted`: attendee is captured but not included in confirmed totals.

### Payment Status

- `not_required`: event is free or payment is not part of the flow.
- `pending`: payment exists but is not complete.
- `complete`: payment is complete.
- `failed`: payment failed.
- `refunded`: payment was refunded.
- `comped`: staff marked the order as covered without payment.

### Check-In Status

- `not_checked_in`: attendee or registration has not been checked in.
- `checked_in`: attendee or registration has an active check-in record.
- `undone`: prior check-in was reversed.

### Sync Status

- `not_ready`: record is not valid enough to queue.
- `ready`: record is validated and can be queued.
- `queued`: record is waiting to sync.
- `synced`: destination accepted the payload.
- `failed`: destination rejected the payload or the request failed.
- `review_required`: staff must review before retrying or syncing.

## Tables

### events

Stores staff-created event definitions.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| name | string | Public event name |
| starts_at | datetime | Event start |
| ends_at | datetime, nullable | Event end |
| location_name | string, nullable | Public location label |
| description | text, nullable | Public description |
| capacity | integer, nullable | Optional attendee capacity |
| registration_opens_at | datetime, nullable | Open date |
| registration_closes_at | datetime, nullable | Close date |
| image_url | string, nullable | Event image path or URL |
| is_paid | boolean | Payment required flag |
| visibility | enum | `public`, `private` |
| status | enum | Event status |
| internal_notes | text, nullable | Staff-only |
| created_at | datetime | Audit |
| updated_at | datetime | Audit |

### staff_users

Stores staff, volunteers, and operators who can record activity.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| display_name | string | Visible staff/operator name |
| email | string, nullable | Optional login/contact |
| role | enum | `admin`, `staff`, `volunteer`, `device` |
| status | enum | `active`, `inactive` |
| created_at | datetime | Audit |
| updated_at | datetime | Audit |

### event_devices

Stores event-day device/session placeholders for scan logs.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| event_id | uuid | References events |
| name | string | Example: Front Door iPad |
| device_type | string, nullable | Tablet, phone, laptop |
| active_staff_user_id | uuid, nullable | References staff_users |
| last_seen_at | datetime, nullable | Device activity |
| created_at | datetime | Audit |
| updated_at | datetime | Audit |

### registrations

Stores one submitted signup flow.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| event_id | uuid | References events |
| primary_first_name | string | Contact first name |
| primary_last_name | string | Contact last name |
| primary_email | string, nullable | Children/guests may not have email |
| primary_phone | string, nullable | Contact phone |
| status | enum | Registration status |
| payment_status | enum | Payment status |
| submitted_at | datetime, nullable | Submission time |
| completed_at | datetime, nullable | Validation-complete time |
| canceled_at | datetime, nullable | Cancellation time |
| review_notes | text, nullable | Staff notes |
| created_at | datetime | Audit |
| updated_at | datetime | Audit |

### attendees

Stores each person attached to a registration.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| event_id | uuid | References events |
| registration_id | uuid | References registrations |
| first_name | string | Required for MVP |
| last_name | string, nullable | Optional for children/guests |
| email | string, nullable | Optional |
| phone | string, nullable | Optional |
| age_group | enum, nullable | `adult`, `student`, `child`, `unknown` |
| status | enum | Attendee status |
| check_in_status | enum | Check-in status |
| created_at | datetime | Audit |
| updated_at | datetime | Audit |

### registration_questions

Stores event-specific form questions.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| event_id | uuid | References events |
| label | string | Visible question label |
| help_text | string, nullable | Optional helper text |
| question_type | enum | `text`, `email`, `phone`, `dropdown`, `multiple_choice`, `checkbox`, `date`, `long_answer`, `waiver` |
| scope | enum | `registration`, `attendee` |
| is_required | boolean | Validation |
| display_order | integer | Form order |
| condition_json | json, nullable | MVP placeholder for conditional display |
| created_at | datetime | Audit |
| updated_at | datetime | Audit |

### question_options

Stores selectable options for dropdown, multiple choice, and checkbox questions.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| question_id | uuid | References registration_questions |
| label | string | Visible option |
| value | string | Stable option value |
| display_order | integer | Option order |
| created_at | datetime | Audit |
| updated_at | datetime | Audit |

### registration_answers

Stores typed answers for a registration or attendee.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| registration_id | uuid | References registrations |
| attendee_id | uuid, nullable | References attendees for attendee-scoped answers |
| question_id | uuid | References registration_questions |
| option_id | uuid, nullable | References question_options when applicable |
| value_text | text, nullable | Text-like answers |
| value_boolean | boolean, nullable | Checkbox/waiver answers |
| value_date | date, nullable | Date answers |
| value_json | json, nullable | Multi-select or complex answers |
| created_at | datetime | Audit |
| updated_at | datetime | Audit |

### count_categories

Stores count group definitions.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| event_id | uuid | References events |
| name | string | Meals, shirts, childcare, sessions |
| source_type | enum | `attendee`, `answer`, `payment`, `check_in`, `custom` |
| display_order | integer | Report order |
| created_at | datetime | Audit |
| updated_at | datetime | Audit |

### count_items

Stores specific countable items within a category.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| count_category_id | uuid | References count_categories |
| label | string | Chicken, Adult M, Needed |
| value | string | Stable value |
| display_order | integer | Report order |
| created_at | datetime | Audit |
| updated_at | datetime | Audit |

### question_count_mappings

Maps structured question options to count items.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| question_id | uuid | References registration_questions |
| option_id | uuid, nullable | References question_options |
| count_item_id | uuid | References count_items |
| quantity | integer | Usually 1 |
| applies_when_json | json, nullable | Conditional placeholder |
| created_at | datetime | Audit |
| updated_at | datetime | Audit |

### generated_counts

Stores calculated totals for reporting and audit snapshots.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| event_id | uuid | References events |
| count_category_id | uuid | References count_categories |
| count_item_id | uuid, nullable | References count_items |
| total | integer | Calculated total |
| source_filter | enum | `registered`, `complete`, `paid`, `checked_in` |
| generated_at | datetime | Snapshot time |
| created_at | datetime | Audit |

### qr_tokens

Stores group-level QR tokens for MVP, with per-attendee support later.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| event_id | uuid | References events |
| registration_id | uuid | References registrations |
| attendee_id | uuid, nullable | Future per-attendee token |
| token_hash | string | Store hash, not raw token |
| scope | enum | `registration`, `attendee` |
| status | enum | `unused`, `used`, `void` |
| created_at | datetime | Audit |
| used_at | datetime, nullable | First successful scan |

### check_ins

Stores event-day check-in actions.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| event_id | uuid | References events |
| registration_id | uuid | References registrations |
| attendee_id | uuid, nullable | Null for group check-in action |
| qr_token_id | uuid, nullable | References qr_tokens |
| action | enum | `check_in`, `undo` |
| checked_in_at | datetime | Action timestamp |
| staff_user_id | uuid, nullable | References staff_users |
| device_id | uuid, nullable | References event_devices |
| notes | text, nullable | Audit note |
| created_at | datetime | Audit |

### sync_queue_items

Stores generic external sync queue placeholders.

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| event_id | uuid | References events |
| record_type | enum | `registration`, `attendee`, `check_in`, `count` |
| record_id | uuid | Local record ID |
| status | enum | Sync status |
| destination | string, nullable | Connector name when configured |
| payload_snapshot_json | json, nullable | Audit snapshot |
| response_snapshot_json | json, nullable | Destination response |
| error_message | text, nullable | Failure detail |
| attempts | integer | Retry count |
| next_retry_at | datetime, nullable | Retry scheduling |
| created_at | datetime | Audit |
| updated_at | datetime | Audit |

## Core Relationships

- `events` has many `registrations`.
- `registrations` has many `attendees`.
- `registrations` has many `registration_answers`.
- `attendees` has many attendee-scoped `registration_answers`.
- `events` has many `registration_questions`.
- `registration_questions` has many `question_options`.
- `registration_questions` maps to `count_items` through `question_count_mappings`.
- `events` has many `count_categories`.
- `count_categories` has many `count_items`.
- `events` has many `generated_counts`.
- `registrations` has many `qr_tokens`.
- `registrations` and `attendees` can have many `check_ins`.
- `check_ins` can reference the staff user and event device that recorded the action.
- `sync_queue_items` can reference registrations, attendees, check-ins, or count snapshots.

## Count Generation Rules

1. Count registrations from `registrations`, filtered by status.
2. Count attendees from `attendees`, not registrations.
3. Exclude canceled attendees from active attendee totals.
4. Exclude incomplete, draft, and canceled registrations from complete-registration counts.
5. Generate answer-based counts only through `question_count_mappings`.
6. For attendee-scoped questions, count once per attendee answer.
7. For registration-scoped questions, count once per registration answer unless a mapping explicitly sets another quantity.
8. Payment-aware reports include only `complete` or `comped` payment statuses unless the report says otherwise.
9. Checked-in totals come from active check-in records after undo actions are applied.
10. Generated count snapshots should be reproducible from source records.

## MVP Validation Rules

- Event name, start date/time, and status are required.
- Open events need registration open/close settings before public publishing.
- Registration requires primary contact name and at least one attendee.
- Required questions must have answers before registration can become `complete`.
- Waiver questions must be accepted when required.
- Attendee-scoped required questions must be answered for each active attendee.
- A duplicate QR scan must not create a second active check-in.
- Failed sync queue items must preserve error details.

## Deferred Until Later

- Full order line-item and refund schema.
- Promo codes and discounts.
- Advanced contact and household matching.
- Production external connector credentials.
- Per-attendee QR codes unless the first event requires them.
- Complex conditional form builder UI beyond stored condition placeholders.
