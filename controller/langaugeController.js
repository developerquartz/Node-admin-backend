const LocaleCode = require('locale-code');
const isocountrycurrency = require('iso-country-currency');
const ct = require('countries-and-timezones');
const Language = require('../models/languageTable')

module.exports = {

    getLanguageList: async (req, res) => {
        try {
            Language.getAllLanguages((err, resdata) => {
                if (err) {
                    return res.status(500).json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata.length === 0) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', []));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }

                }
            });
        }
        catch (err) {
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getEnabledLanguageList: async (req, res) => {
        try {
            Language.getEnabledLanguages((err, resdata) => {
                if (err) {
                    return res.status(500).json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata.length === 0) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', []));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }

                }
            });
        }
        catch (err) {
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addLanguageData: async (req, res) => {
        try {
            var data = req.body;

            if (!data.languageName) {
                return res.status(400).json(helper.showValidationErrorResponse('LANGUAGE_NAME_IS_REQUIRED'));
            };

            if (!data.localeCode) {
                return res.status(400).json(helper.showValidationErrorResponse('LANGUAGE_CODE_IS_REQUIRED'));
            };

            if (!LocaleCode.validateLanguageCode(data.localeCode)) {
                return res.status(400).json(helper.showValidationErrorResponse('LANGUAGE_CODE_INVALID'));
            }

            data.languageCode = LocaleCode.getLanguageCode(data.localeCode); // 'en'
            var checkLanguage = await Language.getLanguageByLocaleCode(data.localeCode);
            if (checkLanguage != null) {
                return res.status(400).json(helper.showValidationErrorResponse('LANGUAGE_ALREADY_EXISTS'));
            }
            data.languageName = LocaleCode.getLanguageName(data.localeCode); // 'Chinese'
            data.languageNativeName = LocaleCode.getLanguageNativeName(data.localeCode); //'中文'
            data.countryCode = LocaleCode.getCountryCode(data.localeCode); // 'US'
            data.countryName = LocaleCode.getCountryName(data.localeCode); // 'United States'
            data.status = "active";
            data.countryCode = data.countryCode;
            data.currency = isocountrycurrency.getAllInfoByISO(data.countryCode);
            const country = ct.getCountry(data.countryCode);
            data.timezones = country.timezones;
            data.flagUrl = "https://countryflag.s3.us-east-2.amazonaws.com/" + data.countryCode.toLowerCase() + ".png";

            //console.log("data", data);

            Language.addLanguage(data, (err, resdata) => {
                if (err) {
                    return res.status(500).json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getLanguageDetailsById: async (req, res) => {
        try {
            var id = req.params._id;

            if (!id) {
                return res.status(400).json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            Language.getLanguageById(id, (err, resdata) => {
                if (err) {
                    return res.status(500).json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata === null) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', []));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });

        } catch (error) {
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateLanguageData: async (req, res) => {
        try {
            var data = req.body;

            if (!data.languageId) {
                return res.status(400).json(helper.showValidationErrorResponse('LANGUAGE_ID_IS_REQUIRED'));
            }

            if (!data.languageName) {
                return res.status(400).json(helper.showValidationErrorResponse('LANGUAGE_NAME_IS_REQUIRED'));
            };

            if (!data.languageCode) {
                return res.status(400).json(helper.showValidationErrorResponse('LANGUAGE_CODE_IS_REQUIRED'));
            };

            Language.updateLanguage(data, (err, resdata) => {
                if (err) {
                    return res.status(500).json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_UPDATED_SUCCESS', resdata));
                }
            });

        } catch (error) {
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }

    },

    removeLanguageData: async (req, res) => {
        try {
            var data = req.body;

            if (!data.languageId) {
                return res.status(400).json(helper.showValidationErrorResponse('LANGUAGE_ID_IS_REQUIRED'));
            }

            Language.removeLanguage(data.languageId, (err, resdata) => {
                if (err) {
                    return res.status(500).json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });

        } catch (error) {
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    gatLanguagesCode: async (req, res) => {
        try {

            var languages = [
                // { "af": "Afrikaans" },
                // { "sq": "Albanian" },
                // { "am": "Amharic" },
                // { "ar-DZ": "Arabic - Algeria" },
                // { "ar-BH": "Arabic - Bahrain" },
                // { "ar-EG": "Arabic - Egypt" },
                // { "ar-IQ": "Arabic - Iraq" },
                // { "ar-JO": "Arabic - Jordan" },
                // { "ar-KW": "Arabic - Kuwait" },
                // { "ar-LB": "Arabic - Lebanon" },
                // { "ar-LY": "Arabic - Libya" },
                // { "ar-MA": "Arabic - Morocco" },
                // { "ar-OM": "Arabic - Oman" },
                // { "ar-QA": "Arabic - Qatar" },
                // { "ar-SA": "Arabic - Saudi Arabia" },
                // { "ar-SY": "Arabic - Syria" },
                // { "ar-TN": "Arabic - Tunisia" },
                // { "ar-AE": "Arabic - United Arab Emirates" },
                // { "ar-YE": "Arabic - Yemen" },
                // { "hy": "Armenian" },
                // { "as": "Assamese" },
                // { "az-AZ": "Azeri - Cyrillic" },
                // { "eu": "Basque" },
                // { "be": "Belarusian" },
                // { "bn": "Bengali - Bangladesh" },
                // { "bs": "Bosnian" },
                // { "bg": "Bulgarian" },
                // { "my": "Burmese" },
                // { "ca": "Catalan" },
                { "zh-CN": "Chinese - China" },
                // { "zh-HK": "Chinese - Hong Kong SAR" },
                // { "zh-MO": "Chinese - Macau SAR" },
                // { "zh-SG": "Chinese - Singapore" },
                // { "zh-TW": "Chinese - Taiwan" },
                // { "hr": "Croatian" },
                // { "cs": "Czech" },
                // { "da": "Danish" },
                // { "dv": "Divehi; Dhivehi; Maldivian" },
                //{ "nl-BE": "Dutch - Belgium" },
                { "nl-NL": "Dutch - Netherlands" },
                // { "en-AU": "English - Australia" },
                // { "en-BZ": "English - Belize" },
                // { "en-CA": "English - Canada" },
                // { "en-CB": "English - Caribbean" },
                // { "en-GB": "English - Great Britain" },
                // { "en-IN": "English - India" },
                // { "en-IE": "English - Ireland" },
                // { "en-JM": "English - Jamaica" },
                // { "en-NZ": "English - New Zealand" },
                // { "en-PH": "English - Phillippines" },
                // { "en-ZA": "English - Southern Africa" },
                // { "en-TT": "English - Trinidad" },
                { "en-US": "English - United States" },
                // { "et": "Estonian" },
                // { "fo": "Faroese" },
                // { "fa": "Farsi - Persian" },
                // { "fi": "Finnish" },
                // { "fr-BE": "French - Belgium" },
                // { "fr-CA": "French - Canada" },
                { "fr-FR": "French - France" },
                // { "fr-LU": "French - Luxembourg" },
                // { "fr-CH": "French - Switzerland" },
                // { "mk": "FYRO Macedonia" },
                // { "gd-IE": "Gaelic - Ireland" },
                // { "gd": "Gaelic - Scotland" },
                // { "de-AT": "German - Austria" },
                { "de-DE": "German - Germany" },
                // { "de-LI": "German - Liechtenstein" },
                // { "de-LU": "German - Luxembourg" },
                // { "de-CH": "German - Switzerland" },
                // { "el": "Greek" },
                // { "gn": "Guarani - Paraguay" },
                // { "gu": "Gujarati" },
                { "he": "Hebrew" },
                { "hi": "Hindi" },
                { "hu": "Hungarian" },
                //{ "is": "Icelandic" },
                //{ "id": "Indonesian" },
                { "it-IT": "Italian - Italy" },
                //{ "it-CH": "Italian - Switzerland" },
                { "ja": "Japanese" },
                // { "kn": "Kannada" },
                // { "ks": "Kashmiri" },
                // { "kk": "Kazakh" },
                // { "km": "Khmer" },
                // { "ko": "Korean" },
                // { "lo": "Lao" },
                // { "la": "Latin" },
                // { "lv": "Latvian" },
                // { "lt": "Lithuanian" },
                // { "ms-BN": "Malay - Brunei" },
                // { "ms-MY": "Malay - Malaysia" },
                // { "ml": "Malayalam" },
                // { "mt": "Maltese" },
                // { "mi": "Maori" },
                // { "mr": "Marathi" },
                // { "mn": "Mongolian" },
                // { "ne": "Nepali" },
                // { "no-NO": "Norwegian - Bokml" },
                // { "or": "Oriya" },
                // { "pl": "Polish" },
                // { "pt-BR": "Portuguese - Brazil" },
                { "pt-PT": "Portuguese - Portugal" },
                // { "pa": "Punjabi" },
                // { "rm": "Raeto-Romance" },
                // { "ro-MO": "Romanian - Moldova" },
                // { "ro": "Romanian - Romania" },
                // { "ru": "Russian" },
                // { "ru-MO": "Russian - Moldova" },
                // { "sa": "Sanskrit" },
                // { "sr-SP": "Serbian - Cyrillic" },
                // { "tn": "Setsuana" },
                // { "sd": "Sindhi" },
                // { "si": "Sinhala; Sinhalese" },
                // { "sk": "Slovak" },
                // { "sl": "Slovenian" },
                // { "so": "Somali" },
                // { "sb": "Sorbian" },
                // { "es-AR": "Spanish - Argentina" },
                // { "es-BO": "Spanish - Bolivia" },
                // { "es-CL": "Spanish - Chile" },
                // { "es-CO": "Spanish - Colombia" },
                // { "es-CR": "Spanish - Costa Rica" },
                // { "es-DO": "Spanish - Dominican Republic" },
                // { "es-EC": "Spanish - Ecuador" },
                // { "es-SV": "Spanish - El Salvador" },
                // { "es-GT": "Spanish - Guatemala" },
                // { "es-HN": "Spanish - Honduras" },
                // { "es-MX": "Spanish - Mexico" },
                // { "es-NI": "Spanish - Nicaragua" },
                // { "es-PA": "Spanish - Panama" },
                // { "es-PY": "Spanish - Paraguay" },
                // { "es-PE": "Spanish - Peru" },
                // { "es-PR": "Spanish - Puerto Rico" },
                { "es-ES": "Spanish" },
                // { "es-ES": "Spanish - Spain (Traditional)" },
                // { "es-UY": "Spanish - Uruguay" },
                // { "es-VE": "Spanish - Venezuela" },
                // { "sw": "Swahili" },
                // { "sv-FI": "Swedish - Finland" },
                { "sv-SE": "Swedish - Sweden" },
                // { "tg": "Tajik" },
                // { "ta": "Tamil" },
                // { "tt": "Tatar" },
                // { "te": "Telugu" },
                // { "th": "Thai" },
                // { "bo": "Tibetan" },
                // { "ts": "Tsonga" },
                // { "tr": "Turkish" },
                // { "tk": "Turkmen" },
                // { "uk": "Ukrainian" },
                // { "ur": "Urdu" },
                // { "uz-UZ": "Uzbek - Cyrillic" },
                // { "vi": "Vietnamese" },
                // { "cy": "Welsh" },
                // { "xh": "Xhosa" },
                // { "yi": "Yiddish" },
                // { "zu": "Zulu" }
            ];

            //console.log(languages[0]);

            res.json(helper.showSuccessResponse('DATA_SUCCESS', languages));
        } catch (error) {
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}