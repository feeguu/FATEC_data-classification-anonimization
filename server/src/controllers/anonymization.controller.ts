import type { Request, Response } from "express";
import type { AnonymizeRequestDto } from "./dtos/anonymize.request.dto.ts";
import type { AnonymizeUseCase } from "../usecases/anonymize.usecase.ts";

export class AnonymizationController {
    private anonymizeUseCase: AnonymizeUseCase;
    constructor(anonymizationUseCase: AnonymizeUseCase) {
        this.anonymizeUseCase = anonymizationUseCase;
    }

    public async anonymize(req: Request<{}, {}, AnonymizeRequestDto>, res: Response) {
        const result = await this.anonymizeUseCase.execute(req.body.text);
        res.json(result);
    }
}