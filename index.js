const puppeteer = require('puppeteer');
const settings = require('./settings.json');
const moment = require('moment');
const ics = require('ics');
const fs = require('fs');
const he = require('html-entities');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function pressEnter(page) {
    await page.keyboard.press(String.fromCharCode(13));
}

async function type(page, id, text) {
    await page.focus(id);
    await page.keyboard.type(text);
}

function parseDesc(text) {
    text = he.decode(text.replace(/\r\n/g, "").replace(/<br \/>/g, "\n")).split("\n");
    return [
        [text[0]], text[1], text.slice(2).join('\n')
    ]
}

(async() => {
    const browser = await puppeteer.launch({
        headless: true,
    });

    try {
        const page = await browser.newPage();

        await page.goto(settings.login_url);
        await type(page, settings.login_id, settings.login);
        await type(page, settings.passw_id, settings.password);
        await pressEnter(page);
    } catch (e) {
        console.log(e)
        return await browser.close();
    }

    page.on('response', async(res) => {
        if (res.url().startsWith(settings.response_url)) {
            let data = (await res.json()).map(x => { return { "start": moment(x.start).format('YYYY-M-D-H-m').split("-"), "end": moment(x.end).format('YYYY-M-D-H-m').split("-"), "description": parseDesc(x.description)[2], "title": parseDesc(x.description)[1], "categories": parseDesc(x.description)[0], "startOutputType": "local" } });
            ics.createEvents(data, async(e, v) => {
                if (!e) {
                    try {
                        await fs.writeFileSync(settings.ics_path, v);
                    } catch (error) {
                        console.log(error);
                    }
                } else {
                    console.log(e);
                }
                await browser.close();
            })
        }
    })
})();