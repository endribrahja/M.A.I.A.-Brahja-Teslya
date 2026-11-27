"""Optional smoke test against a running MAIA instance backed by an isolated demo database."""
import os

from playwright.sync_api import sync_playwright

URL = os.getenv('MAIA_TEST_URL', 'http://127.0.0.1:8000')
PAGES = {
    'house': 'Abitazione virtuale',
    'assistant': 'Assistente dei consumi',
    'user': 'Il mio profilo',
    'water': 'Acqua',
    'gas': 'Gas',
    'meters': 'I miei contatori',
    'history': 'Storico letture',
    'bell': 'Notifiche',
    'settings': 'Impostazioni',
}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.set_default_timeout(20_000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL)
    page.get_by_role('button', name='Esplora la demo').click()
    page.get_by_role('heading', name='La tua casa, sotto controllo.').wait_for()
    for route, title in PAGES.items():
        page.evaluate('route => location.hash = route', route)
        page.get_by_role('heading', name=title, level=1, exact=True).wait_for()
    page.set_viewport_size({'width': 390, 'height': 844})
    page.get_by_role('button', name='Menu principale').click()
    page.get_by_role('navigation', name='Navigazione principale').wait_for()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors, errors
    browser.close()
