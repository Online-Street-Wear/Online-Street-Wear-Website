# Orders, payments, and collection

All commands below run from the inner project folder containing `wrangler.json`. For local startup, see the [README](../README.md).

## Server settings

Create or update `.dev.vars` from [the example](../.dev.vars.example); preserve existing values. Restart `npm run dev` after changes. These settings stay on the server and must not use the frontend `VITE_` prefix.

| Setting | Purpose |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | Paystack dashboard secret key: `sk_test_...` for testing or `sk_live_...` for real payments. |
| `PAYSTACK_CURRENCY` | `ZAR`; this checkout accepts South African rand. |
| `SITE_URL` | Exact storefront origin: `http://localhost:5173` locally or your public HTTPS origin in production. |
| `FIREBASE_PROJECT_ID` | Match frontend `VITE_FIREBASE_PROJECT_ID`; defaults to `online-street-wear`. |
| `ORDER_ADMIN_TOKEN` | Private, randomly generated key of at least 32 characters for `/manage-orders`. |
| `RESEND_API_KEY` | Resend API key permitted to send email. |
| `ORDER_FROM_EMAIL` | Sender on a domain verified in Resend, such as `ONLINE <orders@your-domain.example>`. |
| `ORDER_OWNER_EMAIL` | Store owner's notification inbox: one email address without a display name. Owner and customer messages are sent separately. |
| `ORDER_DB_PATH` | Optional local SQLite location; defaults to `.data/orders.sqlite`. |

Opening `http://localhost:8789/health` shows whether payment and email settings are present. This checks configuration presence, not whether credentials work or mail can be delivered.

## Paystack confirmation

Checkout saves an order number, sizes, colour requests, and collection details before redirecting to Paystack. The server calculates product prices and delivery charges. On return, `/order-confirmation` asks the server to verify payment; the return URL alone cannot mark an order paid. Verification checks the reference, amount, currency, customer email, and test/live mode against the saved order. The purchased cart quantities are removed only after confirmation.

Configure the Paystack webhook URL as:

```text
https://your-store.example/api/payments/webhook
```

The webhook validates Paystack's signature and reconciles successful payments even if the customer closes checkout before returning. Paystack cannot call `localhost`: local webhook testing needs a public HTTPS tunnel to the app/API. If using a public storefront tunnel, open that URL and set `SITE_URL` to the same origin. The browser return verification still works during ordinary localhost testing.

Test-mode orders are labelled in order management and represent **no real money received**. Use live paid orders for actual fulfilment. A configured email service can send confirmation emails for test orders too, so use a recipient you control when testing. Real email delivery has not been tested for this implementation; automated provider tests use mocks.

## Product sizes and colours

Customers must choose **S, M, L, XL, or XXL** before adding a product and starting payment. Size can also be changed in the cart or checkout. Items are distinguished by product, size, and requested colour: matching selections combine their quantities, while different sizes or colours remain separate.

Older saved carts keep their products and quantities and prompt customers to select a size before paying. Historical orders without a size remain readable and display **Not recorded**; the site does not guess the customer's size. New order confirmations, tracking, owner order details, and emails include the selected size. Previously prepared email retry payloads stay unchanged.

## PAXI and owner workflow

Customers choose a PEP/PAXI collection point using the locator linked at checkout, then enter its code, store name, province, recipient name, and mobile number. These entries are saved for fulfilment; the site does not validate them against a PAXI directory or book a parcel automatically.

The existing store delivery fees are preserved: Gauteng R80; Western Cape R100; KwaZulu-Natal R110; Eastern Cape R120; Free State and Mpumalanga R130; North West R125; Limpopo R140; Northern Cape R150. Delivery is free when the product subtotal is **over R2,000**. These are configured store charges, not a live courier quote.

1. Open `/manage-orders` and enter `ORDER_ADMIN_TOKEN`. Access lasts for that page session.
2. Search by order number or email across all saved orders. Results arrive in pages of 50, newest first; use **Load more orders** to continue.
3. Confirm requested colour availability and prepare a verified paid order. Move it from **Order confirmed** to **Packing your order**.
4. Arrange and hand over the parcel through PAXI. Enter its parcel number when marking the order **On the way to your PAXI point**. This queues dispatch emails for the customer and owner.
5. When PAXI confirms arrival at the selected point, record **Ready to collect**. Both the customer and owner receive an arrival notification with the selected point name/code and parcel number. Record **Collected** only after collection is confirmed; this also queues notifications.

Status updates are entered by staff, not fetched automatically from PAXI. Customers see them at `/track-order` using their order number and checkout email, or the private tracking link on their confirmation page. The page refreshes while visible and retains the last result if a refresh fails. The courier link opens PAXI tracking with the parcel number displayed alongside it. PAXI supplies the collection PIN by SMS; the website does not generate a PIN. Customers should bring that PIN and their ID as described in [PAXI's collection guidance](https://www.pepstores.com/pages/paxi). Cancelling an order does not refund Paystack; handle any refund separately in Paystack.

## Customer and owner emails

Set `RESEND_API_KEY` and `ORDER_FROM_EMAIL`, then set `ORDER_OWNER_EMAIL` for owner notifications. The sender must be on a [domain verified in Resend](https://resend.com/docs/dashboard/domains/introduction); the customer's and owner's inboxes can be ordinary email addresses. Add credentials only to server settings, never the React app or a committed file. Restart the local server after editing `.dev.vars`.

Verified payment queues a customer confirmation and a separate owner notification. Confirmations include the order number, items with sizes and colours, totals, PAXI point, and a tracking page link. Owner confirmations include the customer's contact details and a link to order management, which still requires the management key. Dispatch, arrival at the selected PAXI point, and collection each queue separate messages for both recipients. Customers use their checkout email to look up an order; owner addresses and private email payloads are never exposed by customer tracking.

Order management shows each customer's and owner's email status separately: `pending`, `sent`, `failed`, or `not_configured`. `sent` means the provider accepted the message; check Resend delivery logs for delivery or bounce details. Configuration notices identify a missing API key, sender, or owner inbox. A missing or failed email does not undo a verified payment or a saved fulfilment update. Customers can save the order number and use Track Order immediately.

After correcting settings, restart the local server or update Worker settings. The email retry action in order management retries eligible unsent customer and owner messages. The local server also checks once a minute; the deployed Worker checks every five minutes. Notifications are saved together with the status update so a process restart cannot lose them. A repeated status save or payment callback does not enqueue a second message for the same event and recipient.

Retries respect backoff and use the same saved payload and idempotency key independently for each recipient. Attempts stop 23 hours after the first sending attempt, within [Resend's 24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys), to avoid duplicate sends; inspect provider logs and resolve older failures manually. Recipient and order details are captured when queued (a missing owner inbox is filled when configured before the first send). Already-paid historical orders do not automatically get a new owner confirmation, and historical status changes are not backfilled into new emails.

To check real delivery after setup, use an order with a customer inbox you control and your configured owner inbox. Confirm payment, mark it packed, add the actual PAXI parcel number on dispatch, then update arrival only after PAXI confirms it. Check both inboxes and Resend delivery logs. Automated tests mock the provider and do not prove inbox delivery.

## Storage and Cloudflare deployment

Local orders persist in `.data/orders.sqlite` across restarts. Stop the development processes before backing up the entire `.data` directory, including any SQLite sidecar files. Keep this customer data private. A custom `ORDER_DB_PATH` needs its own backup. Node SQLite, Wrangler's local D1, and production D1 are separate stores; local orders are not uploaded automatically.

The production entry point is `src/worker/index.ts`; it mounts the shared order API through `src/api/payments.ts`. `wrangler.json` binds D1 as `DB`, serves `dist`, and sets cron `*/5 * * * *` for email retries. Ensure its D1 and R2 identifiers refer to your Cloudflare resources.

For Worker development, build the frontend and apply the migrations to local D1:

```powershell
npm run build
npx wrangler d1 migrations apply DB --local --config wrangler.json
npm run dev:worker
```

This serves the built site on port 8787. Set local `SITE_URL=http://localhost:8787` for this mode, restoring port 5173 when returning to `npm run dev`.

For production, configure `PAYSTACK_SECRET_KEY`, `ORDER_ADMIN_TOKEN`, `RESEND_API_KEY`, and `ORDER_OWNER_EMAIL` as Worker secrets, for example with `npx wrangler secret put PAYSTACK_SECRET_KEY --config wrangler.json`. Set `SITE_URL`, `PAYSTACK_CURRENCY`, `ORDER_FROM_EMAIL`, and `FIREBASE_PROJECT_ID` in a `vars` object in `wrangler.json` for your deployment; local `.dev.vars` is not deployed. Use the public HTTPS storefront origin for `SITE_URL` so emailed tracking links work on customer devices. Then apply migrations, including `migrations/4.sql` which creates `customer_orders`, and publish the built Worker:

```powershell
npm run check
npx wrangler d1 migrations apply DB --remote --config wrangler.json
npx wrangler deploy --config wrangler.json
```

Those final two commands change the production database and publish the site. Configure the public Paystack webhook for the same deployment. A scheduled Worker invocation calls the shared retry queue; no separate email service process is needed.
