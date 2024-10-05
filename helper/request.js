const axios = require('axios');
const md5 = require('md5');
var FormData = require('form-data');

let updateDNS = async (domain) => {

    let dnsId = null;
    try {
        let request = await axios({
            method: 'post',
            url: env.dnsUrl,
            data: {
                type: env.dnsRecordType,
                name: domain,
                content: env.dnsIp,
                ttl: 120,
                priority: 10,
                proxied: true
            },
            headers: { Authorization: `Bearer ${env.XAuthKey}` }
        });

        //console.log("DNS Update success", request.data);

        if (request.data.success) {
            dnsId = request.data.result.id;
        } else {
            console.log("request.errors", request.errors);
            request.data.errors.forEach(element => {
                console.log("DNS Update err", element);
            });
        }
    } catch (error) {
        console.log("DNS Update error", error);
    }

    return dnsId;
}

let createLeadInHubspot = async (data) => {
    try {
        let obj = {};
        obj.full_name = data.name
        obj.email = data.email
        obj.mobile_number = data.mobileNumber
        obj.message = ''
        obj.utm_source = ''
        obj.utm_medium = ''
        obj.utm_campaign = ''
        obj.utm_term = ''
        obj.lead_type = 'hlc'
        obj.captcha_render = 'false'
        let query_string = Object.keys(obj).map(key => key + '=' + obj[key]).join('&')
        let url = md5('https://www.suffescom.com');
        var bodyFormData = new FormData();
        bodyFormData.append("params", query_string)
        bodyFormData.append("action", "create-lead")
        bodyFormData.append("apikey", url)
        let hubspotEndPoint = 'https://api.suffescom.com/app';
        let request = await axios({
            method: 'post',
            url: hubspotEndPoint,
            headers: {
                ...bodyFormData.getHeaders()
            },
            data: bodyFormData,
        });
    }
    catch (error) {
        console.log("createLeadInHubspot api error", error);
    }
}

let runScript = async (scriptUrl, store) => {
    try {
        let request2 = await axios({
            method: 'get',
            url: scriptUrl + store.domain
        });

        if (request2.data) {
            let data = request2.data;
            data.id = store._id;
            data.meta_data = [{ key: "storeName", value: store.storeName }, { key: "slug", value: store.slug }]
            return data;
        } else {
            return { status: "failure", message: "Script does not execute 404 not found" };
        }
    } catch (error) {
        //console.log("Script run error", error);
        return { status: "failure", message: "Script does not execute 404 not found" };
    }
}

let getIp = (req) => {
    let ip = (typeof req.headers['x-forwarded-for'] === 'string'
        && req.headers['x-forwarded-for'].split(',').shift())
        || req.connection.remoteAddress
        || req.socket.remoteAddress
        || req.connection.socket.remoteAddress;
    console.log("ip", ip);
    return ip;
}

module.exports = {
    updateDNS,
    runScript,
    createLeadInHubspot,
    getIp
}