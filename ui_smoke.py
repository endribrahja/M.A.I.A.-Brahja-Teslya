"""Real browser smoke test. Start the app separately; use only an isolated demo DB."""
import os
from playwright.sync_api import sync_playwright
url=os.getenv('MAIA_TEST_URL','http://127.0.0.1:8000')
with sync_playwright() as p:
    browser=p.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url);page.get_by_role('button',name='Esplora la demo').click();page.get_by_role('heading',name='Budget e obiettivi').wait_for(timeout=20000)
    for k,title in [('analysis','Analisi e previsioni'),('budget','Budget e traguardi'),('house','Abitazione virtuale'),('assistant','Assistente dei consumi'),('user','Il mio profilo'),('water','Consumi acqua'),('gas','Consumi gas'),('meters','I miei contatori'),('history','Storico letture'),('bell','Notifiche'),('settings','Simulatore demo')]:
        page.locator(f'nav [data-page="{k}"]').click();page.get_by_role('heading',name=title,exact=True).wait_for(timeout=20000)
    page.locator('nav [data-page="assistant"]').click();page.locator('[data-question]').first.click();page.locator('.chat-bubble').nth(2).wait_for()
    page.locator('nav [data-page="house"]').click();page.locator('#new-home-form input').fill('Seconda casa demo');page.locator('#new-home-form button').click();page.wait_for_function('document.querySelectorAll("#active-home option").length===2')
    page.locator('nav [data-page="analysis"]').click();page.locator('#forecast-horizon').select_option('30');page.get_by_text('nei prossimi 30 giorni').first.wait_for();page.locator('.heat-cell').first.click()
    page.locator('[data-action=theme]').click();assert page.locator('html').get_attribute('data-theme')=='dark'
    page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
    assert not errors,errors;print('Smoke test browser completato.');browser.close()
