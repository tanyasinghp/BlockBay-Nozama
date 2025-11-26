const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listing.controller');

router.post('/', listingController.create);
router.get('/', listingController.get);
router.get('/:id', listingController.getById);
router.post('/:id/publish', listingController.publish);

module.exports = router;
