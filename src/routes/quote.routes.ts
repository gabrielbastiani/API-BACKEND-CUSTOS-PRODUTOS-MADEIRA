import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { createQuoteSchema, updateQuoteSchema, idParamSchema } from '../schemas/quote.schema';
import {
  createQuote,
  updateQuote,
  listQuotes,
  getQuote,
  deleteQuote,
  downloadQuotePdf,
} from '../controllers/quote.controller';

const router = Router();

router.post('/', validate(createQuoteSchema), createQuote);
router.get('/', listQuotes);
router.get('/:id', validate(idParamSchema), getQuote);
router.put('/:id', validate(updateQuoteSchema), updateQuote);
router.delete('/:id', validate(idParamSchema), deleteQuote);
router.get('/:id/pdf', validate(idParamSchema), downloadQuotePdf);

export default router;