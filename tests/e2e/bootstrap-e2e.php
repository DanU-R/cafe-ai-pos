<?php

$database = getenv('DB_DATABASE') ?: 'cafe_ai_pos_e2e';
$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '3306';
$username = getenv('DB_USERNAME') ?: 'root';
$password = getenv('DB_PASSWORD') ?: null;

putenv('APP_ENV=e2e');
putenv('APP_URL='.(getenv('APP_URL') ?: 'http://127.0.0.1:8000'));
putenv('DB_CONNECTION=mysql');
putenv("DB_HOST={$host}");
putenv("DB_PORT={$port}");
putenv("DB_DATABASE={$database}");
putenv("DB_USERNAME={$username}");
putenv('DB_PASSWORD='.($password ?: ''));
putenv('SESSION_DRIVER=database');
putenv('CACHE_STORE=database');
putenv('QUEUE_CONNECTION=sync');
putenv('MAIL_MAILER=array');

$pdo = new PDO("mysql:host={$host};port={$port}", $username, $password ?: null);
$pdo->exec("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

passthru('php artisan config:clear --no-interaction', $configClearStatus);

if ($configClearStatus !== 0) {
    exit($configClearStatus);
}

passthru('php artisan db:wipe --database=mysql --drop-views --force --no-interaction', $wipeStatus);

if ($wipeStatus !== 0) {
    exit($wipeStatus);
}

passthru('php artisan migrate --force --no-interaction', $migrateStatus);

if ($migrateStatus !== 0) {
    exit($migrateStatus);
}

passthru('php artisan tinker --execute="App\\Models\\User::updateOrCreate([\'email\' => \'qa.e2e.cashier@example.test\'], [\'name\' => \'QA E2E Cashier\', \'password\' => Hash::make(\'password\'), \'email_verified_at\' => now()]);"', $seedStatus);

exit($seedStatus);
