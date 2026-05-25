# Cafe AI POS

![Laravel](https://img.shields.io/badge/Laravel-13-red?logo=laravel)
![PHP](https://img.shields.io/badge/PHP-8.4-777BB4?logo=php)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Inertia](https://img.shields.io/badge/Inertia-v3-9553E9)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

**Cafe AI POS** is an enterprise-grade Point of Sale platform for cafes, restaurants, and retail food businesses. It combines a modern Laravel + Inertia React stack with AI-assisted selling, native Dynamic QRIS payments, inventory intelligence, role-based operations, and thermal receipt printing.

This project is designed as a professional portfolio-grade POS system: clean architecture, practical cashier workflow, scalable business modules, and production-minded implementation details.

---

## UI Showcase

> Replace these placeholders with screenshots from your local/demo deployment.

### POS Checkout

![POS Checkout](docs/screenshots/pos-checkout.png)

### AI Smart Command & Upsell

![AI Smart Command](docs/screenshots/ai-smart-command.png)

### Dynamic QRIS Payment

![Dynamic QRIS](docs/screenshots/dynamic-qris-payment.png)

### Owner Dashboard

![Owner Dashboard](docs/screenshots/owner-dashboard.png)

### Inventory & Reports

![Inventory Reports](docs/screenshots/inventory-reports.png)

---

## Key Features

### AI-Powered POS Workflow

- **AI Smart Command Bar**: cashiers can type natural language orders such as `2 iced latte less sugar and 1 fries`, then the system converts it into structured cart items.
- **AI Upsell Recommendation**: recommends complementary products already available in the catalog, helping increase average transaction value.
- **AI Menu Description Generator**: assists owners/admins in writing product descriptions.
- **AI Predictive Inventory Restock**: analyzes low-stock products and recent operational signals to suggest restock urgency.

### Native Dynamic QRIS Payment

- Stores the merchant QRIS base string in the database.
- Allows QRIS setup by uploading an existing QR image, decoded locally in the browser using `jsqr`.
- Generates a **dynamic QRIS payload per checkout amount**.
- Injects the transaction nominal into EMV tag `54`.
- Recalculates CRC16-CCITT-FALSE for a valid QRIS payload.
- No third-party payment gateway required for QR payload generation.

### Thermal Printer Integration

- 58mm receipt layout optimized for common cashier thermal printers.
- Auto-print after successful checkout.
- Browser-native `window.print()` flow, so it works with installed OS printer drivers.
- Clean receipt content: order code, service type, items, modifiers, totals, payments, and cashier context.

### POS & Operations

- Fast product grid with category-based product icons.
- Cart modifiers and add-ons.
- Multiple payment methods: cash, QRIS, card, transfer, and e-wallet.
- Dine-in, takeaway, and delivery context.
- Cashier shifts and reconciliation.
- Manager PIN approval for sensitive actions.
- Order history, refunds, split bill, and table movement.
- Kitchen display workflow.

### Inventory & Back Office

- Products, categories, raw materials, recipes, and modifiers.
- Stock movement tracking.
- Purchase and supplier management.
- Stock opname/adjustment workflow.
- Wastage recording.
- Low-stock dashboard insights.

### Reports & Governance

- Sales reports.
- Profit reports.
- Stock movement reports.
- Audit logs.
- Role-based navigation and access control.
- Separate owner/admin and cashier experience.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Laravel 13.11, PHP 8.4 |
| Frontend | React 19, TypeScript, Inertia v3 |
| Styling | Tailwind CSS v4, shadcn-style components |
| Database | MySQL for app runtime, SQLite supported for tests/dev templates |
| Auth | Laravel Fortify |
| AI | Laravel AI SDK v0.7 |
| Build Tool | Vite 8 |
| Testing | Pest 4 / PHPUnit 12 |
| Code Style | Laravel Pint, ESLint, Prettier |

---

## Requirements

- PHP 8.4+
- Composer
- Node.js 20+
- NPM
- MySQL or compatible database
- Web server/runtime supported by Laravel
- Optional: thermal printer installed on the operating system
- Optional: OpenAI API key for default AI features

---

## Installation

### 1. Clone repository

```bash
git clone https://github.com/your-username/cafe-ai-pos.git
cd cafe-ai-pos
```

### 2. Install backend dependencies

```bash
composer install
```

### 3. Install frontend dependencies

```bash
npm install
```

### 4. Create environment file

```bash
cp .env.example .env
```

On Windows Command Prompt:

```cmd
copy .env.example .env
```

### 5. Generate application key

```bash
php artisan key:generate
```

### 6. Configure database

Example MySQL configuration:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cafe_ai_pos
DB_USERNAME=root
DB_PASSWORD=
```

Create the database first, then run migrations and seeders:

```bash
php artisan migrate --seed
```

### 7. Start development server

Recommended full-stack development command:

```bash
composer run dev
```

This runs Laravel server, queue listener, and Vite development server together.

Alternative manual commands:

```bash
php artisan serve
npm run dev
php artisan queue:listen --tries=1
```

### 8. Build frontend assets for production

```bash
npm run build
```

---

## AI Engine Setup

The project uses the **Laravel AI SDK**. Based on the current `config/ai.php`, the default provider for text-based AI features is **OpenAI**.

### What AI powers in this POS

| Feature | Purpose |
| --- | --- |
| Smart Command Bar | Converts cashier natural language into cart items |
| AI Upsell | Suggests complementary products from active menu data |
| Menu Description Generator | Creates product descriptions for catalog management |
| Predictive Inventory | Suggests restock urgency for low-stock products |

### Minimal setup for AI features

Add this to `.env`:

```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_URL=https://api.openai.com/v1
```

Then clear config cache:

```bash
php artisan config:clear
```

Restart the development server after changing `.env`.

### Important note

Do **not** add `AI_PROVIDER` unless the application code is explicitly changed to read that variable. The current AI configuration uses:

```php
'default' => 'openai'
```

Therefore, the simplest working setup is `OPENAI_API_KEY`.

### Optional provider environment variables

The AI config also contains provider slots for advanced usage or future customization:

```env
ANTHROPIC_API_KEY=
ANTHROPIC_URL=

AZURE_OPENAI_API_KEY=
AZURE_OPENAI_URL=
AZURE_OPENAI_API_VERSION=
AZURE_OPENAI_DEPLOYMENT=
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=
AZURE_OPENAI_IMAGE_DEPLOYMENT=

AWS_BEDROCK_REGION=
AWS_BEARER_TOKEN_BEDROCK=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
AWS_USE_DEFAULT_CREDENTIALS=

COHERE_API_KEY=
DEEPSEEK_API_KEY=
ELEVENLABS_API_KEY=
GEMINI_API_KEY=
GEMINI_URL=
GROQ_API_KEY=
JINA_API_KEY=
MISTRAL_API_KEY=
OLLAMA_API_KEY=
OLLAMA_URL=
OPENAI_API_KEY=
OPENAI_URL=
OPENROUTER_API_KEY=
VOYAGEAI_API_KEY=
XAI_API_KEY=
```

Default media/provider mapping in the current configuration:

| Capability | Default Provider |
| --- | --- |
| Text agent prompts | OpenAI |
| Images | Gemini |
| Audio | OpenAI |
| Transcription | OpenAI |
| Embeddings | OpenAI |
| Reranking | Cohere |

### AI troubleshooting

If AI features fail:

1. Confirm `.env` contains `OPENAI_API_KEY`.
2. Run `php artisan config:clear`.
3. Restart `composer run dev`.
4. Confirm the account/API key has quota.
5. Check Laravel logs in `storage/logs`.

---

## QRIS Setup

1. Login as owner/admin.
2. Open payment settings.
3. Upload the merchant's static QRIS image.
4. Save settings.
5. At POS checkout, select QRIS payment.
6. The system generates a dynamic QRIS payload based on the checkout/payment amount.

The implementation is native and does not require an external QRIS gateway to generate the payload.

---

## Thermal Printer Setup

1. Install the thermal printer driver on the operating system.
2. Set paper width to 58mm in printer preferences.
3. Complete a checkout in the POS page.
4. Browser print dialog opens automatically.
5. Select the thermal printer.
6. Print receipt.

For kiosk-like operation, configure browser/printer silent printing according to the operating system and browser policy.

---

## Testing

Run the full test suite:

```bash
php artisan test --compact
```

Run a focused test file:

```bash
php artisan test --compact tests/Feature/PosCheckoutTest.php
```

Run frontend build validation:

```bash
npm run build
```

Format PHP changes:

```bash
vendor/bin/pint --dirty --format agent
```

---

## Production Notes

Before production deployment:

- Set `APP_ENV=production`.
- Set `APP_DEBUG=false`.
- Configure a production database.
- Configure queue workers.
- Configure mail/logging as needed.
- Run migrations.
- Build frontend assets.
- Cache config/routes/views where appropriate.
- Use HTTPS.
- Protect `.env` and server credentials.

Typical production preparation:

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## Project Highlights for Portfolio Review

This repository demonstrates:

- Full-stack Laravel + React architecture.
- Practical POS transaction workflow.
- AI integration in real cashier and back-office scenarios.
- Native EMV/QRIS payload manipulation with CRC validation.
- Hardware-aware receipt printing.
- Role-based UX and access control.
- Inventory, purchasing, stock opname, reports, and audit trail.
- Automated tests for business-critical modules.

---

## License

This project is open-sourced under the **MIT License**.

---

## Attribution

The Dynamic QRIS implementation concept is inspired by [`DanU-R/qris_tools`](https://github.com/DanU-R/qris_tools), then adapted into this Laravel/Inertia POS system with database-backed settings, browser-based QR decoding, checkout amount injection, and CRC regeneration.
