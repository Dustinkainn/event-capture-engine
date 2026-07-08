# Count Engine

The count engine turns registrations into exact operational totals. Counts must come from structured registration answers and system state, not guesses from raw text.

## Required Counts

- Total registrations
- Total attendees
- Meal counts
- Shirt sizes
- Childcare needs
- Session selections
- Volunteer counts
- Transportation needs
- Custom count categories
- Payment-based counts
- Checked-in totals

## Counting Rules

- Count attendees from attendee records, not from registration records.
- Count group registrations by each attendee included in the group.
- Count conditional answers only when their conditions were active for the submitted registration.
- Count only complete registrations unless a report explicitly asks for pending or incomplete records.
- Count paid-event registrations by payment rules, not by the presence of an order alone.
- Count check-ins from check-in records and token state, with duplicate scan protection.
- Keep generated counts traceable to source records.

## Count Mapping

Registration questions may map answers to count categories and count items.

Examples:

- Meal dropdown maps to the meal count category.
- Shirt-size dropdown maps to the shirt size count category.
- Childcare checkbox maps to childcare needed.
- Session multi-select maps to one count per selected session.
- Volunteer role selection maps to volunteer counts.

## Reports

Count reports should support:

- Event-level summaries
- Attendee-level drill-downs
- Payment-filtered counts
- Checked-in versus registered counts
- Export-ready tables
- Reconciliation views for staff review
