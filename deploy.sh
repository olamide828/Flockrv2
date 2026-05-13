#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Flockr — Zero-downtime deploy script
# Run from your CI/CD or via SSH: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

APP_DIR="/var/www/flockr"
cd $APP_DIR

echo "🚀 Starting deploy..."

# 1. Pull latest code
git pull origin main

# 2. Install/update PHP dependencies (no dev, optimise autoloader)
composer install --no-dev --optimize-autoloader --no-interaction

# 3. Clear and rebuild caches
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 4. Run migrations (safe — won't re-run applied ones)
php artisan migrate --force

# 5. Restart queue workers gracefully
#    (current jobs finish before workers stop)
php artisan queue:restart

# 6. Reload PHP-FPM (no downtime — graceful reload)
sudo systemctl reload php8.3-fpm

# 7. Restart Supervisor-managed workers
sudo supervisorctl restart flockr-worker-default:*
sudo supervisorctl restart flockr-worker-videos:*
sudo supervisorctl restart flockr-worker-ai:*
sudo supervisorctl restart flockr-scheduler

echo "✅ Deploy complete!"
