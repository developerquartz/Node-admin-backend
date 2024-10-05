const mongoose = require("mongoose")
const constants = require('../config/constants.json')
let slug = require("mongoose-slug-updater")
let { transliterate } = require('transliteration');
mongoose.plugin(slug)

let productSchema = mongoose.Schema(
  {
    storeType: { type: mongoose.Schema.Types.ObjectId, ref: "storeType" },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true },
    slug: { type: String, slug: "name", unique: true, lowercase: true, trim: true, transform: v => transliterate(v) },
    type: { type: String, enum: ["simple", "variable"] },
    veganType: { type: String, enum: ["veg", "nonveg"], default: "veg" },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active"
    },
    isFeatured: { type: Boolean },
    short_description: { type: String, trim: true },
    description: { type: String, trim: true },
    sku: { type: String, trim: true },
    price: { type: Number, default: 0 },
    compare_price: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    amenities: [{ type: mongoose.Schema.Types.ObjectId, ref: "Cuisine" }],
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Cuisine" },
    manage_stock: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
    stock_quantity: { type: Number },
    serviceTime: { type: Number, default: 0 },
    serviceUnit: { type: String, enum: constants.serviceUnit_enum, default: "min" },
    pricingType: { type: String, enum: constants.pricingType_enum, default: "unit" },
    stock_status: {
      type: String,
      enum: ["instock", "outofstock"],
      default: "instock",
    },
    total_sales: { type: Number },
    featured_image: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    attributes: { type: Array },
    related_products: { type: Array, default: [] },
    variations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "productVariation" },
    ],
    addons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Addon" }],
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "productReview" }],
    average_rating: { type: Number, default: 0 },
    rating_count: { type: Number, default: 0 },
    shippingCharge: { type: Number },
    seoSettings: {
      title: { type: String, default: null },
      metaDescription: { type: String, default: null },
      metaKeywords: { type: String, default: null },
      facebook: {
        title: { type: String, default: null },
        description: { type: String, default: null },
        image: { type: String, default: null }
      },
      twitter: {
        title: { type: String, default: null },
        description: { type: String, default: null },
        image: { type: String, default: null },
        username: { type: String, default: null },
      }
    },
    date_created: { type: Date },
    date_created_utc: { type: Date, default: new Date() },
    date_modified: { type: Date },
    date_modified_utc: { type: Date },
    guidelines: [{ type: Object }],
    meta_data: [
      {
        key: { type: String, trim: true },
        value: { type: String, trim: true },
      },
    ],
    guests: { type: Number },
    infants: { type: Number },
    beds: { type: String, enum: ["single", "double"] },
    rooms: { type: Number },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] }
    },
    address: { type: String },
    weight: { type: Number }
    //guestDetails: [{ type: Object }]
  },
  {
    versionKey: false, // You should be aware of the outcome after set to false
  }
)
productSchema.index({ location: "2dsphere" });

const productTable = (module.exports = mongoose.model("Product", productSchema))

//add product
module.exports.addProduct = function (data, callback) {
  data.date_created_utc = new Date()
  productTable.create(data, callback)
}
//add product
module.exports.addProductCSV = function (data) {
  data.date_created_utc = new Date()
  return productTable.findOneAndUpdate({ vendor: data.vendor, sku: data.sku }, { $set: data }, { upsert: true, new: true })
  // productTable.create(data, callback)

}
//add product
module.exports.addProductAsync = function (data) {
  data.date_created_utc = new Date()
  return productTable.create(data)
}
//add To Multiple Product
module.exports.addMultipleProduct = function (data, callback) {
  productTable.insertMany(data, callback);
}
//update product
module.exports.updateProduct = function (data, callback) {
  let query = { _id: data._id }
  productTable.findOneAndUpdate(query, data, { new: true }, callback)
}

module.exports.updateStatusByIds = (data, update, callback) => {
  let query = { _id: { $in: data._id } }
  productTable.updateMany(query, update, { new: true }, callback)
}

module.exports.getProductByCategoryIdAsync = (condition, categoryId, filter, callback) => {
  return productTable
    .find(
      {
        ...condition,
        categories: { $in: [categoryId] },
        status: "active",
        stock_status: "instock",
      },
      "name price bestSeller compare_price featured_image addons pricingType short_description veganType"
    )
    .sort({ [filter.sortByField]: parseInt(filter.sortOrder) })
    .lean()
    .populate({ path: "featured_image", select: "link" })
    .populate({
      path: "addons",
      match: { status: "active" },
      select: "name type minLimit maxLimit required options",
    })
    .exec(callback)
}
module.exports.getServicesForProviderAsync = (condition, filter, callback) => {
  return productTable
    .find(condition,
      "name price bestSeller compare_price featured_image pricingType short_description description"
    )
    .sort({ [filter.sortByField]: parseInt(filter.sortOrder) })
    .lean()
    .populate({ path: "featured_image", select: "link" })
    .exec(callback)
}
module.exports.getProductByConditionAsync = (condition, pageOptions) => {
  return productTable.find(
    condition,
    "name price bestSeller compare_price featured_image categories vendor addons average_rating rating_count short_description veganType variations storeType"
  )
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .sort({ date_created_utc: -1 })
    .populate({ path: "featured_image", select: "link" })
    .populate({ path: "storeType", select: "label storeType" })
    .populate({ path: "categories", select: "catName" })
    .populate({
      path: "variations"
    })
    .populate({
      path: "addons",
      match: { status: "active" },
      select: "name type minLimit maxLimit required options",
    })

}
//get product by id
module.exports.getProductById = (id, callback) => {
  productTable
    .findById(id)
    .populate({ path: "categories", match: { status: "active" } })
    .populate({ path: "featured_image" })
    .populate({ path: "images" })
    .populate({ path: "addons", match: { status: "active" } })
    .exec(callback)
}

module.exports.getProductByIdFood = (id, callback) => {
  productTable
    .findById(id)
    .populate({ path: "categories", match: { status: "active" } })
    .populate({ path: "featured_image" })
    .populate({ path: "addons", match: { status: "active" } })
    .exec(callback)
}


module.exports.getProductByIdCarRental = (id, callback) => {
  productTable
    .findById(id)
    .populate({ path: "categories", match: { status: "active" } })
    .populate({ path: "featured_image" })
    .populate({ path: "brand", match: { status: "active" } })
    .populate({ path: "vendor", select: "userLocation address" })
    .populate({ path: "images" })
    .populate({
      path: "addons", match: { status: "active" },
      populate: {
        path: "image",
        select: "link",
      }
    })
    .exec(callback)
}

module.exports.getProductByIdAirbnb = (id, callback) => {
  productTable
    .findById(id)
    .populate({ path: "categories" })
    .populate({ path: "featured_image" })
    .populate({ path: "amenities", match: { status: "active" } })
    .populate({ path: "images" })
    .populate({ path: "addons", match: { status: "active" } })
    .exec(callback)
}

module.exports.getProductByIdGrocery = (id, callback) => {
  productTable
    .findById(id)
    .populate({ path: "categories" })
    .populate({ path: "featured_image" })
    .populate({ path: "images" })
    .populate({ path: "variations" })
    .populate({ path: "brand" })
    .exec(callback)
}

module.exports.getProductByIdGroceryForFrontend = (id, callback) => {
  productTable
    .findById(
      id,
      "name weight pricingType bestSeller vendor status type manage_stock stock_quantity stock_status sku price compare_price short_description description categories featured_image images attributes variations brand reviews average_rating rating_count seoSettings"
    )
    .populate({
      path: "vendor",
      select: "minOrderAmont pricePerPerson orderPreparationTime",
    })
    .populate({
      path: "categories",
      select: "catName",
    })
    .populate({
      path: "featured_image",
      select: "link",
    })
    .populate({
      path: "images",
      select: "link",
    })
    .populate({
      path: "variations",
    })
    .populate({
      path: "brand",
      select: "name",
    })
    .populate({
      path: "reviews",
      perDocumentLimit: 10,
      populate: {
        path: "user",
        select: "name profileImage",
        populate: {
          path: "profileImage",
          select: "link",
        },
      },
    })
    .exec(callback)
}

module.exports.getProductByIdAsync = (id, callback) => {
  return productTable
    .findById(id)
    .populate({ path: "featured_image" })
    .exec(callback)
}
module.exports.getProductByIdNew = (id, callback) => {
  return productTable
    .findById(id).lean()
    .populate({ path: "featured_image", select: "link" })
    .populate({ path: "brand", select: "name status" })
    .populate({
      path: "addons",
      select: "name price image",
      match: { status: "active" },
      populate: {
        path: 'image',
        select: "link"
      }
    })
    .populate({ path: "vendor", select: "name email mobileNumber userLocation address" })
    .exec(callback)
}
module.exports.getProductForDelivery = (id, callback) => {
  return productTable
    .findById(id)
    .populate({
      path: "categories", match: { parent: "none" }
    })
    .exec(callback)
}

module.exports.getProductByIdForFood = (id, callback) => {
  return productTable
    .findById(id)
    .populate({ path: "featured_image" })
    .populate({ path: "categories", match: { 'parent': 'none' }, })
    .exec(callback)
}

module.exports.getProductBySlug = (id, callback) => {
  productTable
    .findOne({ slug: id })
    .populate({ path: "categories" })
    .populate({
      path: "customer",
      select:
        "name username profileImage location customerAvgRating rating_count",
      populate: {
        path: "reviews",
        populate: {
          path: "user",
          select: "name profileImage",
        },
      },
    })
    .populate({ path: "featured_image" })
    .populate({ path: "images" })
    .exec(callback)
}

//remove product
module.exports.removeProduct = (id, callback) => {
  var query = { _id: id }
  productTable.remove(query, callback)
}

module.exports.removeProductImage = (data) => {
  var query = { _id: data.productId }
  var ref = data.ref
  productTable.findOneAndUpdate(
    query,
    {
      $pull: {
        images: ref,
      },
    },
    { new: true },
    function (err, res) {
      if (err) {
        console.log(err)
      }
    }
  )
}

module.exports.getProductsListF = (
  obj,
  pageSize,
  sortByField,
  sortOrder,
  paged,
  callback
) => {
  productTable.aggregate(
    [
      { $match: obj },
      {
        $lookup: {
          from: "users",
          localField: "customer",
          foreignField: "_id",
          as: "customerDetails",
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "featured_image",
          foreignField: "_id",
          as: "featured_image",
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "images",
          foreignField: "_id",
          as: "images",
        },
      },
      { $sort: { [sortByField]: parseInt(sortOrder) } },
      { $skip: (paged - 1) * pageSize },
      { $limit: parseInt(pageSize) },
      {
        $unwind: { path: "$customerDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          price: 1,
          rrp: 1,
          size: 1,
          images: 1,
          featured_image: 1,
          customerDetails: { name: 1, username: 1, profileImage: 1 },
        },
      },
    ],
    callback
  )
}

module.exports.getProductsList = (
  obj,
  pageSize,
  sortByField,
  sortOrder,
  paged,
  callback
) => {
  productTable.aggregate(
    [
      { $match: obj },
      {
        $lookup: {
          from: "files",
          localField: "featured_image",
          foreignField: "_id",
          as: "featured_image",
        },
      },
      {
        $lookup: {
          from: "addons",
          localField: "addons",
          foreignField: "_id",
          as: "addons"
        }
      },
      {
        $lookup: {
          from: "productvariations",
          localField: "variations",
          foreignField: "_id",
          as: "variations"
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "categories",
          foreignField: "_id",
          as: "categories"
        }
      },
      { $sort: { [sortByField]: parseInt(sortOrder) } },
      { $skip: (paged - 1) * pageSize },
      { $limit: parseInt(pageSize) },
      {
        $unwind: { path: "$featured_image", preserveNullAndEmptyArrays: true },
      },
    ],
    callback
  )
}

module.exports.getProductsListForUser = (
  obj,
  pageSize,
  sortByField,
  sortOrder,
  paged,
  callback
) => {
  productTable.aggregate(
    [
      { $match: obj },
      {
        $lookup: {
          from: "cuisines",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "featured_image",
          foreignField: "_id",
          as: "featured_image",
        },
      },
      { $sort: { [sortByField]: parseInt(sortOrder) } },
      { $skip: (paged - 1) * pageSize },
      { $limit: parseInt(pageSize) },
      //{ "$unwind": "$vendorDetails" },
      {
        $unwind: { path: "$featured_image", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          price: 1,
          bestSeller: 1,
          compare_price: 1,
          featured_image: 1,
          average_rating: 1,
          rating_count: 1,
          stock_status: 1,
          brand: { name: 1 },
        },
      },
    ],
    callback
  )
}
module.exports.getProductsListForUserEcom = (
  obj,
  pageSize,
  sortByField,
  sortOrder,
  paged,
  callback
) => {
  productTable.aggregate(
    [
      { $match: obj },
      {
        $lookup: {
          from: "cuisines",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "featured_image",
          foreignField: "_id",
          as: "featured_image",
        },
      },
      { $sort: { [sortByField]: parseInt(sortOrder) } },
      { $skip: (paged - 1) * pageSize },
      { $limit: parseInt(pageSize) },
      //{ "$unwind": "$vendorDetails" },
      {
        $unwind: { path: "$featured_image", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          price: 1,
          bestSeller: 1,
          compare_price: 1,
          featured_image: 1,
          average_rating: 1,
          rating_count: 1,
          stock_status: 1,
          brand: { name: 1 },
          attributes: 1
        },
      },
    ],
    callback
  )
}

module.exports.updateReviewDetails = (data, callback) => {
  var query = { _id: data.productId }
  var update = {
    $push: {
      reviews: data.reviewId,
    },
    average_rating: data.average_rating,
    rating_count: data.rating_count,
  }
  productTable.findOneAndUpdate(query, update, { new: true }, callback)
}
module.exports.getProductsListServiceProvider = (
  obj,
  pageSize,
  sortByField,
  sortOrder,
  paged,
  storeId,
  source,
  maxDistance,
  callback
) => {
  productTable.aggregate([{

    $lookup: {

      from: "users",
      let: { storeId: storeId, service: "$_id" },
      pipeline: [
        {
          "$geoNear": {
            "near": source,
            "distanceField": "distance",
            "key": "userLocation",
            "spherical": true,
            "maxDistance": maxDistance,
            "query": { role: "DRIVER", serviceId: { $exists: true }, status: "approved", role: "DRIVER" }
          }
        },
        {
          $match: {
            $expr: {
              $and: [
                {
                  $eq: ["$store", "$$storeId"]
                },
                {
                  $in: ["$$service", "$serviceId"]
                }
              ]
            }
          }
        }
      ],
      as: "data"
    },
  },
  {
    $lookup: {

      from: "categories",
      let: { cat: "$categories" },
      pipeline: [
        {
          $match:
          {
            $expr:
            {
              $and:
                [
                  { $in: ["$_id", "$$cat"] }
                ]
            }
          }
        },
      ],
      as: "category"
    }

  },
  {
    $lookup: {

      from: "addons",
      let: { addon: "$addons" },
      pipeline: [
        {
          $match:
          {
            $expr:
            {
              $and:
                [
                  { $in: ["$_id", "$$addon"] },
                  { $eq: ["$status", "active"] }
                ]
            }
          }
        },
      ],
      as: "addons"
    }

  },
  {
    $lookup: {
      from: "files",
      localField: "featured_image",
      foreignField: "_id",
      as: "featur_img",
    }
  },
  {
    $unwind: { path: "$featur_img", preserveNullAndEmptyArrays: true }
  },
  {
    $addFields: {
      isAvalibale: { $cond: { if: { $eq: [{ $size: "$data" }, 0] }, then: false, else: true } }


    }
  },
  {
    $set: {
      featured_image: {
        $cond: [
          { $or: [{ $eq: [null, "$featured_image"] }, { $eq: ["", "$featured_image"] }] },
          null,
          "$featur_img"
        ]
      }
    }
  },
  { $unset: "featur_img" },
  { $unset: "data" },
  { $match: obj },
  { $skip: (paged - 1) * pageSize },
  { $limit: parseInt(pageSize) },
  { $sort: { [sortByField]: parseInt(sortOrder) } }], callback)
}

module.exports.getProductsDriver = (
  obj,
  sortByField,
  callback
) => {
  productTable.aggregate(
    [
      { $match: obj },
      {
        $lookup: {
          from: "cuisines",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      {
        $lookup: {
          from: "addons",
          localField: "addons",
          foreignField: "_id",
          as: "addons"
        }
      },
      {
        $lookup: {
          from: "files",
          localField: "featured_image",
          foreignField: "_id",
          as: "featur_img",
        },
      },
      {
        $unwind: { path: "$featur_img", preserveNullAndEmptyArrays: true }
      },
      sortByField,
      {
        $project: {
          _id: 1,
          name: 1,
          price: 1,
          bestSeller: 1,
          compare_price: 1,
          featured_image: {
            $cond: {
              if: { $or: [{ $eq: [null, "$featured_image"] }, { $eq: ["", "$featured_image"] }] },
              then: null,
              else: "$featur_img"
            }
          },
          average_rating: 1,
          rating_count: 1,
          brand: { name: 1 },
          addons: 1,
          short_description: 1,
          description: 1,
          pricingType: 1,
          serviceTime: 1
        },
      },
    ],
    callback
  )
}

module.exports.getNearByVendorsListAirbnb = (
  obj,
  query,
  pageSize,
  sortByField,
  sortOrder,
  paged,
  source,
  maxDistance,
  callback
) => {
  return productTable.aggregate(
    [
      {
        "$geoNear": {
          "near": source,
          "distanceField": "distance",
          key: "location",
          "spherical": true,
          "maxDistance": maxDistance,
          query: query,
        }
      },
      {
        $lookup: {

          from: "cuisines",
          let: { id: "$amenities" },
          pipeline: [
            {
              $match:
              {
                $expr:
                {
                  $and:
                    [
                      { $in: ["$_id", "$$id"] },
                      { $eq: ["$status", "active"] }
                    ]
                }
              }
            },
            {
              $lookup: {
                from: "files",
                localField: "image",
                foreignField: "_id",
                as: "image",
              }
            },
            {
              $unwind: { path: "$image" }
            },
          ],
          as: "amenities"
        }

      },
      {
        $lookup:
        {
          from: "files",
          localField: "images",
          foreignField: "_id",
          as: "images"
        }
      },
      {
        $lookup: {
          from: "files",
          localField: "featured_image",
          foreignField: "_id",
          as: "featur_img",
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "vendor",
          foreignField: "_id",
          as: "vendor",
        }
      },
      {
        $unwind: { path: "$vendor" }
      },
      {
        $unwind: { path: "$featur_img", preserveNullAndEmptyArrays: true }
      },
      {
        $set: {
          featured_image: {
            $cond: [
              { $or: [{ $eq: [null, "$featured_image"] }, { $eq: ["", "$featured_image"] }] },
              null,
              "$featur_img"
            ]
          }
        }
      },
      { $addFields: { "icons": constants.AIRBNB_ICONS } },


      { $unset: "featur_img" },
      { $match: obj },
      { $skip: (paged - 1) * pageSize },
      { $limit: parseInt(pageSize) },
      { $sort: { [sortByField]: parseInt(sortOrder) } }
    ], callback)
}
module.exports.getPopularProducts = async (query, callback) => {
  let select = await projection();
  return productTable.find(query, select)
    .populate("images", "link")
    .populate("vendor", "name address mobileNumber email")
    .populate("featured_image", "link")
    .populate("categories", "catName catDesc status")
    .populate({
      path: "amenities",
      select: "name image status",
      populate: {
        path: "image",
        select: "link"
      }
    })
    .sort({ average_rating: -1 })
    .exec(callback)
}
module.exports.getProductsAirbnbWithFilters = async (obj, sortByField, sortOrder, paged, pageSize, callback) => {
  let select = await projection();
  return productTable.find(obj, select)
    .populate("images", "link")
    .populate("vendor", "name address mobileNumber email")
    .populate("featured_image", "link")
    .populate({
      path: "categories",
      select: "name image catImage status",
      populate: {
        path: "catImage",
        select: "link"
      }
    })
    .populate({
      path: "amenities",
      select: "name image status",
      populate: {
        path: "image",
        select: "link"
      }
    })
    // { $addFields: { "icons": constants.AIRBNB_ICONS } },
    .sort({ [sortByField]: parseInt(sortOrder) })
    .skip((paged - 1) * pageSize)
    .limit(parseInt(pageSize))
    .exec(callback)
}
async function projection() {
  return { "icons": constants.AIRBNB_ICONS, name: 1, status: 1, price: 1, address: 1, average_rating: 1, guests: 1, infants: 1, beds: 1, rooms: 1, pricingType: 1 };

}