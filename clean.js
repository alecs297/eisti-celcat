const settings = require('./settings.json');
const moment = require('moment');
const fetch = require('node-fetch');
const ics = require('ics');
const fs = require('fs');
const he = require('html-entities');

const default_headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "accept-language": "en-US,en;q=0.9",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36"
}

function parseDesc(t) {
    t = he.decode(t.replace(/\r\n/g, "").replace(/<br \/>/g, "\n")).split("\n");
    return [
        [t[0]], t[1], t.slice(2).join('\n')
    ]
}

async function do_request(a, m = "GET", h = {}, p = null) {
    let r = await fetch(a, {
        headers: Object.assign(default_headers, h),
        method: m,
        redirect: "manual",
        body: m === "POST" ? p : null,
        query: m === "GET" ? p : null
    });
    return r;
}

function get_rf(t) {
    return t.split('<input name="__RequestVerificationToken" type="hidden" value="')[1].split('" /></form>')[0];
}

async function get_fid(t) {
    return (await t.text()).split("var federationIdStr = '")[1].split("'")[0];
}

async function get_antiforgerystuff() {
    let r = await do_request(settings.login_url);
    if (r.ok) {
        return [r.headers.get("set-cookie").split(";")[0], get_rf(await r.text())];
    }
}

function get_lc(r) {
    return r.headers.get("set-cookie").split(";")[0];
}

(async() => {
    console.log("Reaching website.");
    let af = await get_antiforgerystuff();
    console.log("Logging in...");
    let res = await do_request(settings.auth_url,
        "POST", {
            cookie: af[0],
            "content-type": "application/x-www-form-urlencoded"
        },
        `Name=${encodeURIComponent(settings.login)}&Password=${encodeURIComponent(settings.password)}&__RequestVerificationToken=${encodeURIComponent(af[1])}`
    );
    console.log("Extracting federation id");
    let fid = await get_fid(
        await do_request(settings.calendar_url, "GET", { cookie: `${af[0]};${get_lc(res)}` }, `vt=month`)
    );
    console.log("Extracting calendar data...");
    res = await do_request(settings.response_url, "POST", { cookie: `${af[0]};${get_lc(res)}` }, `start=1970-01-01&end=${moment().add(1, "year").format("YYYY")}-12-31&resType=104&calView=month&federationIds%5B%5D=${fid}`);
    console.log("Parsing data...");
    let data = (await res.json()).map(x => {
        return {
            "start": moment(x.start).format('YYYY-M-D-H-m').split("-"),
            "end": moment(x.end).format('YYYY-M-D-H-m').split("-").length > 2 ? moment(x.end).format('YYYY-M-D-H-m').split("-") : moment(x.start).add(1, 'h').format('YYYY-M-D-H-m').split("-"),
            "description": parseDesc(x.description)[2],
            "title": parseDesc(x.description)[1],
            "categories": parseDesc(x.description)[0],
            "startOutputType": "local"
        }
    });
    ics.createEvents(data, async(e, v) => {
        if (!e) {
            try {
                console.log('Writing ics...');
                await fs.writeFileSync(settings.ics_path, v);
                console.log('Saved to ' + settings.ics_path);
            } catch (e) {
                console.log(e);
            }
        } else {
            console.log(e);
        }
    })
})();