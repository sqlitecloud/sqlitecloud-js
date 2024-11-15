const { chromium, firefox, webkit } = require('playwright');

(async () => {
    [
        chromium,
        firefox,
        webkit
    ].forEach(async (browser) => {
        const window = await browser.launch();
        const context = await window.newContext();
        const page = await context.newPage();

        await page.goto(`file://${__dirname}/index.html`);

        const messageInput = await (page.locator('#messageInput')).inputValue();
        if (messageInput != 'USE DATABASE chinook.sqlite; select * from customers limit 3') throw Error('Invalid message input');

        await page.fill('#connectionStringInput', process.env.DATABASE_URL);
        await page.click('button#sendButton');

        //sleep 3s
        await new Promise(r => setTimeout(r, 3000));

        const messageOutput = await (page.locator('#messages')).allInnerTexts();
        if (messageOutput[0] != '[{"CustomerId":1,"FirstName":"Luís","LastName":"Gonçalves","Company":"Embraer - Empresa Brasileira de Aeronáutica S.A.","Address":"Av. Brigadeiro Faria Lima, 2170","City":"São José dos Campos","State":"SP","Country":"Brazil","PostalCode":"12227-000","Phone":"+55 (12) 3923-5555","Fax":"+55 (12) 3923-5566","Email":"luisg@embraer.com.br","SupportRepId":3},{"CustomerId":2,"FirstName":"Leonie","LastName":"Köhler","Company":null,"Address":"Theodor-Heuss-Straße 34","City":"Stuttgart","State":null,"Country":"Germany","PostalCode":"70174","Phone":"+49 0711 2842222","Fax":null,"Email":"leonekohler@surfeu.de","SupportRepId":5},{"CustomerId":3,"FirstName":"François","LastName":"Tremblay","Company":null,"Address":"1498 rue Bélanger","City":"Montréal","State":"QC","Country":"Canada","PostalCode":"H2G 1A7","Phone":"+1 (514) 721-4711","Fax":null,"Email":"ftremblay@gmail.com","SupportRepId":3}]\nconnected') throw Error('Invalid query result');

        console.log(`✅ ${browser.name()} with-javascript-browser test passed`);
        await window.close();
    });

})();