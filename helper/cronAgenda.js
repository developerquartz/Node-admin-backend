const agenda = require('../cron/agenda');

let agendaSchedule = async (schedule, job, data) => {
    try {
        console.log("job", job);
        agenda.schedule(schedule, job, data);
    } catch (error) {
        console.log("agendaSchedule", error);
    }
};

module.exports = {
    agendaSchedule
};