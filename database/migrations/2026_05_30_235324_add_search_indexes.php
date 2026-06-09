<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE INDEX IF NOT EXISTS users_name_trgm ON users USING gin (name gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS users_username_trgm ON users USING gin (username gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS products_name_trgm ON products USING gin (name gin_trgm_ops)');
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS users_name_trgm');
        DB::statement('DROP INDEX IF EXISTS users_username_trgm');
        DB::statement('DROP INDEX IF EXISTS products_name_trgm');
    }
};