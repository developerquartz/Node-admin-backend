const env = {
    "jwtSecret": "ksksdkmv",
    "storeVersion": 2,
    "DOMAIN": "hlc-staging.com",
    "publicIp": "14.99.95.122",
    "favIcon": "605434e1eb99d4628e08ff21",
    "logo": "60534f40c3cdd556371e7ff6",
    "bannerImage": "5ffd69ca538cc66dd74714eb",
    "SEARCH_RADIUS": "20000",
    "version": 1.3,
    "terminologyLang": ["en", "fr", "es", "de", "it", "ru", "ht", "zh"],
    "mongoAtlasUri": "mongodb+srv://jaswindersuffescom:C4YDyUxhMwZsU5tf@iriba.51l9r3r.mongodb.net/BOK_TEST_DEV",
    "socketUrl": "https://bok-socket.suffescom.dev",
    "pay360BaseUrl": "https://secure.test.pay360evolve.com/api/v1/merchants/",
    "socketIp": "18.216.189.191",
    "socketUrlApi": "https://bok-socket.suffescom.dev/authenticationservice/api/v1/store",
    "apiUrl": "https://bok-api.suffescom.dev/authenticationservice/api/v1/",
    "apiBaseUrl": "https://bok-api.suffescom.dev",
    "adminPanelUrl": "https://non-profit-admin.suffescom.dev/",
    "deliveryApiUrl": "https://bok-api.suffescom.dev/authenticationservice/api/v1/delivery",
    "dnsUrl": "https://api.cloudflare.com/client/v4/zones/3c41ffcfb5e5fc0679bf9cc8ce32e80a/dns_records",
    "XAuthEmail": "waliaworking@gmail.com",
    "dnsRecordType": "A",
    "dnsIp": "3.22.91.123",
    "XAuthKey": "DrBNgpdnUca40weqt7Xho0O-vPFx9PWAJfO4Cg28",
    "updateSettings": "https://main.hlc-staging.com",
    "scriptUrl": "http://main.hlc-staging.com/exec.php?action=create&type=common&webname=",
    "scriptUrlDelete": "http://main.hlc-staging.com/exec.php?action=remove&type=common&webname=",
    "scriptUrlUpdate": "https://main.hlc-staging.com/exec.php?action=update-version&type=common&webname=",
    "poweredBy": "projectName",
    "poweredByLink": "https://projectName.com",
    "AWS": {
        "SECRET_ACCESS_KEY": "IkX+x/86MiA3o3SvtaEqT1zkhONnxSzrDxdOGwaA",
        "SECRET_ACCESS_ID": "AKIA2G6LZX5AM57H23LW",
        "REGION_NAME": "us-east-2",
        "BUCKET_NAME": "uza-ecomm"
    },
    "twilio": {
        "accountSid": "ACd6e9c6ce4740130315b2edb5fe042caa",
        "authToken": "23bb426d8f409fb7d3cdb1448dedb797",
        "twilioFrom": "+18622985101"
    },
    "mailgun": {
        "MAILGUN_API_KEY": "key-758aa69dd3ab8d90ee489d22d915ccfe",
        "MAILGUN_DOMAIN": "mg.ondemandcreations.com",
        "MAILGUN_FROM": "<no-reply@mg.ondemandcreations.com>"
    },
    "firebase": {
        "FCM_APIKEY": "AIzaSyBWTXLwHbMkUwDzlCfIg_mMVVDCOytWH58",
        "FCM_AUTHDOMAIN": "hyperlocalcloud-62422.firebaseapp.com",
        "FCM_DATABASEURL": "https://themesbrand-admin.firebaseio.com",
        "FCM_PROJECTID": "hyperlocalcloud-62422",
        "FCM_STORAGEBUCKET": "hyperlocalcloud-62422.appspot.com",
        "FCM_MESSAGINGSENDERID": "1022233967182",
        "FCM_APPID": "1:1022233967182:web:12fea9f1cc2778240d211f",
        "FCM_MEASUREMENTID": "G-YNXB6C952D",
        "FCM_CLIENT_EMAIL": "firebase-adminsdk-3szd8@hyperlocalcloud-62422.iam.gserviceaccount.com",
        "FCM_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDgXeG6mb0wCmFU\n/NjqiJK4NCasP+vVC+a6A5DgNc/H8oVrMoyGJX5kybYiCDPoXWnMkS3WZh59UUa4\nmF93eSojUoDQKG85AZz/RxEBumVxd2eDIyJ7joibgd+Le43wt+QxKDfGLEE8IDtH\nRvWrhnghHJW9QYeT6fgxECuj5cv9MiUp88CFVbSpOoxSHzzDQmdIGLbnBfXezrPo\nSAAm2jwOd9CIQaP+zyivrJYw2yAbNczrVygp2kAN66sML8iqw/X1JgTSFJ/aqNtt\nnA6Ha/SttnL4DrAb8QtAZZg+jiA4I39gdrb2s14BtaXEcbKTjkE5bndmlUPpWphg\nQeMz3aBRAgMBAAECggEAByqQe2qOK6LlPXbvAby3fPkzdAR9ppog9jeHcNXfK1qA\nbu5YJS+85AC6V8dtywHyz2UisuqjliqaqOo7AGCnGyY3NY7ZEJfP2Sp+rVC0DUX8\nUSi14P7qN5dUGcsqOzJQcE6By4td0QsRgaMPVTlwDFSypq8ZYrzSH9UNo8hC9fUM\n+YxadqSGSdI0LfCv9kXwigakmR/UABrglrOin5vXz0wP4cD/mIqmJt/D1t3leaSI\nuEPXS+KqhOcOx9KIse1+5Zic1JNrj0gdV7p875FW2iQ8K7mpRvhD+go7fAfgSIST\nnX4WU0MTf4SP1kT7DdU3K86U1ZvrPnsMXg2IgWfGEQKBgQD/8HDuLSUafH7x/wcm\nfZ6ITCV07Un9G1rKrJsf6WdVmRDgp7JuZIWevdlNg/LYYMH0/3uGhzYcEwrjfBaI\nPukPXHZOqcHAd/UlQBYfK4O/DISwCyJ7apzh0ZSvWOWs9yWJnrYerSruepmFtUXK\n0nhwXOjaNm+OVbgcPSXXwuKlWQKBgQDga4VzGwMGLsBu+6MHgmdTck/xvvqqKirY\nUNYFHRMW/mQxqlW/bW9lnoz3k2j09V5OJZM5OfVzIP64WflUa/Q85ZxOReOgSSao\nCoFroyxPAkH1USqT0wwS5IhiVleK1voXYVtawmATfLULv3SiCWQ1U4xK447PypJk\nCDdXLonbuQKBgFCEymKEHWopxJ5Jh2xalOd4XUhd5qsUUgn1J5Bwk6vgTej/mSkV\nwtvgCl9SpbHhLuPvBGOcYi+O5hwPS99tO1Ez25x/146/roYblVoVDIusWoov1pdR\nQS3iC47mvssdrdeP8OfRvvHr7CSelOhsMqvW7wLHoWz8FsH7ks5AZ6FxAoGBAIFS\ntJY+LKH1cwMBk1MSfISDzTnb+grxPbtl6c8MkCGh+w77v2oOoDEJCuboVYVDmFKk\nKJDDq4PqsZ5+isVxaE9naYlZkPCe9t3DIA1s/G2TOXsqiMSiy8RfWZCBfPUPKRMs\nET7d4Auaw6G/dHCjxNFOEfxd4cAwVee7LFjbAqpRAoGBANgWB3xHNnclJar+FXQD\n6gvRMTzFGsIWhDFFCbckRwPZhDJUbgZ45fi/4XeK/qTV+ZUbwkWzzb5DfoRkoFKc\nIEFxUEHIA+A7Ba2Pyw9fRpdHhnQiVMfyN/4Uzi/aBjQpiNbxvEX4hC5UcxgBlewU\nFMjb3Gy4i+ORYSndeJlkpnxb\n-----END PRIVATE KEY-----\n"
    },
    "godaddyApiKey": {
        "mode": "sandbox",
        "sandbox": {
            "apiUrl": "https://api.ote-godaddy.com/v1/domains/available?checkType=full&domain=",
            "key": "3mM44UbCEfZbmt_UCASWAMHQWYphRji11dxs5:GyCfsVrpKeEnVrRRzCzZ7w",
        },
        "production": {
            "apiUrl": "https://api.godaddy.com/v1/domains/available?checkType=full&domain=",
            "key": "9jUuBmZr5cC_WcqXVznLwfnpt45pTAatkY:EVYNSPTx1uyaQGV2DLkRFN"
        }
    },
    "superAdminStripe": {
        "paymentMode": "sandbox",
        "sandbox": {
            "Default_Payment_Gateway": "Stripe",
            "Stripe_Secret_Key": "sk_test_eVKHEY339013vNppEuuTgeQp00q67YON7C",
            "Stripe_Publishable_Key": "pk_test_4zW00pT258chn2DiHzYIArdT00Jb3KvIzt"
        },
        "live": {
            "Default_Payment_Gateway": "Stripe",
            "Stripe_Secret_Key": "sk_live_x5mrzZZg4GcVc74k58Jiz6Fs00ldUmZYZi",
            "Stripe_Publishable_Key": "pk_live_eWpwKaV2sU0ndLNRGZVMYRVv00kancanEK"
        }
    },
    "superAdminEmail": "admin@projectName.com",
    "GOOGLE_MAP_API_KEY": "AIzaSyC3Ad_McuVXJk7Un3OuyVqtXOG0GNAcCP8",
    "GOOGLE_MAP_API_KEY_WEB": "AIzaSyDpqPKddCcHajDOJOnwXTniNqLQ9x9UCww",
    "orangeMoneyAuthUrl": "https://api.orange.com/oauth/v3/token",
    "orangeMoneyTransactionUrl": "https://api.orange.com/orange-money-webpay/dev/v1/webpayment",
    "orangeMoneyLiveTransactionUrl": "https://api.orange.com/orange-money-webpay/sl/v1/webpayment",

    "import_csv_url": {
        "import_products_combined": "https://hlcstagings3.s3.us-east-2.amazonaws.com/1635166277917import_products_combined.csv",
        "import_products_FOOD": "https://hlcstagings3.s3.us-east-2.amazonaws.com/1635166337287import_products_FOOD.csv",
        "import_products": "https://hlcstagings3.s3.us-east-2.amazonaws.com/1635166359506import_products.csv",
        "import_productVariation": "https://hlcstagings3.s3.us-east-2.amazonaws.com/1635166376537import_productVariation.csv",
        "import_user": "https://hlcstagings3.s3.us-east-2.amazonaws.com/1635166398802import_user.csv",
        "import_vendor": "https://hlcstagings3.s3.us-east-2.amazonaws.com/1635166421130import_vendor.csv",
        "import_driver": "https://hlcstagings3.s3.us-east-2.amazonaws.com/1635166455043import_driver.csv"
    }


}

module.exports = env;