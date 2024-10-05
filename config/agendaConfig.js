const Agenda = require("agenda");
let configureMongoDBObj = {
    db: {
        address: env.mongoAtlasUri,
        collection: "agendaJobs",
        mongo: {
            useCreateIndex: true,
            useFindAndModify: false,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        },
    },
};
const agenda = new Agenda(configureMongoDBObj);
module.exports = agenda;