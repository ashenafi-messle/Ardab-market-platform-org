// ==============================================================================
// Ardab Market - Customer Address Routes
// ==============================================================================

import { Router } from 'express';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  listAddressesHandler,
  getAddressByIdHandler,
  createAddressHandler,
  updateAddressHandler,
  setDefaultAddressHandler,
  deleteAddressHandler,
} from '../controllers/address.controller.js';
import {
  addressIdParamSchema,
  createAddressSchema,
  updateAddressSchema,
} from '../validators/address.validator.js';

const router = Router();

// All address routes require authenticated customer
router.use(customerAuthMiddleware);

/**
 * @route   GET /api/customer/addresses
 * @desc    Get all addresses for authenticated customer
 */
router.get('/', asyncHandler(listAddressesHandler));

/**
 * @route   POST /api/customer/addresses
 * @desc    Create a new address
 */
router.post(
  '/',
  validate({ body: createAddressSchema }),
  asyncHandler(createAddressHandler)
);

/**
 * @route   GET /api/customer/addresses/:addressId
 * @desc    Get specific address
 */
router.get(
  '/:addressId',
  validate({ params: addressIdParamSchema }),
  asyncHandler(getAddressByIdHandler)
);

/**
 * @route   PATCH /api/customer/addresses/:addressId/default
 * @desc    Set address as default
 */
router.patch(
  '/:addressId/default',
  validate({ params: addressIdParamSchema }),
  asyncHandler(setDefaultAddressHandler)
);

/**
 * @route   PATCH /api/customer/addresses/:addressId
 * @desc    Update address
 */
router.patch(
  '/:addressId',
  validate({ params: addressIdParamSchema, body: updateAddressSchema }),
  asyncHandler(updateAddressHandler)
);

/**
 * @route   DELETE /api/customer/addresses/:addressId
 * @desc    Delete address
 */
router.delete(
  '/:addressId',
  validate({ params: addressIdParamSchema }),
  asyncHandler(deleteAddressHandler)
);

export default router;
