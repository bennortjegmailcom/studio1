'use server';

/**
 * @fileOverview A flow that analyzes historian data to suggest downtime events.
 *
 * - analyzeHistorianData - A function that handles the analysis of historian data and suggests downtime events.
 * - AnalyzeHistorianDataInput - The input type for the analyzeHistorianData function.
 * - AnalyzeHistorianDataOutput - The return type for the analyzeHistorianData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeHistorianDataInputSchema = z.object({
  historianData: z
    .string()
    .describe('Raw text data from a historian system.'),
  equipmentList: z.array(z.string()).describe('A list of known equipment.'),
  historianTags: z.array(z.string()).describe('A list of historian tags associated with the equipment.'),
});
export type AnalyzeHistorianDataInput = z.infer<typeof AnalyzeHistorianDataInputSchema>;

const AnalyzeHistorianDataOutputSchema = z.object({
  suggestedDowntimeEvents: z.array(z.string()).describe('A list of suggested downtime events.'),
});
export type AnalyzeHistorianDataOutput = z.infer<typeof AnalyzeHistorianDataOutputSchema>;

export async function analyzeHistorianData(input: AnalyzeHistorianDataInput): Promise<AnalyzeHistorianDataOutput> {
  return analyzeHistorianDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeHistorianDataPrompt',
  input: {schema: AnalyzeHistorianDataInputSchema},
  output: {schema: AnalyzeHistorianDataOutputSchema},
  prompt: `You are an AI expert in analyzing historian data from industrial equipment.

You will receive raw text data from a historian system, a list of known equipment, and a list of historian tags.

Your task is to analyze the data and identify potential downtime events for the equipment.

Historian Data:
{{historianData}}

Equipment List:
{{#each equipmentList}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Historian Tags:
{{#each historianTags}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Based on this information, suggest a list of downtime events.

Format the output as a JSON array of strings.
`,
});

const analyzeHistorianDataFlow = ai.defineFlow(
  {
    name: 'analyzeHistorianDataFlow',
    inputSchema: AnalyzeHistorianDataInputSchema,
    outputSchema: AnalyzeHistorianDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
