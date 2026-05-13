# Flockr — Complete Setup Guide
> Follow this top to bottom. Don't skip steps.

---

## 1. Server Requirements

Your VPS should have:
- Ubuntu 22.04 or 24.04 LTS
- **Minimum**: 4GB RAM, 2 vCPUs, 80GB SSD
- **Recommended**: 8GB RAM, 4 vCPUs (needed for ffmpeg video processing)
- Providers: DigitalOcean, Hetzner, AWS EC2, Vultr

---

## 2. Run the Server Setup Script

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Upload and run the setup script
bash setup_server.sh
```

This installs: PHP 8.3, Nginx, PostgreSQL 16 + pgvector, Redis, Supervisor, ffmpeg, Composer, Certbot.

---

## 3. Clone Your Repo

```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/flockr.git flockr
cd flockr
chown -R www-data:www-data /var/www/flockr
```

---

## 4. Install PHP Dependencies

```bash
composer install --no-dev --optimize-autoloader
```

---

## 5. Configure .env

```bash
cp config/.env.production .env
```

Now fill in every value in `.env`. The ones you **must** do first:

| Variable | Where to get it |
|---|---|
| `APP_KEY` | Run `php artisan key:generate` |
| `DB_PASSWORD` | You set this during `setup_server.sh` |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |
| `JINA_API_KEY` | jina.ai → API → Get Key |
| `PAYSTACK_SECRET_KEY` | dashboard.paystack.com → Settings → API Keys |
| `PAYSTACK_PUBLIC_KEY` | Same page |
| `AWS_ACCESS_KEY_ID` | Cloudflare dash → R2 → Manage R2 API Tokens |
| `AWS_SECRET_ACCESS_KEY` | Same page |
| `AWS_ENDPOINT` | `https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com` |
| `R2_PUBLIC_URL` | Your R2 custom domain or public bucket URL |
| `REVERB_APP_KEY` | Run: `openssl rand -hex 16` |
| `REVERB_APP_SECRET` | Run: `openssl rand -hex 32` |
| `MAILGUN_DOMAIN` | mailgun.com → Sending → Domains |
| `MAILGUN_SECRET` | mailgun.com → Settings → API Keys |

---

## 6. Database Setup

```bash
# Run all migrations (creates tables + pgvector indexes)
php artisan migrate --force

# Seed categories and test data (optional but useful)
php artisan db:seed
```

---

## 7. Storage Link

```bash
# Links public/storage → storage/app/public (for local dev only)
php artisan storage:link
```

---

## 8. Build Frontend Assets

```bash
# Install Node dependencies
npm install

# Build for production
npm run build
```

**Node.js version required: 20+**
```bash
# Install Node 20 if not present
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 9. Configure Nginx

```bash
# Copy config
cp nginx/flockr.conf /etc/nginx/sites-available/flockr
ln -s /etc/nginx/sites-available/flockr /etc/nginx/sites-enabled/flockr
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Reload
systemctl reload nginx
```

---

## 10. Configure Supervisor (Queue Workers)

```bash
# Copy supervisor config
cp config/supervisor_flockr.conf /etc/supervisor/conf.d/flockr.conf

# Create log directory
mkdir -p /var/log/flockr
chown www-data:www-data /var/log/flockr

# Apply
supervisorctl reread
supervisorctl update
supervisorctl start all

# Check workers are running
supervisorctl status
```

---

## 11. SSL Certificate

```bash
# Point your domain DNS A record to your server IP first, then:
certbot --nginx -d flockr.ng -d www.flockr.ng

# Auto-renew is set up automatically by certbot
```

---

## 12. Paystack Webhook

In your Paystack dashboard:
- Go to **Settings → API Keys & Webhooks**
- Set webhook URL to: `https://flockr.ng/api/webhooks/paystack`
- Events to enable: `charge.success`, `transfer.success`, `transfer.failed`

---

## 13. Cloudflare R2 Setup

1. Go to `dash.cloudflare.com` → R2
2. Create a bucket named `flockr-media`
3. Set bucket to **Public** (or set up custom domain)
4. Go to **Manage R2 API Tokens** → Create Token
   - Permissions: Object Read & Write
   - Copy `Access Key ID` and `Secret Access Key` to `.env`
5. Set your custom domain (e.g. `media.flockr.ng`) in R2 → Settings → Custom Domains
6. Set `R2_PUBLIC_URL=https://media.flockr.ng` in `.env`

---

## 14. pgvector Verification

```bash
# Connect to your database and verify pgvector is installed
sudo -u postgres psql -d flockr -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';"
# Should output: 0.7.4 (or similar)
```

---

## 15. Test the Full Pipeline

```bash
# 1. Test queue workers are running
php artisan queue:monitor redis:default,videos,ai

# 2. Test Redis connection
php artisan tinker
>>> Cache::set('test', 'ok'); Cache::get('test'); // should return 'ok'

# 3. Test OpenAI
>>> app(App\Services\OpenAIService::class)->chat('Say hello in Yoruba')

# 4. Test Jina
>>> app(App\Services\JinaService::class)->embed('ankara dress')
# Should return a 1024-dim float array

# 5. Test Paystack
>>> app(App\Services\PaystackService::class)->listBanks()
# Should return list of Nigerian banks
```

---

## 16. Ongoing Deployments

```bash
# Every time you push new code:
bash deploy.sh
```

This script: pulls code → composer install → caches configs → runs migrations → restarts workers.

---

## Folder Structure (where your files go)

```
/var/www/flockr/
├── app/
│   ├── Http/
│   │   ├── Controllers/     ← All controllers go here
│   │   └── Middleware/      ← HandleInertiaRequests, RoleMiddleware
│   ├── Models/              ← All Eloquent models
│   ├── Events/              ← MessageSent etc
│   ├── Jobs/                ← ProcessVideoJob, GenerateProductDescriptionJob
│   ├── Notifications/       ← OrderPlacedNotification
│   ├── Providers/           ← AppServiceProvider
│   └── Services/            ← OpenAIService, JinaService, etc
├── bootstrap/
│   └── app.php              ← Laravel 11 bootstrap (middleware registered here)
├── config/
│   ├── flockr.php           ← Custom app config
│   ├── filesystems.php      ← R2/S3 disk config
│   └── services.php         ← API keys config
├── database/
│   └── migrations/          ← All migration files
├── resources/
│   ├── css/app.css          ← Global styles + design tokens
│   ├── js/
│   │   ├── app.jsx          ← Inertia bootstrap
│   │   ├── Pages/           ← All page components
│   │   ├── Components/      ← Shared UI components
│   │   ├── Layouts/         ← AppLayout
│   │   ├── hooks/           ← useVideoPlayer, useInfiniteScroll
│   │   └── lib/             ← echo.js
│   └── views/app.blade.php  ← Root blade template
├── routes/
│   ├── web.php              ← Inertia page routes
│   ├── api.php              ← JSON API routes
│   ├── channels.php         ← Reverb/Pusher channel auth
│   └── console.php          ← Scheduled tasks
├── nginx/flockr.conf        ← Nginx site config
├── config/supervisor_flockr.conf ← Supervisor workers
├── setup_server.sh          ← One-time server setup
├── deploy.sh                ← Deployment script
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Composer Packages to Install

```bash
composer require \
  inertiajs/inertia-laravel \
  laravel/sanctum \
  laravel/reverb \
  laravel/socialite \
  aws/aws-sdk-php \
  league/flysystem-aws-s3-v3
```

---

## Common Issues

**"vector type does not exist"**
→ pgvector wasn't installed. Run: `sudo -u postgres psql -d flockr -c "CREATE EXTENSION vector;"`

**Videos stuck in "processing"**
→ Check queue workers: `supervisorctl status`. Check logs: `tail -f /var/log/flockr/worker-videos.log`

**R2 uploads failing**
→ Check `AWS_ENDPOINT` includes `https://` and your account ID. Check bucket is public.

**Paystack webhook 400**
→ Check `PAYSTACK_SECRET_KEY` in `.env` matches your Paystack dashboard key exactly.

**Frontend not updating after deploy**
→ Run `npm run build` then `php artisan config:cache`
