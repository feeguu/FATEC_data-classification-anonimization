// Types and Interfaces
type EntityType = 
    | 'PERSON_NAME'
    | 'ADDRESS'
    | 'PHONE_NUMBER'
    | 'EMAIL'
    | 'DOCUMENT_ID'
    | 'ORGANIZATION'
    | 'LOCATION'
    | 'DATE'
    | 'OTHER_SENSITIVE_DATA';

const ENTITY_TYPES = {
    PERSON_NAME: 'PERSON_NAME',
    ADDRESS: 'ADDRESS',
    PHONE_NUMBER: 'PHONE_NUMBER',
    EMAIL: 'EMAIL',
    DOCUMENT_ID: 'DOCUMENT_ID',
    ORGANIZATION: 'ORGANIZATION',
    LOCATION: 'LOCATION',
    DATE: 'DATE',
    OTHER_SENSITIVE_DATA: 'OTHER_SENSITIVE_DATA'
} as const;

interface Entity {
    text: string;
    type: EntityType;
}

interface EntitiesResponse {
    entities: Entity[];
}

interface OllamaResponse {
    response: string;
}

interface AnonymizationResult {
    originalText: string;
    anonymizedText: string;
    entities: Entity[];
    replacementMap: Record<string, string>;
}

type EntityCounters = Record<EntityType, number>;
type ReplacementMap = Record<string, string>;

export class AnonymizeUseCase {
    private readonly ollamaUrl: string;
    private readonly modelName: string;

    constructor(
        ollamaUrl: string = "http://localhost:11434/api/generate",
        modelName: string = "gemma3:1b"
    ) {
        this.ollamaUrl = ollamaUrl;
        this.modelName = modelName;
    }

    public async execute(inputText: string): Promise<AnonymizationResult> {

        const PROMPT_TEMPLATE = `
        You are an entity extraction engine designed to detect and classify personally identifiable information (PII) in free-form text.

        Your task:
        1. Identify all spans in the input text that contain any type of PII.
        2. Classify each detected entity into one of the following categories:
        - PERSON_NAME
        - ADDRESS
        - PHONE_NUMBER
        - EMAIL
        - DOCUMENT_ID (including: CPF, RG, SSN, passport, driver’s license)
        - ORGANIZATION
        - LOCATION (any place not strictly an address)
        - DATE
        - OTHER_SENSITIVE_DATA

        3. Return the results ONLY in JSON format following this structure:
        {
            "entities": [
            {
                "text": "<exact text extracted>",
                "type": "<entity type>"
            }
            ]
        }

        Important instructions:
        - DO NOT rewrite or transform the input text.
        - DO NOT anonymize or pseudonymize anything — only detect entities.
        - DO NOT generate new information or hallucinate entities.
        - If no PII is found, return: {"entities": []}
        - Keep the output strictly as JSON with no explanations.

        Input text:
        """
        ${inputText}
        """
        `;

        try {
            const res = await fetch(this.ollamaUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: this.modelName,
                    prompt: PROMPT_TEMPLATE,
                    stream: false
                }),
            });

            if (!res.ok) {
                throw new Error(`Ollama API request failed with status ${res.status}`);
            }

            const data = await res.json() as OllamaResponse;
            const entities = this.parseEntitiesResponse(data.response);

            return this.anonymize(inputText, entities);
        } catch (error) {
            throw new Error(`Failed to anonymize text: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private parseEntitiesResponse(rawResponse: string): Entity[] {
        const cleanedResponse = rawResponse
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        const parsedResponse = JSON.parse(cleanedResponse) as EntitiesResponse;
        return parsedResponse.entities || [];
    }

    private anonymize(inputText: string, entities: Entity[]): AnonymizationResult {
        let output = inputText;
        const replacementMap: ReplacementMap = {};
        const counters: EntityCounters = {
            PERSON_NAME: 1,
            ADDRESS: 1,
            PHONE_NUMBER: 1,
            EMAIL: 1,
            DOCUMENT_ID: 1,
            ORGANIZATION: 1,
            LOCATION: 1,
            DATE: 1,
            OTHER_SENSITIVE_DATA: 1
        };

        const generatePseudo = (entity: Entity): string => {
            const type = entity.type;
            const normalizedText = entity.text.trim();

            if (!replacementMap[normalizedText]) {
                const n = counters[type]++;
                const label = type.toLowerCase().replace(/_/g, "-");
                replacementMap[normalizedText] = `${label}-${n}`;
            }

            return replacementMap[normalizedText];
        };

        const sortedEntities = [...entities].sort(
            (a, b) => b.text.length - a.text.length
        );

        for (const entity of sortedEntities) {
            const pseudo = generatePseudo(entity);
            const escaped = this.escapeRegex(entity.text);
            const regex = new RegExp(escaped, "g");
            output = output.replace(regex, pseudo);
        }

        return {
            originalText: inputText,
            anonymizedText: output,
            entities,
            replacementMap
        };
    }

    private escapeRegex(str: string): string {
        return str.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
    }
}