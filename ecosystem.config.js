module.exports = {
    apps: [
        {
            name: "UZA-Admin-Api",
            script: "./app.js",
            watch: false,
            env_staging: {
                "PORT": process.env.PORT || 3090,
                "NODE_ENV": "staging"
            },
            env_production: {
                "PORT": process.env.PORT || 3090,
                "NODE_ENV": "production",
            }
        }
    ]
}