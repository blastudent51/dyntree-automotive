# Dyntree dealer network

Dyntree dealer locations are live database records. They are no longer treated as placeholder/future-only content.

## Public visibility

`/dealers` lists records where `active=true`.

Each public card shows only the capabilities enabled for that record:

- `showroom` — showroom visits
- `service` — service capability
- `pickup` — vehicle pickup capability
- `delivery` — delivery support

Turning a dealer inactive removes it from the public directory and from new dealer-pickup checkout choices, but existing reservations can keep their historical `dealerId` link.

## Create or edit a dealer

Open **My Dyntree → Administration → Dealers**.

Use a stable lowercase code containing letters, numbers and hyphens. Example: `tallahassee-west`.

Enter the real public-facing location name, address, city, state, ZIP, phone and email. Latitude/longitude are optional. Enable only capabilities that are actually available, then enable **Active** when the location should appear publicly.

## Dealer pickup at reservation

Reservation checkout offers two delivery methods:

- `HOME_DELIVERY`
- `DEALER_PICKUP`

Dealer Pickup appears only when at least one dealer is both active and pickup-enabled. The server re-validates the selected dealer before creating the reservation, so a stale/inactive location cannot be assigned by changing browser data.

The selected dealer is stored using `Reservation.dealerId`. My Dyntree loads the dealer relation and displays the actual pickup location on the reservation.

## Change an existing reservation

Open **Administration → Reservations → Edit**.

Choose the delivery method. For dealer pickup, enter the dealer code from the Dealers table. The server resolves that code to the dealer UUID and requires the dealer to be active and pickup-enabled.

A delivery-only change is audit logged. A production-status change still requires a status note and creates the normal status history/email when the reservation has a real customer email.
