<?php

it('uses the dedicated mysql testing database', function () {
    expect(config('database.default'))->toBe('mysql')
        ->and(config('database.connections.mysql.host'))->toBe('127.0.0.1')
        ->and((string) config('database.connections.mysql.port'))->toBe('3306')
        ->and(config('database.connections.mysql.database'))->toBe('cafe_ai_pos_testing')
        ->and(config('database.connections.mysql.database'))->not->toBe('cafe_ai_pos')
        ->and(config('database.connections.mysql.username'))->toBe('root')
        ->and(config('database.connections.mysql.password'))->toBe('');
});
