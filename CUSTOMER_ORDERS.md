# Customer orders

Customer page: http://127.0.0.1:5173/order. No staff login is needed. Customers choose products, see available quantities in active storage, enter their name/company and submit a request.

Staff page: http://127.0.0.1:5173. Sign in and select **Orders** in the main sidebar. Admins and Supervisors allocate stock; Warehouse Operators execute the resulting pick/pack/dispatch tasks.

## Jury demonstration

1. Receive stock and put it away in storage using Workflow or Inbound/Inventory.
2. Open the customer page in a second tab, using the link in Orders. Select Wireless Mouse, request 10 units, enter a customer name and submit.
3. Keep the WEB reference in the confirmation. It confirms that the request was received, not that stock was reserved or shipped.
4. Return to the staff tab, select Orders and click Refresh orders. The request appears with source Customer page and status OPEN.
5. Check product availability and shortages. Allocate as Admin or Supervisor. The server checks again and reserves the complete order atomically.
6. Click Open fulfilment. Complete the existing barcode-verified pick, pack and dispatch actions.
7. Review the shipped order, remaining stock and audit trail. Dispatch queues the existing simulated ERP confirmation.

Workflow step 4 now selects outside customer requests. Open the customer tab, submit a single-product request for the walkthrough product, return, click Refresh incoming orders and select it. Multi-product requests use Orders and Outbound directly. Existing ERP/demo sales orders remain visible with their source distinguished.

## Availability and retries

- Available quantity is quantity minus reserved, summed only across active STORAGE bins. Receiving, packing and blocked-bin stock are excluded.
- Submission rejects shortages but does not reserve stock. Multiple open requests can compete for the same units; staff allocation is the final stock decision. Checking availability does not alter inventory.
- Retrying the same request identifier and payload returns the existing confirmation. Reusing it with different contents is rejected.
- GET `/api/customer/catalog` is public and returns only product id, SKU, name and available quantity.
- POST `/api/customer/orders` is public and accepts requestId (UUID), customerName and up to 20 unique product lines with productId and quantity 1–10,000. It returns only reference and status. Staff inventory, customer lists and warehouse actions remain authenticated.

This is an order-request MVP. Payments, customer accounts, shipping addresses, delivery booking and customer self-service tracking are outside its current scope. The URLs above are local; cloud deployment remains separate.
