const express = require("express");
const router = express.Router();
const tokensController = require("../controllers/tokens.controller");

router.get("/keypad", tokensController.generateToken);
router.get("/checkStack", tokensController.checkStack);
router.post("/store", tokensController.storeToken);
router.post("/display", tokensController.displayToken);
router.post("/recall", tokensController.recallToken);
router.post("/reassign", tokensController.reassignToken);

module.exports = router;
