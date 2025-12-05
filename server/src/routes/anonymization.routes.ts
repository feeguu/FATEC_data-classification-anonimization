import { Router } from 'express';
import { AnonymizationController } from '../controllers/anonymization.controller.ts';
import { AnonymizeUseCase } from '../usecases/anonymize.usecase.ts';

export const anonymizationRouter = Router();

const anonymizeUseCase = new AnonymizeUseCase();

const anonymizationController = new AnonymizationController(anonymizeUseCase);

anonymizationRouter.post("/anonymize", (req, res) => anonymizationController.anonymize(req, res));
