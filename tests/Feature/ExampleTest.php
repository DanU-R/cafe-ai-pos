<?php

test('redirects home guests to login', function () {
    $response = $this->get(route('home'));

    $response->assertRedirect(route('login'));
});
