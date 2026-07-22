<?php
/**
 * Plugin Name: KENSŌ Multilingual MT Bridge
 * Description: Demo WordPress plugin — language switcher + REST locale param; machine translation filled via external Node MT API (OpenAI).
 * Version: 0.1.0
 * Author: Demo
 */

if (!defined('ABSPATH')) {
    exit;
}

define('KENSO_MT_API', getenv('KENSO_MT_API') ?: 'http://localhost:8787');

add_action('rest_api_init', function () {
    register_rest_route('kenso-mt/v1', '/home', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'args' => [
            'lang' => [
                'default' => 'ja',
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ],
        'callback' => function (WP_REST_Request $request) {
            $lang = $request->get_param('lang');
            $url = trailingslashit(KENSO_MT_API) . 'api/wp/v2/pages?lang=' . rawurlencode($lang);
            $response = wp_remote_get($url, ['timeout' => 20]);
            if (is_wp_error($response)) {
                return new WP_Error('mt_upstream', $response->get_error_message(), ['status' => 502]);
            }
            $code = wp_remote_retrieve_response_code($response);
            $body = json_decode(wp_remote_retrieve_body($response), true);
            return new WP_REST_Response($body, $code);
        },
    ]);
});

/**
 * Front-end language switcher (theme can call this).
 * Full page content still comes from ACF / Gutenberg; this demo proxies MT copy.
 */
function kenso_mt_language_switcher(array $locales = ['ja', 'en', 'zh', 'ko', 'th', 'vi']) {
    $current = isset($_GET['lang']) ? sanitize_text_field(wp_unslash($_GET['lang'])) : 'ja';
    echo '<nav class="kenso-lang" aria-label="Language">';
    foreach ($locales as $locale) {
        $url = esc_url(add_query_arg('lang', $locale));
        $active = $locale === $current ? ' aria-current="page"' : '';
        printf('<a href="%s"%s>%s</a> ', $url, $active, esc_html(strtoupper($locale)));
    }
    echo '</nav>';
}
