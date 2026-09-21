import { pipeline, env } from '@huggingface/transformers';

// Configuration for browser Web Workers
env.allowLocalModels = false;
env.useBrowserCache = true;

// Replaced 'any' with the specific pipeline function type
let classifier: ((text: string) => Promise<Array<{ label: string; score: number }>>) | null = null;
let isInitializing = false;

const MODEL_NAME = 'Xenova/bionlp-emotion';

async function initModel() {
  if (classifier) return classifier;
  if (isInitializing) return null;

  isInitializing = true;
  self.postMessage({ status: 'LOADING', message: 'Loading clinical emotion model...' });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    classifier = (await pipeline('text-classification', MODEL_NAME)) as any;
    self.postMessage({ status: 'READY', message: 'Offline AI Ready' });
    return classifier;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ status: 'ERROR', error: message });
    return null;
  } finally {
    isInitializing = false;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, text } = e.data;

  if (type === 'INIT') {
    await initModel();
  }

  if (type === 'CLASSIFY') {
    try {
      if (!classifier) {
        await initModel();
      }

      if (!classifier) {
        throw new Error('Classifier failed to initialize.');
      }

      const results = await classifier(text);
      const topResult = results[0];

      const label = (topResult?.label || '').toLowerCase();
      const confidence = Math.round((topResult?.score || 0) * 100);

      const highDistressLabels = ['fear', 'sadness', 'anger', 'disgust'];
      const isDistressed = highDistressLabels.includes(label);

      self.postMessage({
        status: 'COMPLETE',
        result: {
          isDistressed,
          confidence,
          detectedEmotion: label,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      self.postMessage({ status: 'ERROR', error: message });
    }
  }
};