const moduleConfig = [
    {
        "type": "delivery",
        "status": true,
        "apiVersion": "v1",
        "route": true,
        "routeName": "delivery"
    },
    {
        "type": "marketing",
        "status": true,
        "apiVersion": "v1",
        "route": true,
        "routeName": "campaign"
    },
    {
        "type": "postmates",
        "status": true,
        "route": false
    },
    {
        "type": "taxiApplication",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "trip"
    },
    {
        "type": "emergencyContact",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "ec"
    },
    {
        "type": "importExport",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "csv"
    },
    {
        "type": "menu",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "menu"
    },
    {
        "type": "orderDelivery",
        "apiVersion": "v2",
        "status": true,
        "route": true,
        "routeName": "order"
    },
    {
        "type": "geofencing",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "geofence"
    },
    {
        "type": "vendorDelivery",
        "apiVersion": "v2",
        "status": true,
        "route": true,
        "routeName": "vendor"
    },
    {
        "type": "orderDispute",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "dispute"
    },
    {
        "type": "dispatch",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "dispatch"
    },
    {
        "type": "serviceProvider",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "provider"
    },
    {
        "type": "airbnb",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "airbnb"
    },
    {
        "type": "carRental",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "carrental"
    },
    {
        "type": "pay360split",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "pay360"
    },
    {
        "type": "packageService",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "package"
    },
    {
        "type": "subscription",
        "apiVersion": "v1",
        "status": false,
        "route": false,
        "routeName": "subscription"
    }
]
module.exports = moduleConfig;