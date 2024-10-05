const Coupon = require('../models/couponTable')

let globalPromoCode = async (data, query, projection) => {
  try {
    let couponData = await Coupon.find(query, projection)
      .populate({ path: 'geoFence', match: { status: "active" } })
      .populate({ path: 'storeType', match: { status: "active" } })
      .exec();
    //geoFence code here 
    if (data.customerLocation.length) {
      let obj_data = couponData.filter(item => {
        if (item.geoFence.length) {
          let geoFenceData = checkGeoFencing(data, item.geoFence);
          item.geoFence = geoFenceData;
          if (geoFenceData.length) {
            return item
          }
        } else {
          return item
        }
      })
      return obj_data
    }
    return couponData;
  } catch (error) {
    console.log("globalPromoCode-----", error)
  }
}
let globalTaxiCheck = async (data, geoFence) => {
  try {
    //geoFence code here 
    let obj = { isServiceProvide: false }
    if (data.customerLocation.length) {
      if (geoFence.length) {
        let geoFenceData = checkGeoFencing(data, geoFence);
        // venderData.geoFence = geoFenceData;
        if (geoFenceData.length) {
          obj.isServiceProvide = true
        }
        else {
          obj.isServiceProvide = false
        }
      } else {
        obj.isServiceProvide = true
      }
    }
    return obj;
  } catch (error) {
    console.log("globalPromoCode-----", error)
  }
}
let TaxiGeoFenceCheck = async (data, geoFence) => {
  try {
    //geoFence code here 
    let obj = []
    if (data.customerLocation.length) {
      if (geoFence.length) {
        let geoFenceData = checkGeoFencing(data, geoFence);
        if (geoFenceData.length) {
          return geoFenceData
        }
        else {
          obj = []
        }
      } else {
        obj = []
      }
    }
    return obj;
  } catch (error) {
    console.log("globalPromoCode-----", error)
  }
}
let globalVenderCheck = async (data, venderData) => {
  try {
    //geoFence code here 
    let obj = { isAccepteOrder: false }
    if (data.customerLocation.length) {
      if (venderData.geoFence.length) {
        let geoFenceData = checkGeoFencing(data, venderData.geoFence);
        venderData.geoFence = geoFenceData;
        if (geoFenceData.length) {
          obj.isAccepteOrder = true
        }
        else {
          obj.isAccepteOrder = false
        }
      } else {
        obj.isAccepteOrder = true
      }
    }
    return obj;
  } catch (error) {
    console.log("globalVenderCheck-----", error)
  }
}
let checkGeoFencing = (data, geoFence) => {
  try {
    return geoFence.filter((item) => {
      let radius = helper.getDeliveryArea(item.radius, data.unit);
      // check for point within radius
      if (item.location.type === "Point" && helper.isPointWithinRadius(data.customerLocation, item.location.coordinates[0][0], radius)) // check point is in radius or not
        return item


      if (item.location.type === "Polygon" && helper.isPointInPolygon(data.customerLocation, item.location.coordinates[0]))
        return item
    })
  } catch (error) {
    console.log("checkGeoFencing", error)
  }

}

module.exports = {
  globalPromoCode,
  globalVenderCheck,
  globalTaxiCheck,
  TaxiGeoFenceCheck
}