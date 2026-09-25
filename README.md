# CyberCute — PesaPal + SMM payment flow

This version implements the payment flow as:

1. Customer selects a service and submits an order.
2. Backend creates an internal `Awaiting Payment` order.
3. Backend submits a PesaPal API 3.0 payment request.
4. Customer is redirected to PesaPal checkout.
5. PesaPal sends the callback and IPN.
6. Backend calls `GetTransactionStatus` and treats PesaPal's status as authoritative.
7. For a wallet deposit, the verified amount is credited to the customer's wallet.
8. For a service order, the verified payment changes the order to paid and the backend forwards it to the configured SMM provider.
9. Provider success changes the order to `Processing`; provider errors are recorded for manual handling.

## Important production requirements

PesaPal API 3.0 requires a **public HTTPS IPN URL** to be registered before submitting orders. The returned `ipn_id` must be supplied as `notification_id`.

Set these server environment variables:

- `PESAPAL_ENV=sandbox` for testing, or `live` for production.
- `PESAPAL_CONSUMER_KEY`
- `PESAPAL_CONSUMER_SECRET`
- `PESAPAL_IPN_ID`
- `PESAPAL_CALLBACK_URL=https://YOUR-BACKEND/api/pesapal/callback`
- `PUBLIC_URL=https://YOUR-BACKEND`
- `FRONTEND_URL=https://YOUR-FRONTEND`
- `SMM_PROVIDER_URL`
- `SMM_PROVIDER_KEY`

For the Vite frontend:

- `VITE_API_URL=https://YOUR-BACKEND`

### Registering the IPN

After the backend is publicly deployed, you can register the IPN with:

`POST /api/pesapal/register-ipn`

with JSON:

```json
{"url":"https://YOUR-BACKEND/api/pesapal/ipn"}
```

Save the returned `ipn_id` as `PESAPAL_IPN_ID`.

Do not put the Consumer Secret in frontend code.

## Run

```bash
npm install
cp .env.example .env
npm run dev
node server/index.cjs
```

For a production build:

```bash
npm run build
node server/index.cjs
```

## Storage

The included server stores wallet/payment/order state in `server/data/store.json`. This is suitable for a simple Node deployment, but for a production/high-volume SMM panel you should replace it with a managed database with transactions and idempotency constraints.

## Security

The IPN and callback do not trust a status sent by the browser. They use PesaPal's `GetTransactionStatus` endpoint before crediting a wallet or dispatching an SMM order. The merchant reference is also checked against the locally stored payment record, and amount/currency are compared before crediting.

PesaPal's API 3.0 documentation says the callback/IPN does not itself contain the payment status and that the merchant should fetch the transaction status using the tracking ID.
