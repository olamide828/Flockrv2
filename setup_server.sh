#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Flockr — Server Setup Script (Ubuntu 22.04 / 24.04)
# Run as root: bash setup_server.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

APP_DIR="/var/www/flockr"
PHP_VERSION="8.3"

echo "══════════════════════════════════════════"
echo "  Flockr Server Setup"
echo "══════════════════════════════════════════"

# ── 1. System packages ────────────────────────────────────────────────────────
apt update && apt upgrade -y
apt install -y \
    curl wget git unzip \
    nginx supervisor \
    ffmpeg \
    redis-server \
    postgresql postgresql-contrib \
    software-properties-common

# ── 2. PHP 8.3 ───────────────────────────────────────────────────────────────
add-apt-repository ppa:ondrej/php -y
apt update
apt install -y \
    php${PHP_VERSION}-fpm \
    php${PHP_VERSION}-cli \
    php${PHP_VERSION}-pgsql \
    php${PHP_VERSION}-redis \
    php${PHP_VERSION}-mbstring \
    php${PHP_VERSION}-xml \
    php${PHP_VERSION}-curl \
    php${PHP_VERSION}-zip \
    php${PHP_VERSION}-gd \
    php${PHP_VERSION}-bcmath \
    php${PHP_VERSION}-intl \
    php${PHP_VERSION}-opcache

# ── 3. Composer ──────────────────────────────────────────────────────────────
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer
chmod +x /usr/local/bin/composer

# ── 4. PostgreSQL + pgvector ─────────────────────────────────────────────────
# pgvector — build from source (supports PG 16)
apt install -y postgresql-server-dev-all build-essential
cd /tmp
git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git
cd pgvector
make && make install
cd / && rm -rf /tmp/pgvector

# Create database
sudo -u postgres psql <<SQL
  CREATE USER flockr WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
  CREATE DATABASE flockr OWNER flockr;
  \c flockr
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- for LIKE-based text search fallback
SQL

# ── 5. Redis config ───────────────────────────────────────────────────────────
# Persist data to disk (good enough for queues; not a cache-only setup)
sed -i 's/^# *appendonly no/appendonly yes/' /etc/redis/redis.conf
sed -i 's/^appendonly no/appendonly yes/'    /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server

# ── 6. PHP-FPM tuning ────────────────────────────────────────────────────────
PHP_FPM_CONF="/etc/php/${PHP_VERSION}/fpm/pool.d/www.conf"
sed -i 's/^pm = dynamic/pm = dynamic/'               $PHP_FPM_CONF
sed -i 's/^pm.max_children = .*/pm.max_children = 20/'  $PHP_FPM_CONF
sed -i 's/^pm.start_servers = .*/pm.start_servers = 5/'  $PHP_FPM_CONF
sed -i 's/^pm.min_spare_servers = .*/pm.min_spare_servers = 3/' $PHP_FPM_CONF
sed -i 's/^pm.max_spare_servers = .*/pm.max_spare_servers = 10/' $PHP_FPM_CONF

PHP_INI="/etc/php/${PHP_VERSION}/fpm/php.ini"
sed -i 's/^upload_max_filesize = .*/upload_max_filesize = 500M/' $PHP_INI
sed -i 's/^post_max_size = .*/post_max_size = 510M/'            $PHP_INI
sed -i 's/^max_execution_time = .*/max_execution_time = 300/'   $PHP_INI
sed -i 's/^memory_limit = .*/memory_limit = 512M/'              $PHP_INI

systemctl restart php${PHP_VERSION}-fpm
systemctl enable  php${PHP_VERSION}-fpm

# ── 7. App directory + permissions ───────────────────────────────────────────
mkdir -p $APP_DIR
mkdir -p /var/log/flockr
chown -R www-data:www-data $APP_DIR /var/log/flockr

# ── 8. Nginx ─────────────────────────────────────────────────────────────────
# Copy your flockr.conf to /etc/nginx/sites-available/flockr, then:
# ln -s /etc/nginx/sites-available/flockr /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl enable nginx

# ── 9. Supervisor ─────────────────────────────────────────────────────────────
# Copy supervisor_flockr.conf to /etc/supervisor/conf.d/flockr.conf, then:
# supervisorctl reread && supervisorctl update
systemctl enable supervisor

# ── 10. Certbot (SSL) ─────────────────────────────────────────────────────────
apt install -y certbot python3-certbot-nginx
# Run manually after DNS is pointed:
# certbot --nginx -d flockr.ng -d www.flockr.ng

echo ""
echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "  1. Clone your repo to ${APP_DIR}"
echo "  2. Copy .env.example → .env and fill in values"
echo "  3. Run: composer install --no-dev --optimize-autoloader"
echo "  4. Run: php artisan migrate --force"
echo "  5. Run: php artisan storage:link"
echo "  6. Copy nginx/flockr.conf → /etc/nginx/sites-available/flockr"
echo "  7. Copy supervisor_flockr.conf → /etc/supervisor/conf.d/flockr.conf"
echo "  8. Run: sudo supervisorctl reread && sudo supervisorctl update"
echo "  9. Run: sudo certbot --nginx -d flockr.ng -d www.flockr.ng"
echo " 10. Change the PostgreSQL password in the DB and .env!"
