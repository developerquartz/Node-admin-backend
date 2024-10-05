const Store = require('../../models/storeTable');
const Terminology = require('../../models/terminologyTable');

module.exports = (agenda) => {
    agenda.define('check setup store', { priority: 'high', concurrency: 10 }, async function (job, done) {
        done();
        let data = job.attrs.data;
        console.log("store data", data);
        let getStore = await Store.findById(data.storeId)
            .populate({ path: 'storeType', select: 'storeType label storeVendorType status' })
            .populate({ path: 'logo' })
            .populate({ path: 'bannerImage' })
            .populate({ path: 'favIcon' })
            .populate({ path: 'plan.billingPlan' })
            .exec();

        helper.updateConfigStoreSetting(getStore);

        let processTerminology = await Terminology.findOne({ store: data.storeId, type: "customers", lang: "en" }).populate('store', 'domain')
        if (processTerminology)
            await helper.updateTerminologyScript(processTerminology)

    });
};