import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { upload } from '../config/upload';
import {
  imageOwnerParamSchema,
  deleteImageParamSchema,
} from '../schemas/image.schema';
import { uploadImages, listImages, deleteImage } from '../controllers/image.controller';

const router = Router();

router.post(
  '/:ownerType/:ownerId',
  validate(imageOwnerParamSchema),
  upload.array('images', 10),
  uploadImages
);

router.get('/:ownerType/:ownerId', validate(imageOwnerParamSchema), listImages);

router.delete('/:imageId', validate(deleteImageParamSchema), deleteImage);

export default router;