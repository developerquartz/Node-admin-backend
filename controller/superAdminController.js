const User = require("../models/userTable");
const Utils = require("../helper/utils");

module.exports = {

  storeLogin: async (req, res) => {
    const { storeToken } = req.body;
    try {
      const decoded = await Utils.verifyToken(storeToken);
      if (!decoded) {
        const resdata = helper.showValidationErrorResponse('INVALID_TOKEN');
        resdata.isInvalidToken = true;

        return res.json(resdata);
      }

      const getUser = await User.getUserByIdAsync(decoded._id);
      if (!getUser) {
        return res.json(
          helper.showValidationErrorResponse("USER_NOT_AVAILABLE")
        );
      }

      const token = Utils.generateToken(getUser);

      if (getUser.tokens == null) {
        getUser.tokens = token;
      }
      getUser.tokens = getUser.tokens.concat({ token });
      User.updateToken(getUser, (err, mytoken) => {
        if (err) {
          return res.json(
            helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err)
          );
        } else {
          const getstoreType = mytoken.storeType.filter((storeType) => {
            return storeType.status === "active";
          });
          mytoken.set("storeTypeEnabled", getstoreType, { strict: false });
          let resdata = helper.showSuccessResponse("LOGIN_SUCCESS", mytoken);
          resdata.token = token;
          return res.json(resdata);
        }
      });
    } catch (error) {
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  }
};
