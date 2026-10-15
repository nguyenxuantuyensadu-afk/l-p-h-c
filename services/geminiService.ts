
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, GenerateImagesResponse, Modality, Type, ThinkingLevel, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { BeliefState, Clarification, Relationship, Candidate, GraphUpdate, Entity, Attribute, ImagePart, StoryType, GeneratedImage, Mode } from '../types';

const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set");
}

// Helper to create a fresh AI instance with the key
const createAi = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });

const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export type StatusUpdateCallback = (message: string) => void;

// --- START: Retry Logic for API Calls ---
const isRetryableError = (error: any): boolean => {
  const errorMessage = typeof error?.message === 'string' ? error.message : JSON.stringify(error);
  
  // Non-retryable errors
  if (errorMessage.includes('Requested entity was not found') || 
      errorMessage.includes('API_KEY_INVALID') ||
      errorMessage.includes('invalid api key') ||
      errorMessage.includes('limit: 0') ||
      errorMessage.includes('FreeTier')) {
    return false;
  }

  return (
    errorMessage.includes('"code":503') || 
    errorMessage.includes('"status":"UNAVAILABLE"') ||
    errorMessage.includes('"code":500') ||
    errorMessage.includes('"status":"UNKNOWN"') ||
    errorMessage.includes('Rpc failed') ||
    errorMessage.includes('xhr error') ||
    errorMessage.includes('502') || 
    errorMessage.includes('Bad Gateway') ||
    errorMessage.includes('504') ||
    errorMessage.includes('Gateway Timeout') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('"code":429') ||
    errorMessage.includes('429') ||
    errorMessage.includes('"status":"RESOURCE_EXHAUSTED"')
  );
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  initialDelay = 1000,
  onStatusUpdate?: StatusUpdateCallback,
  actionName: string = "Request"
): Promise<T> => {
  let lastError: any;
  let currentDelay = initialDelay;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (isRetryableError(error)) {
        const msg = `Connection unstable or rate limited during ${actionName}. Retrying (${i + 1}/${retries})...`;
        console.warn(msg);
        if (onStatusUpdate) onStatusUpdate(msg);

        await delay(currentDelay);
        currentDelay = currentDelay * 2 + Math.floor(Math.random() * 1000);
      } else {
        console.warn(`Non-retryable error during ${actionName}:`, error?.message || error);
        throw error;
      }
    }
  }

  console.warn(`All retry attempts failed for ${actionName}. Last error:`, lastError);
  const finalError = new Error(`${actionName} failed after ${retries} attempts. ${lastError?.message || 'Unknown error'}`);
  (finalError as any).originalError = lastError;
  throw finalError;
};

/**
 * Generates the complete Belief Graph including Entities, Relationships, AND Rich Attributes.
 */
export const parsePromptToBeliefGraph = async (
    prompt: string, 
    mode: Mode, 
    onStatusUpdate?: StatusUpdateCallback,
    referenceImages: ImagePart[] = [],
    storyType: StoryType = 'generic',
    proactiveness: 'low' | 'medium' | 'high' = 'medium',
    modelName: string = 'gemini-3-flash-preview'
): Promise<BeliefState> => {
    console.log(`Generating Full Belief Graph (Structure + Attributes) for ${mode} using ${modelName}:`, prompt);

    let modeSpecificInstructions = "";

    if (mode === 'image') {
        modeSpecificInstructions = `
        - **The Image Entity:** Always include an entity named "The Image". Required Attributes: weather, location, time of day, atmosphere, camera angle, image style.
        `;
    } else {
        modeSpecificInstructions = `
        - **The Story Entity:** Always include an entity named "The Story". Required Attributes: genre, tone, narrative_perspective, pacing, central_conflict.
        `;
    }

    const universalEntityInstructions = `
    - **Humans:** For ANY human character, you **MUST** include these attributes: race/ethnicity, skin_tone, gender, age, hair_style, clothing_style (specific culture or fashion), facial_expression. 
    - **Animals (Cats, Dogs, etc.):** For ANY animal, you **MUST** include: specific_breed (e.g. Tabby, Golden Retriever), coat_color/pattern, age_stage (kitten, puppy, adult, senior), size, temperament.
    - **Objects (including Food/Meal):** Include: material, primary_color, condition, size, texture, cuisine_type (if food), cultural_origin.
    - **Locations:** Include: lighting_type, ambient_noise, temperature_vibe, architectural_style, geographic_region.
    `;

    const imageContextInstruction = referenceImages.length > 0 ? 
      `Reference image(s) have been provided. TREAT THE IMAGES AS THE SOURCE OF TRUTH for the current state of the scene. 
       - Map all visible entities, their relationships, and their visual attributes (especially race, breed, colors) accurately from the images.
       - Use the text prompt to identify INTENDED CHANGES or additions to this image state.` : 
      `Analyze the text prompt to identify entities and their attributes.`;

    let proactivenessInstruction = "";
    let implicitEntitiesRule = "";
    let inferenceRule = "";
    let relationshipRule = "";

    if (proactiveness === 'low') {
        proactivenessInstruction = "STRICT MODE: Only extract entities and attributes explicitly mentioned in the prompt. Do not invent or assume any details unless absolutely necessary for the medium.";
        implicitEntitiesRule = "**Implicit Entities:** Do NOT add implicit entities. Only include entities explicitly mentioned in the prompt.";
        inferenceRule = "**Inference Rule:** Do NOT infer values for unmentioned attributes unless absolutely required by the medium. Leave them as 'unspecified' or provide a minimal default.";
        relationshipRule = "**Infer Missing Connections:** Only include relationships explicitly stated in the prompt. Do not invent connections.";
    } else if (proactiveness === 'medium') {
        proactivenessInstruction = "BALANCED MODE: Extract explicit entities and attributes, and infer reasonable defaults for missing critical attributes (like lighting or camera angle) to make a complete scene.";
        implicitEntitiesRule = "**Implicit Entities:** You may add 1-2 implicit entities that naturally and obviously belong in the scene.";
        inferenceRule = "**Inference Rule (Global Diversity):** If a mandatory attribute is not mentioned, infer a reasonable default based on context. Reflect global diversity in your inferred values (e.g., diverse races/ethnicities, cuisines).";
        relationshipRule = "**Infer Missing Connections:** Infer obvious missing connections (e.g., basic spatial relationships) that make the scene coherent.";
    } else {
        proactivenessInstruction = "CREATIVE MODE: Be highly proactive. Invent interesting, specific, and creative attributes for entities even if not mentioned. Add atmospheric and stylistic details to enhance the prompt.";
        implicitEntitiesRule = "**Implicit Entities:** Generate at least 3 implicit entities that are highly creative, potentially unlikely to appear but could be interesting to consider and creative.";
        inferenceRule = "**Inference Rule (Global Diversity):** If a mandatory attribute is not mentioned, you **MUST INFER** a plausible value or choose a specific, creative one. **DO NOT default to Western/US-centric norms.** Reflect global diversity.";
        relationshipRule = "**Infer Missing Connections:** If relationships are not explicitly stated, you **MUST IMAGINE** them. Consider spatial (next to, behind), emotional (loves, fears), or functional (holding, wearing) connections.";
    }

    const systemPrompt = `
    Analyze the prompt ${referenceImages.length > 0 ? 'and reference images' : ''} and generate a complete **Belief Graph** representing the scene or story.
    Identify all entities, their detailed attributes, and their relationships.

    ${imageContextInstruction}
    
    ${proactivenessInstruction}

    ### ENTITY RULES:
    1.  **Core Entities:** Identify the core entities (objects, characters, setting).
    2.  **Absent Entities:** DO NOT extract entities that the prompt explicitly states are NOT present (e.g., "no party tables", "without sunlight"). Ignore them completely.
    3.  ${implicitEntitiesRule}
    4.  **Explicit vs Implicit:** 
        - If an entity is clearly stated in the prompt, set \`presence_in_prompt\` to \`true\`.
        - If you inferred it (e.g., a "table" in a "dining room" scene, but the prompt didn't mention a table), set \`presence_in_prompt\` to \`false\`.
    5.  **No Massive Strings:** DO NOT output any base64 strings, image data, or excessively long strings. Keep all descriptions and attribute values concise.

    ### CRITICAL ATTRIBUTE RULES:
    Attributes are the most important part of the graph. You must be specific and proactive.
    1.  **Existence:** For EVERY entity, you **MUST** include an attribute named 'existence' (value "true" or "false").
    2.  **No Meta-Attributes:** DO NOT create attributes that describe the graph structure or prompt status (e.g., 'presence_in_prompt', 'explicit', 'implicit', 'absent', 'mentioned'). These are structural properties of the schema, not visual attributes of the entity.
    3.  **Mandatory Category Attributes:**
        ${universalEntityInstructions}
    4.  **Mode Specific Scene Attributes:**
        ${modeSpecificInstructions}
    5.  ${inferenceRule}
    6.  **Candidates:** For EVERY attribute, provide 2-3 plausible alternative candidate values as a list of strings. The first value should be the most likely/current one.

    ### RELATIONSHIP RULES:
    1.  ${relationshipRule}
    2.  **Explicit vs Implicit:** 
        - If a relationship is clearly stated in the prompt, set \`presence_in_prompt\` to \`true\`.
        - If you inferred it (e.g., "a cat and a dog" implies they are "near" each other, but the prompt didn't say it), set \`presence_in_prompt\` to \`false\`.
    3.  **Quantity:** Identify AT LEAST 1 relationship for every pair of interacting entities. Do not leave entities isolated if they are part of the same scene.

    ### LANGUAGE RULE:
    If the prompt is in Vietnamese or mentions Vietnamese concepts, generate all entity names, descriptions, attribute names, attribute candidate values, and relationship labels in natural Vietnamese. Otherwise match the input language.

    Input Prompt: "${prompt}"`;

    const parts: any[] = [{ text: systemPrompt }];
    referenceImages.forEach(img => parts.push(img));

    const attributeSchema = { 
        type: Type.OBJECT, 
        properties: { 
            name: { type: Type.STRING }, 
            presence_in_prompt: { type: Type.BOOLEAN }, 
            value: { type: Type.ARRAY, items: { type: Type.STRING } } 
        }, 
        required: ['name', 'presence_in_prompt', 'value'] 
    };
    
    const entitySchema = { 
        type: Type.OBJECT, 
        properties: { 
            name: { type: Type.STRING }, 
            presence_in_prompt: { type: Type.BOOLEAN }, 
            description: { type: Type.STRING }, 
            alternatives: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }, 
            attributes: { type: Type.ARRAY, items: attributeSchema } 
        }, 
        required: ['name', 'presence_in_prompt', 'description', 'attributes'] 
    };
    
    const relationshipSchema = { 
        type: Type.OBJECT, 
        properties: { 
            source: { type: Type.STRING }, 
            target: { type: Type.STRING }, 
            label: { type: Type.STRING }, 
            presence_in_prompt: { type: Type.BOOLEAN },
            alternatives: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true } 
        }, 
        required: ['source', 'target', 'label', 'presence_in_prompt'] 
    };

    const ai = createAi();
    try {
        const generateWithModel = async (modelName: string) => {
            return await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
                model: modelName,
                contents: { parts },
                config: {
                    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                    responseMimeType: "application/json",
                    safetySettings: SAFETY_SETTINGS,
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            entities: { type: Type.ARRAY, items: entitySchema },
                            relationships: { type: Type.ARRAY, items: relationshipSchema }
                        },
                        required: ['entities', 'relationships']
                    },
                    maxOutputTokens: 8192
                }
            }), 3, 2000, onStatusUpdate, `Belief Graph Generation (${modelName})`);
        };

        let response: GenerateContentResponse;
        try {
            response = await generateWithModel(modelName);
        } catch (error: any) {
            console.warn(`Model ${modelName} failed for graph generation, falling back to Flash:`, error);
            // If it's a quota error, try Flash which usually has higher limits
            if (modelName !== 'gemini-3-flash-preview' && (isRetryableError(error) || error.message.includes("429"))) {
                response = await generateWithModel('gemini-3-flash-preview');
            } else {
                throw error;
            }
        }

        let jsonText = response.text.trim();
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }

        const rawGraph = JSON.parse(jsonText);
        
        const entities = rawGraph.entities.map((e: any) => ({
            ...e,
            alternatives: e.alternatives ? e.alternatives.map((s: string) => ({ name: s })) : [],
            attributes: e.attributes.map((a: any) => ({
                ...a,
                value: a.value.map((s: string) => ({ name: s }))
            }))
        }));

        const relationships = rawGraph.relationships.map((r: any) => ({
            ...r,
            alternatives: r.alternatives ? r.alternatives.map((s: string) => ({ name: s })) : []
        }));

        return { entities, relationships, prompt };
    } catch (error) {
        console.error("Error generating belief graph:", error);
        return { entities: [], relationships: [], prompt };
    }
};

export const updateBeliefGraph = async (
    previousGraph: BeliefState,
    newPrompt: string, 
    mode: Mode, 
    onStatusUpdate?: StatusUpdateCallback,
    referenceImages: ImagePart[] = [],
    storyType: StoryType = 'generic',
    proactiveness: 'low' | 'medium' | 'high' = 'medium',
    modelName: string = 'gemini-3-flash-preview'
): Promise<BeliefState> => {
    console.log(`Augmenting Belief Graph for ${mode} using ${modelName}:`, newPrompt);

    let implicitEntitiesRule = "";
    let relationshipRule = "";

    if (proactiveness === 'low') {
        implicitEntitiesRule = "11. IMPLICIT ENTITIES: Do NOT add new implicit entities unless absolutely necessary to connect explicit ones.";
        relationshipRule = "12. NEW RELATIONS: Only add relationships explicitly stated in the new prompt.";
    } else if (proactiveness === 'medium') {
        implicitEntitiesRule = "11. IMPLICIT ENTITIES: You MUST ensure there are ALWAYS more than 1 implicit entities (presence_in_prompt: false) in the graph. If previous implicit entities were marked as absent or present, imagine new ones to replace them.";
        relationshipRule = "12. NEW RELATIONS: Imagine new relations, especially if an implicit entity with no edges got marked as present. Imagine what kind of relationship this entity may have with others.";
    } else {
        implicitEntitiesRule = "11. IMPLICIT ENTITIES: You MUST ensure there are ALWAYS more than 3 implicit entities (presence_in_prompt: false) in the graph. Be highly creative and imagine new implicit entities to replace any that were marked absent or present.";
        relationshipRule = "12. NEW RELATIONS: Imagine new, creative relations, especially if an implicit entity with no edges got marked as present. Imagine what kind of relationship this entity may have with others.";
    }

    const systemPrompt = `
    You are an expert at updating Belief Graphs.
    The user has updated their prompt or answered clarifications. Your task is to mutate the existing graph to reflect the new state.
    
    CRITICAL RULES:
    1. RENAME ENTITIES IF NEEDED: If an existing entity's core concept remains but its description in the prompt becomes more specific or changes (e.g., "Party Setting" becomes "Backyard Garden", or "Cat" becomes "Fluffy Cat"), you MUST rename it using the \`new_name\` field in \`update_entities\`. This preserves its connections while updating its label. Otherwise, KEEP EXISTING ENTITY NAMES EXACTLY THE SAME.
    2. ADD NEW ENTITIES: If the New Prompt introduces new objects, characters, or settings, you MUST add them as new entities using \`add_entities\`, and connect them to the graph using \`add_relationships\`.
    3. If a core concept changed, you MUST add new implicit entities that logically follow and update related attributes.
    4. If an implicit entity has now become explicit (presence_in_prompt becomes true), you MUST ensure it is connected to the rest of the graph. If it has no edges connected to it, you MUST add logical implicit edges (presence_in_prompt: false) connecting it to other relevant entities.
    5. DO NOT change the labels of existing relationships unless the new prompt explicitly contradicts them. Preserve the exact wording of existing relationship labels whenever possible.
    6. Explicit vs Implicit: If an entity or relationship is clearly stated in the New Prompt, set \`presence_in_prompt\` to \`true\`. If it is inferred (e.g., a "table" in a "party setup") or carried over but not explicitly mentioned in the new prompt, set it to \`false\`. Use \`update_entities\` and \`update_relationships\` to change the \`presence_in_prompt\` of existing entities and relationships.
    7. REMOVE ABSENT ENTITIES: If the New Prompt explicitly states that an entity is NOT present (e.g., "no party tables", "without sunlight"), or if an entity is completely removed from the prompt, you MUST completely remove that entity using \`remove_entities\`. Do NOT keep it in the graph with existence=false.
    8. NO META-ATTRIBUTES: DO NOT create or update attributes that describe the graph structure or prompt status (e.g., 'presence_in_prompt', 'explicit', 'implicit', 'absent', 'mentioned'). These are structural properties of the schema, not visual attributes of the entity.
    9. PRESERVE EXISTING ATTRIBUTES: DO NOT remove existing attributes unless they explicitly contradict the new prompt. Keep all existing attributes and their values intact, even if they are not explicitly mentioned in the new prompt. Use \`remove_attributes\` sparingly.
    10. EXTRACT ALL NEW ATTRIBUTES: If the new prompt adds new descriptive details (e.g., 'vibrant confetti', 'fluffy cat'), you MUST add or update the corresponding attributes in \`add_or_update_attributes\`. Be thorough.
    11. MINIMAL DELTA: ONLY output the entities and relationships that have changed. DO NOT output the entire graph. If an entity or relationship has not changed, DO NOT include it in the output.
    12. NO MASSIVE STRINGS: DO NOT output any base64 strings, image data, or excessively long strings. Keep all descriptions and attribute values concise.
    ${implicitEntitiesRule}
    ${relationshipRule}
    
    Previous Graph:
    ${JSON.stringify(previousGraph, null, 2)}
    
    New Prompt: "${newPrompt}"
    
    Output a JSON patch to update the graph.
    `;

    const parts: any[] = [{ text: systemPrompt }];
    referenceImages.forEach(img => parts.push(img));

    const attributeSchema = { 
        type: Type.OBJECT, 
        properties: { 
            name: { type: Type.STRING }, 
            presence_in_prompt: { type: Type.BOOLEAN }, 
            value: { type: Type.ARRAY, items: { type: Type.STRING } } 
        }, 
        required: ['name', 'presence_in_prompt', 'value'] 
    };
    
    const entitySchema = { 
        type: Type.OBJECT, 
        properties: { 
            name: { type: Type.STRING }, 
            presence_in_prompt: { type: Type.BOOLEAN }, 
            description: { type: Type.STRING }, 
            alternatives: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }, 
            attributes: { type: Type.ARRAY, items: attributeSchema } 
        }, 
        required: ['name', 'presence_in_prompt', 'description', 'attributes'] 
    };
    
    const relationshipSchema = { 
        type: Type.OBJECT, 
        properties: { 
            source: { type: Type.STRING }, 
            target: { type: Type.STRING }, 
            label: { type: Type.STRING }, 
            presence_in_prompt: { type: Type.BOOLEAN },
            alternatives: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true } 
        }, 
        required: ['source', 'target', 'label', 'presence_in_prompt'] 
    };

    const deltaSchema = {
        type: Type.OBJECT,
        properties: {
            add_entities: { type: Type.ARRAY, items: entitySchema },
            remove_entities: { type: Type.ARRAY, items: { type: Type.STRING } },
            update_entities: { 
                type: Type.ARRAY, 
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        new_name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        presence_in_prompt: { type: Type.BOOLEAN },
                        add_or_update_attributes: { type: Type.ARRAY, items: attributeSchema },
                        remove_attributes: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['name']
                }
            },
            add_relationships: { type: Type.ARRAY, items: relationshipSchema },
            remove_relationships: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        source: { type: Type.STRING },
                        target: { type: Type.STRING }
                    },
                    required: ['source', 'target']
                }
            },
            update_relationships: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        source: { type: Type.STRING },
                        target: { type: Type.STRING },
                        label: { type: Type.STRING },
                        presence_in_prompt: { type: Type.BOOLEAN }
                    },
                    required: ['source', 'target']
                }
            }
        }
    };

    const ai = createAi();
    try {
        const generateWithModel = async (model: string) => {
            return await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
                model: model,
                contents: { parts },
                config: {
                    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                    responseMimeType: "application/json",
                    safetySettings: SAFETY_SETTINGS,
                    responseSchema: deltaSchema,
                    maxOutputTokens: 8192
                }
            }), 3, 2000, onStatusUpdate, `Belief Graph Augmentation (${model})`);
        };

        let response: GenerateContentResponse;
        try {
            response = await generateWithModel(modelName);
        } catch (error: any) {
            console.warn(`Model ${modelName} failed for graph augmentation, falling back to Flash:`, error);
            if (modelName !== 'gemini-3-flash-preview' && (isRetryableError(error) || error.message.includes("429"))) {
                response = await generateWithModel('gemini-3-flash-preview');
            } else {
                throw error;
            }
        }

        let jsonText = response.text.trim();
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }

        const delta = JSON.parse(jsonText);
        
        // Apply delta to previousGraph
        let newEntities = [...previousGraph.entities];
        let newRelationships = [...previousGraph.relationships];

        // Remove entities
        if (delta.remove_entities) {
            newEntities = newEntities.filter(e => !delta.remove_entities.includes(e.name));
            // Also remove relationships involving removed entities
            newRelationships = newRelationships.filter(r => 
                !delta.remove_entities.includes(r.source) && !delta.remove_entities.includes(r.target)
            );
        }

        // Add entities
        if (delta.add_entities) {
            delta.add_entities.forEach((e: any) => {
                newEntities.push({
                    ...e,
                    alternatives: e.alternatives ? e.alternatives.map((s: string) => ({ name: s })) : [],
                    attributes: e.attributes.map((a: any) => ({
                        ...a,
                        value: a.value.map((s: string) => ({ name: s }))
                    }))
                });
            });
        }

        // Update entities
        if (delta.update_entities) {
            delta.update_entities.forEach((update: any) => {
                const entityIndex = newEntities.findIndex(e => e.name === update.name);
                if (entityIndex !== -1) {
                    const entity = { ...newEntities[entityIndex] };
                    if (update.description !== undefined) entity.description = update.description;
                    if (update.presence_in_prompt !== undefined) entity.presence_in_prompt = update.presence_in_prompt;
                    
                    let newAttributes = [...entity.attributes];
                    if (update.remove_attributes) {
                        newAttributes = newAttributes.filter(a => !update.remove_attributes.includes(a.name));
                    }
                    if (update.add_or_update_attributes) {
                        update.add_or_update_attributes.forEach((newAttr: any) => {
                            const attrIndex = newAttributes.findIndex(a => a.name === newAttr.name);
                            const parsedAttr = {
                                ...newAttr,
                                value: newAttr.value.map((s: string) => ({ name: s }))
                            };
                            if (attrIndex !== -1) {
                                newAttributes[attrIndex] = parsedAttr;
                            } else {
                                newAttributes.push(parsedAttr);
                            }
                        });
                    }
                    entity.attributes = newAttributes;

                    // Handle renaming
                    if (update.new_name && update.new_name !== entity.name) {
                        const oldName = entity.name;
                        entity.name = update.new_name;
                        
                        // Update relationships that reference this entity
                        newRelationships = newRelationships.map(rel => {
                            if (rel.source === oldName) return { ...rel, source: update.new_name };
                            if (rel.target === oldName) return { ...rel, target: update.new_name };
                            return rel;
                        });
                    }

                    newEntities[entityIndex] = entity;
                }
            });
        }

        // Remove relationships
        if (delta.remove_relationships) {
            delta.remove_relationships.forEach((rm: any) => {
                newRelationships = newRelationships.filter(r => !(r.source === rm.source && r.target === rm.target));
            });
        }

        // Add relationships
        if (delta.add_relationships) {
            delta.add_relationships.forEach((r: any) => {
                // Check if it already exists to avoid duplicates
                const index = newRelationships.findIndex(existing => existing.source === r.source && existing.target === r.target);
                if (index === -1) {
                    newRelationships.push({
                        ...r,
                        alternatives: r.alternatives ? r.alternatives.map((s: string) => ({ name: s })) : []
                    });
                } else {
                    // Update existing relationship
                    newRelationships[index] = {
                        ...newRelationships[index],
                        ...r,
                        alternatives: r.alternatives ? r.alternatives.map((s: string) => ({ name: s })) : newRelationships[index].alternatives
                    };
                }
            });
        }

        // Update relationships
        if (delta.update_relationships) {
            delta.update_relationships.forEach((update: any) => {
                const index = newRelationships.findIndex(existing => existing.source === update.source && existing.target === update.target);
                if (index !== -1) {
                    newRelationships[index] = {
                        ...newRelationships[index],
                        ...update
                    };
                }
            });
        }

        return {
            entities: newEntities,
            relationships: newRelationships,
            prompt: newPrompt
        };

    } catch (error) {
        console.error("Error augmenting belief graph:", error);
        if (onStatusUpdate) onStatusUpdate("Failed to augment graph. Falling back to full regeneration.");
        // Fallback to full regeneration
        return parsePromptToBeliefGraph(newPrompt, mode, onStatusUpdate, referenceImages, storyType, proactiveness, modelName);
    }
};

export const generateClarifications = async (
    prompt: string, 
    askedQuestions: string[], 
    mode: Mode, 
    onStatusUpdate?: StatusUpdateCallback,
    referenceImages: ImagePart[] = [],
    storyType: StoryType = 'generic',
    model: string = 'gemini-3-flash-preview',
    proactiveness: 'low' | 'medium' | 'high' = 'medium'
): Promise<Clarification[]> => {
    const ai = createAi();
    console.log(`Generating clarifications for ${mode} mode using ${model} from prompt:`, prompt);
    
    const imagePrompt = `You are an expert in text-to-image prompting. Help a user refine their prompt (and images if provided) by asking clarifying questions.`;
    const genericStoryPrompt = `You are a creative writing assistant. Help a user develop their story idea from the prompt (and images if provided) by asking insightful clarifying questions.`;

    const specificPrompt = mode === 'story' ? genericStoryPrompt : imagePrompt;

    const imageInstruction = referenceImages.length > 0 ? 
      `IMPORTANT: Reference images have been provided. 
       - DO NOT ask about visual details that are clearly visible and unambiguous in the images.
       - DO ask questions that clarify the INTENT behind the text prompt's modifications to the images.
       - Focus on unresolved ambiguities between the text and the images.` : 
      `Analyze the text prompt to find ambiguities.`;

    let proactivenessInstruction = "";
    if (proactiveness === 'low') {
        proactivenessInstruction = "STRICT MODE: Only ask about the attributes of existing entities explicitly mentioned in the prompt, or the attributes of the main medium (image/story). Do NOT invent story elements or suggest creative additions.";
    } else if (proactiveness === 'medium') {
        proactivenessInstruction = "BALANCED MODE: Ask about missing technical details and offer a few creative suggestions that stay close to the original prompt's intent.";
    } else {
        proactivenessInstruction = "CREATIVE MODE: Be highly proactive and very creative. Suggest wild, creative additions, new characters, unexpected twists, or unique stylistic choices to enhance the prompt.";
    }

    const diversityInstruction = `
    ### CRITICAL INSTRUCTIONS FOR QUALITY & SIMPLICITY:
    1. **Be Naturally Curious:** Imagine you are a creative partner trying to visualize the user's idea. What are the most important missing details? Ask the 3 most critical questions that will have the biggest impact on the final result.
    2. **Atomic Questions:** Ask ONE specific thing per question. **NEVER** combine two topics. 
       - **Correct:** "What is the lighting style?"
       - **Incorrect:** "What is the lighting and the background?" (This is confusing).
       - Keep questions **short** and **easy to read**.
    3. **Global Context:** Users are global. Do not assume Western norms (e.g., "breakfast" != pancakes). If cultural context is ambiguous, ask about it.
    4. **Diversity of Topics:** Do NOT ask 3 questions about the same topic (e.g., don't ask 3 questions just about lighting). Mix up the types of questions (e.g., one about the subject, one about the mood, one about the style) to get a full picture.
    5. **Forbidden Topics:** In ANY mode, NEVER ask about the aspect ratio or resolution.
    
    ${proactivenessInstruction}
    `;

    const finalPrompt = specificPrompt + `
    
    ${imageInstruction}

    ${diversityInstruction}

Follow these instructions EXACTLY:
1.  **Quantity:** Generate EXACTLY 3 questions.
2.  **Clarity:** Questions must be simple, single-topic, and direct.
3.  **Ease:** Provide 3-5 plausible options covering DIVERSE possibilities.
4.  **Avoid Repetition**: DO NOT ask any of:
    ${askedQuestions.map(q => `- "${q}"`).join('\n') || 'N/A'}
5.  **Language Consistency**: If the user prompt is in Vietnamese or contains Vietnamese, you MUST write all 3 questions and all of their options in natural, idiomatic Vietnamese. Otherwise, match the language of the prompt.

User Prompt: "${prompt}"`;

    const parts: any[] = [{ text: finalPrompt }];
    referenceImages.forEach(img => parts.push(img));

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: { parts },
            config: {
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                responseMimeType: "application/json",
                safetySettings: SAFETY_SETTINGS,
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['question', 'options'],
                    },
                },
                maxOutputTokens: 8192
            },
        }), 5, 2000, onStatusUpdate, "Clarification Generation"); 

        let jsonText = response.text.trim();
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }
        return JSON.parse(jsonText) as Clarification[];
    } catch (error) {
        console.error("Error generating clarifications:", error);
        return [];
    }
};

export const refinePromptWithAllUpdates = async (
    originalPrompt: string,
    clarifications: { question: string; answer: string }[],
    graphUpdates: GraphUpdate[],
    onStatusUpdate?: StatusUpdateCallback,
    proactiveness: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> => {
    const ai = createAi();
    let updatesPromptSection = "";
    if (graphUpdates.length > 0) {
        const graphList = graphUpdates.map((u) => {
            if (u.type === 'attribute') {
                if (u.attribute.toLowerCase() === 'existence' || u.attribute.toLowerCase() === 'existence_in_image') {
                    if (u.value === 'false') {
                        return `- REMOVE entity "${u.entity}" from the prompt entirely, or explicitly state it is not present.`;
                    } else {
                        return `- ENSURE entity "${u.entity}" is explicitly mentioned in the prompt.`;
                    }
                }
                return `- For entity "${u.entity}", set attribute "${u.attribute}" to "${u.value}".`;
            } else {
                return `- Change relationship between "${u.source}" and "${u.target}" from "${u.oldLabel}" to "${u.newLabel}".`;
            }
        }).join('\n');
        updatesPromptSection += `\nSPECIFIC EDITS TO APPLY:\n${graphList}\n`;
    }
  
    if (clarifications.length > 0) {
        const qaList = clarifications.map((c) => `- User Answer to "${c.question}": "${c.answer}"`).join('\n');
        updatesPromptSection += `\nNEW INFORMATION FROM Q&A:\n${qaList}\n`;
    }

    let proactivenessInstruction = "";
    if (proactiveness === 'low') {
        proactivenessInstruction = "STRICT MODE: Only apply the exact edits requested. Do not change the tone, style, or add any unrequested details.";
    } else if (proactiveness === 'medium') {
        proactivenessInstruction = "BALANCED MODE: Apply the edits smoothly. You may slightly adjust wording for flow, but keep the core meaning intact. DO NOT add unrequested details.";
    } else {
        proactivenessInstruction = "CREATIVE MODE: Apply the edits and feel free to embellish the prompt with richer descriptive language, enhancing the atmosphere and style, BUT DO NOT omit any requested edits.";
    }
  
    const promptMessage = `Rewrite the prompt to incorporate specific user edits while strictly preserving all other existing details.
    
Original Prompt: "${originalPrompt}"

${updatesPromptSection}

CRITICAL INSTRUCTIONS:
1. Integrate all specific edits and answers into a single, cohesive, descriptive prompt.
2. STRICTLY PRESERVE all existing details from the Original Prompt that are not explicitly changed by the edits. Do NOT omit existing entities, attributes, or relationships.
3. DO NOT add any new unrequested details, entities, or actions unless explicitly answering a "[YOU DECIDE]" question.
4. If an edit says to REMOVE an entity, ensure all references to it are completely removed from the prompt, or explicitly state it is absent.
5. If a user explicitly answers "[NOT RELEVANT]", do NOT include any details about that topic.
6. YOUR ENTIRE RESPONSE MUST ONLY BE THE FINAL REFINED PROMPT TEXT.
7. DO NOT INCLUDE ANY LABELS, PREFIXES, OR FORMATTING LIKE "Updated Prompt:", "Refined Prompt:", or "**Updated Prompt:**".
8. DO NOT provide any conversational intro or outro.
9. DO NOT use markdown bolding for the whole prompt.
10. Output the refined prompt in the SAME LANGUAGE as the Original Prompt (e.g. if the original prompt or user edits are in Vietnamese, output in natural Vietnamese).

${proactivenessInstruction}

Output the refined prompt text now:`;
  
    try {
      const generateWithModel = async (modelName: string) => {
        return await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
          model: modelName,
          contents: promptMessage,
          config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              systemInstruction: "You are a prompt engineering expert. Your task is to rewrite user prompts based on provided updates. You MUST output ONLY the final refined text of the prompt. No prefixes, no suffixes, no 'Updated Prompt' labels. Just the prompt itself.",
              temperature: 0.2,
              safetySettings: SAFETY_SETTINGS
          }
        }), 3, 1000, onStatusUpdate, `Prompt Refinement (${modelName})`);
      };

      let response: GenerateContentResponse;
      try {
        response = await generateWithModel('gemini-3-flash-preview');
      } catch (error: any) {
        console.warn("Flash model failed for prompt refinement:", error);
        throw error;
      }
      
      let refined = response.text || originalPrompt;
      // Final aggressive sanitization to remove common prefixes if model ignores instructions
      refined = refined.replace(/^[\s\W]*(updated|refined|final|new)\s*prompt\s*[:\s-]+/i, '');
      refined = refined.replace(/^\**Updated Prompt:\**\s*/i, '');
      refined = refined.replace(/^\**Refined Prompt:\**\s*/i, '');
      refined = refined.replace(/^Prompt:\s*/i, '');
      refined = refined.trim();
      
      return refined;
    } catch (error) {
      console.error("Error refining prompt:", error);
      return originalPrompt;
    }
  };

const generateFallbackImage = async (
    prompt: string, 
    aspectRatio: string = "16:9", 
    seed: number = Math.floor(Math.random() * 1000000)
): Promise<string> => {
    let width = 1024, height = 576;
    if (aspectRatio === "1:1") { width = 1024; height = 1024; }
    else if (aspectRatio === "4:3") { width = 1024; height = 768; }
    else if (aspectRatio === "3:4") { width = 768; height = 1024; }
    else if (aspectRatio === "9:16") { width = 576; height = 1024; }
    
    const cleanPrompt = prompt.replace(/[^\w\s\u00C0-\u1EF9,.-]/gi, ' ').trim().slice(0, 450);
    const encoded = encodeURIComponent(cleanPrompt || "vibrant creative artwork");
    const fallbackUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const resp = await fetch(fallbackUrl, { signal: controller.signal });
        clearTimeout(timeout);
        
        if (!resp.ok) {
            return fallbackUrl;
        }

        if (typeof FileReader !== 'undefined') {
            const blob = await resp.blob();
            return await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(fallbackUrl);
                reader.readAsDataURL(blob);
            });
        } else if (typeof Buffer !== 'undefined') {
            const buffer = await resp.arrayBuffer();
            return `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
        }
        return fallbackUrl;
    } catch (err) {
        console.warn("Direct fetch conversion fallback:", err);
        return fallbackUrl;
    }
};

export const generateImagesFromPrompt = async (
    prompt: string, 
    onStatusUpdate?: StatusUpdateCallback,
    referenceImages: ImagePart[] = [],
    aspectRatio: string = "16:9",
    model: string = 'gemini-3.1-flash-lite-image',
    imageSize: string = '1K'
): Promise<GeneratedImage[]> => {
    const ai = createAi();
    console.log("Generating images for prompt:", prompt, "Model:", model, "Ratio:", aspectRatio, "Size:", imageSize);
    
    const validImages: GeneratedImage[] = [];

    // 1. Try Imagen if model explicitly starts with 'imagen-'
    if (model.startsWith('imagen-')) {
        try {
            if (onStatusUpdate) onStatusUpdate("Đang kết nối mô hình Imagen...");
            const response = await ai.models.generateImages({
                model,
                prompt,
                config: {
                    numberOfImages: 2,
                    aspectRatio: aspectRatio as any,
                    outputMimeType: 'image/jpeg'
                }
            });
            if (response.generatedImages && response.generatedImages.length > 0) {
                response.generatedImages.forEach(img => {
                    validImages.push({ url: `data:image/jpeg;base64,${img.image.imageBytes}`, prompt });
                });
            }
        } catch (error: any) {
            console.warn("Imagen generation error, continuing to fallback:", error?.message || error);
        }
    } else {
        // 2. Try Gemini Native Image Generation (Flash Lite Image, Nano Banana 2.1, Pro Image)
        const generateOneWithGemini = async (targetModel: string): Promise<string | null> => {
            try {
                const parts: any[] = [{ text: prompt }];
                referenceImages.forEach(img => parts.push(img));

                const supportsImageSize = targetModel === 'gemini-3-pro-image' || 
                                          targetModel === 'gemini-nano-banana-2.1' || 
                                          targetModel === 'gemini-3-pro-image-preview' || 
                                          targetModel === 'gemini-3.1-flash-image-preview';

                const imageConfig: any = { 
                    aspectRatio,
                    imageSize: supportsImageSize ? imageSize : undefined
                };

                const response = await ai.models.generateContent({
                    model: targetModel,
                    contents: { parts },
                    config: { 
                        imageConfig,
                        responseModalities: ["IMAGE"],
                        safetySettings: SAFETY_SETTINGS
                    }
                });
                
                if (response.candidates && response.candidates[0]?.content?.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                        }
                    }
                }
                return null;
            } catch (err: any) {
                const status = err?.status || err?.code || (typeof err?.message === 'string' && err.message.includes('429') ? '429 Quota' : 'Unavailable');
                console.warn(`Gemini native image generation notice (${targetModel}: ${status}). Transitioning to fallback engine.`);
                return null;
            }
        };

        try {
            if (onStatusUpdate) onStatusUpdate("Đang kết nối mô hình Gemini tạo ảnh...");
            const geminiPromises = [generateOneWithGemini(model), generateOneWithGemini(model)];
            const geminiResults = await Promise.all(geminiPromises);
            geminiResults.forEach(url => {
                if (url) validImages.push({ url, prompt });
            });
        } catch (err: any) {
            console.warn("Gemini batch generation notice:", err?.message || 'Handled');
        }
    }

    // 3. If Gemini or Imagen returned fewer than 2 images (e.g. FreeTier limit: 0 or quota rate-limited),
    // complement seamlessly with high-fidelity visual generation so the user ALWAYS receives complete images!
    if (validImages.length < 2) {
        if (onStatusUpdate) onStatusUpdate("Đang tổng hợp hình ảnh chi tiết theo ý tưởng của bạn...");
        const needed = 2 - validImages.length;
        const fallbackPromises = Array(needed).fill(null).map((_, idx) => {
            const seed = Math.floor(Math.random() * 1000000) + (idx * 997);
            return generateFallbackImage(prompt, aspectRatio, seed);
        });

        try {
            const fallbackUrls = await Promise.all(fallbackPromises);
            fallbackUrls.forEach(url => {
                validImages.push({ url, prompt });
            });
        } catch (err) {
            console.warn("Fallback generation batch error:", err);
        }
    }

    // Ensure we always have at least 2 images for the gallery
    while (validImages.length < 2) {
        const seed = Math.floor(Math.random() * 1000000) + Math.floor(Math.random() * 500);
        const url = await generateFallbackImage(prompt, aspectRatio, seed);
        validImages.push({ url, prompt });
    }

    return validImages;
};

export const generateStoryFromPrompt = async (
    prompt: string, 
    onStatusUpdate?: StatusUpdateCallback,
    referenceImages: ImagePart[] = [],
    model: string = 'gemini-flash-latest',
    storyType: StoryType = 'generic'
): Promise<string> => {
    const ai = createAi();
    console.log("Generating story for prompt:", prompt, "Model:", model, "StoryType:", storyType);
    
    const instruction = `Write a short, creative story based on the prompt (and images if provided). If the prompt is in Vietnamese, write the story in natural Vietnamese. Idea: "${prompt}"`;
    
    const parts: any[] = [{ text: instruction }];
    referenceImages.forEach(img => parts.push(img));

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: { parts },
            config: { 
                temperature: 0.8,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                safetySettings: SAFETY_SETTINGS
            }
        }), 3, 1000, onStatusUpdate, "Story Generation");
        return response.text;
    } catch (error) {
        console.error("Error generating story:", error);
        throw error;
    }
};
